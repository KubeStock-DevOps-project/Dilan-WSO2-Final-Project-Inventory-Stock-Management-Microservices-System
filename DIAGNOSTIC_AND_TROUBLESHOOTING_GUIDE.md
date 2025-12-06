# Istio + Asgardeo Diagnostic & Troubleshooting Guide

## Quick Diagnostic Commands

### Health Check Script (Run This First)

```bash
#!/bin/bash
set -e

echo "🔍 KUBESTOCK ISTIO HEALTH CHECK"
echo "==============================="

# Function to check command availability
check_cmd() {
  if ! command -v $1 &> /dev/null; then
    echo "⚠️  $1 not found (install to enable this check)"
    return 1
  fi
  return 0
}

# Prerequisites
check_cmd kubectl || exit 1
check_cmd istioctl || echo "⚠️  istioctl not installed (non-critical)"

# Cluster info
echo ""
echo "📊 CLUSTER STATUS"
echo "=================="
echo "Nodes: $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | wc -l)"
echo "Ready nodes: $(kubectl get nodes -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o True | wc -l)"

# Istio info
echo ""
echo "📊 ISTIO STATUS"
echo "==============="
ISTIOD_RUNNING=$(kubectl get pods -n istio-system -l app=istiod --no-headers 2>/dev/null | wc -l)
echo "Istiod pods: $ISTIOD_RUNNING"
[ "$ISTIOD_RUNNING" -gt 0 ] && echo "✓ Control plane running" || echo "✗ Control plane not running"

SIDECAR_INJECT=$(kubectl get namespace kubestock-staging --no-headers 2>/dev/null | awk '{print $1}')
echo "Sidecar injection label: $(kubectl get ns kubestock-staging -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null || echo 'not set')"

# Services
echo ""
echo "📊 KUBESTOCK SERVICES"
echo "====================="
kubectl get pods -n kubestock-staging --no-headers 2>/dev/null | while read pod rest; do
  PHASE=$(kubectl get pod $pod -n kubestock-staging -o jsonpath='{.status.phase}')
  READY=$(kubectl get pod $pod -n kubestock-staging -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  echo "$pod: $PHASE ($READY)"
done

# mTLS
echo ""
echo "📊 MTLS STATUS"
echo "==============="
MTLS_MODE=$(kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}' 2>/dev/null)
echo "Global mTLS: $MTLS_MODE"
[ "$MTLS_MODE" = "STRICT" ] && echo "✓ STRICT mTLS enabled" || echo "✗ mTLS not STRICT"

# Asgardeo
echo ""
echo "📊 ASGARDEO STATUS"
echo "==================="
ASGARDEO_SECRET=$(kubectl get secret asgardeo-secret -n kubestock-staging 2>/dev/null | wc -l)
echo "Asgardeo secret: $([ $ASGARDEO_SECRET -gt 0 ] && echo 'Found' || echo 'Missing')"

# Quick errors
echo ""
echo "📊 ERROR CHECK"
echo "==============="
ERROR_COUNT=$(kubectl logs -n kubestock-staging --tail=50 --all-containers=true 2>/dev/null | grep -i "error\|exception" | wc -l)
echo "Errors in last 50 logs: $ERROR_COUNT"

echo ""
echo "✅ Health check complete!"
```

---

## Diagnostic Procedures by Component

### 1. CLUSTER DIAGNOSTICS

```bash
# Check overall cluster status
kubectl get componentstatus

# Check API server logs
kubectl logs -n kube-system -l component=kube-apiserver --tail=50

# Check kubelet logs (varies by system)
# On Linux: journalctl -u kubelet -n 50

# Check node capacity
kubectl describe nodes | grep -A5 "Capacity\|Allocatable"

# Check cluster events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20
```

### 2. ISTIO CONTROL PLANE DIAGNOSTICS

```bash
# Verify istiod is running
kubectl get pod -n istio-system -l app=istiod -o wide

# Check istiod logs
kubectl logs -n istio-system -l app=istiod --tail=100

# Check istiod resources
kubectl top pod -n istio-system -l app=istiod

# Verify sidecar injector webhook
kubectl get mutatingwebhookconfigurations | grep istio

# Check webhook status
kubectl get mwc istio-sidecar-injector -n istio-system -o yaml | grep -A5 "status\|failurePolicy"

# Verify CRDs
kubectl api-resources | grep istio.io

# Check Istio configuration validation
kubectl get validatingwebhookconfigurations | grep istio
```

### 3. SIDECAR INJECTION DIAGNOSTICS

```bash
# Check namespace labels
kubectl describe namespace kubestock-staging | grep Labels

# Verify injection label is set
kubectl get ns kubestock-staging -o jsonpath='{.metadata.labels.istio-injection}'
# Expected: enabled

# Check if pod has sidecars (after deployment)
kubectl get pods -n kubestock-staging -o json | \
  jq '.items[] | {name: .metadata.name, containers: [.spec.containers[].name]}'

# Debug injection issue (for a new pod)
kubectl create namespace test-injection
kubectl label namespace test-injection istio-injection=enabled

# Deploy test pod
kubectl run test --image=nginx -n test-injection

# Check if sidecar was injected
kubectl get pod test -n test-injection -o jsonpath='{.spec.containers[*].name}'
# Expected: nginx istio-proxy

# If not injected, check webhook
kubectl get mutatingwebhookconfigurations -o wide | grep istio-sidecar-injector

# Check webhook logs
kubectl logs -n istio-system -l app=sidecar-injector --tail=50

# Clean up
kubectl delete namespace test-injection
```

### 4. MTLS DIAGNOSTICS

```bash
# Verify PeerAuthentication policy
kubectl get peerauthentication -A

# Check STRICT mode
kubectl get peerauthentication default -n istio-system -o yaml

# Check DestinationRules for mTLS
kubectl get destinationrules -n kubestock-staging -o wide

# Detailed check of each DR
for dr in $(kubectl get dr -n kubestock-staging -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $dr ==="
  kubectl get dr $dr -n kubestock-staging -o jsonpath='{.spec.trafficPolicy.tls.mode}'
  echo ""
done

# Check certificate authority
kubectl get secret -n istio-system | grep istio-ca

# Verify istiod is issuing certificates
kubectl logs -n istio-system -l app=istiod | grep -i "certificate\|ca" | tail -10

# Test mTLS enforcement (should fail without sidecar)
kubectl run test-nomtls --image=curlimages/curl -n default -- sleep 1000
# This will have NO sidecar since default namespace has no istio-injection label

# From test-nomtls, try to reach service with mTLS
kubectl exec -it test-nomtls -- curl https://ms-identity.kubestock-staging.svc.cluster.local:3006/health
# Expected: Connection refused or certificate verification failed (mTLS enforced)

# From pod WITH sidecar, should work
kubectl exec -it test-mtls -n kubestock-staging -- curl http://ms-identity:3006/health
# Expected: 200 OK (sidecar handles mTLS)

# Clean up
kubectl delete pod test-nomtls -n default
```

### 5. SERVICE DISCOVERY DIAGNOSTICS

```bash
# Check service DNS names
kubectl get svc -n kubestock-staging

# Verify CoreDNS is working
kubectl exec test-mtls -n kubestock-staging -- nslookup kubernetes.default
# Expected: Resolves

# Test internal DNS
kubectl exec test-mtls -n kubestock-staging -- nslookup ms-identity
# Expected: 10.x.x.x (ClusterIP)

# Test FQDN
kubectl exec test-mtls -n kubestock-staging -- nslookup ms-identity.kubestock-staging.svc.cluster.local
# Expected: Same IP as above

# Test external DNS (if applicable)
kubectl exec test-mtls -n kubestock-staging -- nslookup api.asgardeo.io
# Expected: Resolves to public IP

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Verify DNS policy in pods
kubectl get pod <pod-name> -n kubestock-staging -o jsonpath='{.spec.dnsPolicy}'
```

### 6. SERVICE-TO-SERVICE COMMUNICATION DIAGNOSTICS

```bash
# Check network policies (if any)
kubectl get networkpolicies -n kubestock-staging
# If policies exist, ensure they allow communication

# Test connectivity from pod to service
kubectl exec test-mtls -n kubestock-staging -- curl -v http://ms-identity:3006/health
# Look for: HTTP/1.1 200 OK

# Test with verbose output
kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-identity:3006/health 2>&1 | head -30

# Test all services
for service in ms-identity ms-inventory ms-product ms-supplier ms-order-management frontend; do
  echo "Testing $service..."
  kubectl exec test-mtls -n kubestock-staging -- \
    curl -s http://$service:3006/health > /dev/null && echo "✓ $service OK" || echo "✗ $service FAILED"
done

# Check port accessibility
kubectl exec test-mtls -n kubestock-staging -- nc -zv ms-identity 3006
# Expected: Connection successful

# Check if service has endpoints
kubectl get endpoints -n kubestock-staging
# Expected: All services have IP:port listed

# Check service spec
kubectl describe svc ms-identity -n kubestock-staging | grep -A5 "Endpoints"
```

### 7. POD DIAGNOSTICS

```bash
# Get detailed pod info
kubectl describe pod <pod-name> -n kubestock-staging

# Check pod logs (app container)
kubectl logs <pod-name> -n kubestock-staging -c <app-name> --tail=100

# Check sidecar logs
kubectl logs <pod-name> -n kubestock-staging -c istio-proxy --tail=100

# Stream logs in real-time
kubectl logs -f <pod-name> -n kubestock-staging -c <app-name>

# Check previous logs (if pod crashed)
kubectl logs <pod-name> -n kubestock-staging -c <app-name> --previous

# Get pod events
kubectl get events -n kubestock-staging --field-selector involvedObject.name=<pod-name>

# Check pod resource usage
kubectl top pod <pod-name> -n kubestock-staging --containers

# Check resource requests vs usage
kubectl describe pod <pod-name> -n kubestock-staging | grep -A5 "Requests\|Limits"

# Enter pod (if it has bash)
kubectl exec -it <pod-name> -n kubestock-staging -c <app-name> -- /bin/bash

# Check pod IP
kubectl get pod <pod-name> -n kubestock-staging -o jsonpath='{.status.podIP}'

# List all containers in pod
kubectl get pod <pod-name> -n kubestock-staging -o jsonpath='{.spec.containers[*].name}'
```

### 8. SIDECAR PROXY DIAGNOSTICS

```bash
# Check sidecar version
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- envoy --version

# Access sidecar admin interface
# Port 15000 is localhost only, so need port-forward
kubectl port-forward <pod-name> 15000:15000 -n kubestock-staging &
sleep 2

# Check sidecar stats
curl http://localhost:15000/stats | head -30

# Check active connections
curl http://localhost:15000/stats | grep "upstream_cx\|downstream_cx"

# Check cluster configuration
curl http://localhost:15000/clusters | head -50

# Check routes configuration
curl http://localhost:15000/config_dump | jq '.configs[] | select(.config_type=="routes")'

# Check listeners
curl http://localhost:15000/listeners

# Kill port-forward
pkill -f "port-forward"

# Check sidecar readiness
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- curl -s localhost:15000/ready
# Expected: empty response (200 OK)

# Check sidecar is handling traffic
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "downstream_rq|upstream_rq"
```

### 9. ASGARDEO DIAGNOSTICS

```bash
# Check secret exists
kubectl get secret asgardeo-secret -n kubestock-staging -o yaml

# Decode and check each key
for key in ASGARDEO_ORG_NAME ASGARDEO_BASE_URL ASGARDEO_CLIENT_ID; do
  echo "$key: $(kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath="{.data.$key}" | base64 -d)"
done

# Check ms-identity pod has secret mounted
kubectl describe pod <ms-identity-pod> -n kubestock-staging | grep -A10 "Mounts:"

# Check environment variables in pod
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- env | grep ASGARDEO

# Test Asgardeo API connectivity
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.asgardeo.io/health
# Expected: 200 or 404 (means it's reachable)

# Check JWKS endpoint
ORG_NAME=$(kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath='{.data.ASGARDEO_ORG_NAME}' | base64 -d)
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s https://api.asgardeo.io/t/$ORG_NAME/oauth2/jwks | jq '.keys | length'
# Expected: > 0

# Test M2M client credentials
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s -X POST https://api.asgardeo.io/t/$ORG_NAME/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=CLIENT_ID&client_secret=CLIENT_SECRET" | jq -r '.access_token'

# Check ms-identity logs for Asgardeo errors
kubectl logs <ms-identity-pod> -n kubestock-staging -c ms-identity | grep -i "asgardeo\|oauth\|jwks\|error"

# Check certificate validity for Asgardeo endpoint
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  openssl s_client -connect api.asgardeo.io:443 -showcerts < /dev/null 2>&1 | \
  grep -E "subject=|issuer=|Verify return code"
```

### 10. NETWORK DIAGNOSTICS

```bash
# Check for network policies
kubectl get networkpolicies -A

# Check ingress configuration
kubectl get ingress -A

# Check service ports
kubectl get svc -n kubestock-staging -o wide

# Check if ports are listening (from pod)
kubectl exec test-mtls -n kubestock-staging -- netstat -tlnp | grep LISTEN

# Test DNS from pod
kubectl exec test-mtls -n kubestock-staging -- cat /etc/resolv.conf

# Check container network interface
kubectl exec test-mtls -n kubestock-staging -- ip addr show

# Test with different tools
# Using wget
kubectl exec test-mtls -n kubestock-staging -- wget -O- http://ms-identity:3006/health

# Using nc (netcat)
kubectl exec test-mtls -n kubestock-staging -- nc -zv ms-identity 3006

# Check routing table (if accessible)
kubectl exec test-mtls -n kubestock-staging -- ip route show
```

---

## Common Issues & Solutions

### Issue 1: Sidecars Not Injecting

**Symptoms:**

```
kubectl get pods -n kubestock-staging -o jsonpath='{.spec.containers[*].name}'
# Shows only app container, no istio-proxy
```

**Diagnosis:**

```bash
# Check namespace label
kubectl get ns kubestock-staging -o jsonpath='{.metadata.labels.istio-injection}'
# Expected: enabled

# Check webhook
kubectl get mutatingwebhookconfigurations | grep istio

# Check webhook status
kubectl describe mwc istio-sidecar-injector -n istio-system
```

**Solutions:**

```bash
# Add label if missing
kubectl label namespace kubestock-staging istio-injection=enabled --overwrite

# Restart pods to trigger injection
kubectl delete pod -n kubestock-staging -l app=ms-identity
kubectl wait --for=condition=Ready pod -l app=ms-identity -n kubestock-staging --timeout=60s

# Restart webhook if not working
kubectl rollout restart deploy -n istio-system sidecar-injector
```

---

### Issue 2: mTLS Connection Errors

**Symptoms:**

```
Connection refused
SSL_ERROR_BAD_CERT
certificate verification failed
```

**Diagnosis:**

```bash
# Check PeerAuthentication mode
kubectl get peerauthentication -A -o yaml | grep -A2 "spec:"

# Check DestinationRules
kubectl get destinationrules -n kubestock-staging -o yaml | grep -A2 "tls:"

# Check certificate authority
kubectl get secret -n istio-system | grep istio-ca
```

**Solutions:**

```bash
# Ensure STRICT mode is set
kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}'

# Wait for istiod to issue certs
kubectl logs -n istio-system -l app=istiod | grep -i "issuing\|certificate"

# Try from pod WITH sidecar
kubectl exec test-mtls -n kubestock-staging -- curl http://ms-identity:3006/health
```

---

### Issue 3: Pods Stuck in Pending

**Symptoms:**

```
kubectl get pods -n kubestock-staging
# Pod shows Pending, not Running
```

**Diagnosis:**

```bash
# Check pod events
kubectl describe pod <pod-name> -n kubestock-staging | tail -20

# Check resource availability
kubectl top nodes

# Check image availability
kubectl logs <pod-name> -n kubestock-staging | head -30
```

**Solutions:**

```bash
# Ensure nodes have capacity
kubectl get nodes -o wide

# Check image pull secrets
kubectl describe sa default -n kubestock-staging

# Pull image manually if needed
docker pull <image-registry>/<image-name>:<tag>

# Check resource requests
kubectl get pod <pod-name> -n kubestock-staging -o yaml | grep -A5 "requests:"
```

---

### Issue 4: Service Discovery Failing

**Symptoms:**

```
nslookup: can't resolve 'ms-identity'
connection to ms-identity failed
```

**Diagnosis:**

```bash
# Test DNS from pod
kubectl exec test-mtls -n kubestock-staging -- nslookup ms-identity

# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check service exists
kubectl get svc ms-identity -n kubestock-staging
```

**Solutions:**

```bash
# Verify service endpoints
kubectl get endpoints ms-identity -n kubestock-staging

# Restart CoreDNS if needed
kubectl rollout restart deploy -n kube-system coredns

# Check if pod can reach other pods
kubectl exec test-mtls -n kubestock-staging -- ping <pod-ip>
```

---

### Issue 5: Asgardeo Token Validation Failing

**Symptoms:**

```
401 Unauthorized
Invalid token
JWKS fetch failed
```

**Diagnosis:**

```bash
# Check Asgardeo connectivity
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s https://api.asgardeo.io/t/$ORG_NAME/oauth2/jwks | head -10

# Check ms-identity logs
kubectl logs <ms-identity-pod> -n kubestock-staging -c ms-identity | grep -i "jwks\|token\|error"

# Verify credentials
kubectl get secret asgardeo-secret -n kubestock-staging -o yaml
```

**Solutions:**

```bash
# Recreate secret with correct values
kubectl delete secret asgardeo-secret -n kubestock-staging
kubectl create secret generic asgardeo-secret \
  --from-literal=ASGARDEO_ORG_NAME=<org> \
  --from-literal=ASGARDEO_BASE_URL=<url> \
  ... \
  -n kubestock-staging

# Restart ms-identity
kubectl rollout restart deploy ms-identity -n kubestock-staging

# Test token with curl
TOKEN="<valid-token>"
kubectl exec test-mtls -n kubestock-staging -- \
  curl -H "Authorization: Bearer $TOKEN" http://ms-identity:3006/validate
```

---

### Issue 6: High Memory Usage

**Symptoms:**

```
Pod using 300MB+ memory
kubectl top pod shows high memory
```

**Diagnosis:**

```bash
# Check container vs sidecar memory
kubectl top pod <pod-name> -n kubestock-staging --containers

# Check memory requests vs usage
kubectl get pod <pod-name> -n kubestock-staging -o yaml | grep -A10 "resources:"
```

**Solutions:**

```bash
# Increase memory limits if needed
kubectl set resources deployment ms-identity -n kubestock-staging -c ms-identity --limits=memory=512Mi

# Check for memory leaks in app logs
kubectl logs <pod-name> -n kubestock-staging -c <app> | grep -i "memory\|gc"

# Restart pod
kubectl delete pod <pod-name> -n kubestock-staging
```

---

## Debug Commands Reference

```bash
# One-liner diagnostics

# Check all pod statuses
kubectl get pods -A --field-selector=status.phase!=Running

# Find pods with errors
kubectl logs -n kubestock-staging --all-containers=true | grep -i error

# Check all service endpoints
kubectl get endpoints -A

# Find pods without sidecars
kubectl get pods -n kubestock-staging -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy

# Check resource quotas
kubectl describe resourcequota -n kubestock-staging

# Find pods using most CPU
kubectl top pods -A --sort-by=cpu | head -20

# Find pods using most memory
kubectl top pods -A --sort-by=memory | head -20

# Check recent events
kubectl get events -A --sort-by='.lastTimestamp' | tail -50

# Check network policies blocking traffic
kubectl get networkpolicy -A -o yaml | grep -A5 "podSelector"

# Check PVC status
kubectl get pvc -A | grep -v Bound

# Check node disk pressure
kubectl top nodes
kubectl describe nodes | grep -i "disk\|pressure"
```

---

## Monitoring & Observability

### Kiali Dashboard

```bash
# Port-forward to Kiali
kubectl port-forward -n istio-system svc/kiali 20000:20000 &

# Access in browser
# http://localhost:20000/kiali

# Check service mesh traffic
# - Graph view shows services and traffic
# - Workloads tab shows pods and their status
# - Services tab shows service metrics
```

### Prometheus Metrics

```bash
# Port-forward to Prometheus
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &

# Query examples
# Total requests: rate(istio_requests_total[5m])
# Request latency: histogram_quantile(0.95, rate(istio_request_duration_milliseconds_bucket[5m]))
# Error rate: rate(istio_requests_total{response_code="5xx"}[5m])
```

### Jaeger Tracing

```bash
# Port-forward to Jaeger
kubectl port-forward -n istio-system svc/jaeger-collector 16686:16686 &

# Access in browser
# http://localhost:16686

# Search for traces
# - Select service: ms-identity
# - Look for latency, errors, span details
```

---

## Performance Baseline

These are typical values when working correctly:

| Metric              | Expected Range | Alert Threshold |
| ------------------- | -------------- | --------------- |
| Pod startup time    | 15-30 seconds  | > 60 seconds    |
| Memory per pod      | 150-300 MB     | > 500 MB        |
| CPU per pod         | 50-200 mCPU    | > 1000 mCPU     |
| Service latency     | < 100ms        | > 500ms         |
| mTLS handshake      | < 10ms         | > 50ms          |
| Sidecar CPU         | 10-50 mCPU     | > 200 mCPU      |
| Certificate renewal | Automatic      | Failed renew    |

---

**Last Updated:** Comprehensive diagnostic suite ready for production use!
