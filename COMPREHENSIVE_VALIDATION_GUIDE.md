# Complete Validation & Testing Guide for Istio + Asgardeo Integration

## Overview

This guide provides comprehensive validation procedures to verify that Istio, Asgardeo, and all microservices are working seamlessly with zero errors or incompatibilities.

---

## Phase 1: Pre-Deployment Validation (Before Installing Istio)

### 1.1 Verify Kubernetes Cluster Health

```bash
# Check cluster info
kubectl cluster-info
# Expected: Kubernetes master running

# Check nodes
kubectl get nodes
# Expected: All nodes in Ready state

# Check node resources
kubectl top nodes
# Expected: Sufficient memory and CPU available

# Check default services
kubectl get svc -n default
# Expected: kubernetes service running

# Verify cluster DNS
kubectl run test-dns --image=busybox --rm -it -- nslookup kubernetes.default
# Expected: Resolves successfully
```

### 1.2 Verify Current Deployment Works

```bash
# Check existing namespaces
kubectl get namespaces
# Expected: default, kube-system, kube-public

# If kubestock-staging exists, check it
kubectl get namespace kubestock-staging
# Expected: Either exists or can be created

# Check any existing Asgardeo secrets
kubectl get secrets -n kubestock-staging 2>/dev/null || echo "Namespace doesn't exist yet"
# Expected: asgardeo-secret configured

# Verify Docker images are accessible
docker pull 478468757808.dkr.ecr.ap-south-1.amazonaws.com/ms-identity:latest
# Expected: Image pulls successfully (or fails gracefully)
```

### 1.3 Validate Istio Readiness

```bash
# Verify no existing Istio installation
kubectl get namespaces | grep istio
# Expected: No istio-system or istio-ingress namespaces

# Check if istioctl is available
istioctl version 2>/dev/null || echo "istioctl not installed yet"
# Expected: Not installed (will be installed by script)

# Verify CRDs not installed
kubectl get crds | grep istio
# Expected: No Istio CRDs present
```

---

## Phase 2: Installation Validation

### 2.1 Validate Installation Script

```bash
# Check script exists and is executable
ls -lh infrastructure/install-istio.sh
# Expected: -rwxr-xr-x (executable)

# Verify script syntax
bash -n infrastructure/install-istio.sh
# Expected: No syntax errors

# Check script contains key components
grep -E "install-istio|profile|verify" infrastructure/install-istio.sh | head -10
# Expected: Script references istio installation
```

### 2.2 Run Installation with Validation

```bash
# Step 1: Make executable
chmod +x infrastructure/install-istio.sh

# Step 2: Run installation (choose one)
# Option A: Demo profile (with observability)
./infrastructure/install-istio.sh demo

# Option B: Production profile (lightweight)
./infrastructure/install-istio.sh production

# During installation, watch for:
# ✓ Istio downloaded successfully
# ✓ Istio installed with [profile] profile
# ✓ Waiting for Istio control plane
# ✓ Sidecar injection enabled
# ✓ Installation verification complete
```

### 2.3 Immediate Post-Installation Checks

```bash
# Check Istio system namespace created
kubectl get namespace istio-system
# Expected: Active namespace

# List all Istio system pods
kubectl get pods -n istio-system
# Expected: istiod, sidecar-injector, and observability pods (if demo)

# Check specific critical pods
kubectl get pod -n istio-system -l app=istiod
# Expected: istiod pod in Running state

# Wait for control plane readiness
kubectl wait --for=condition=Ready pod -l app=istiod -n istio-system --timeout=300s
# Expected: Condition met

# Verify Istio CRDs installed
kubectl get crds | grep istio.io | wc -l
# Expected: ~50 CRDs installed

# Check specific CRDs
kubectl get crds | grep -E "virtualservice|destinationrule|peerauthentication"
# Expected: All three present
```

---

## Phase 3: Configuration Deployment Validation

### 3.1 Validate Configuration Files Before Deployment

```bash
# Check kustomization files syntax
kubectl kustomize gitops/base --dry-run=client > /dev/null
# Expected: No errors

# Check specific namespace kustomization
kubectl kustomize gitops/base/namespaces --dry-run=client > /dev/null
# Expected: No errors

# Validate istio configuration
kubectl kustomize gitops/base/istio --dry-run=client > /dev/null
# Expected: No errors

# Validate service configurations
for service in ms-identity ms-inventory ms-product ms-supplier ms-order-management frontend; do
  kubectl kustomize gitops/base/services/$service --dry-run=client > /dev/null && \
  echo "✓ $service kustomization valid" || echo "✗ $service failed"
done
# Expected: All services validated

# Check overlay kustomization
kubectl kustomize gitops/overlays/staging --dry-run=client > /dev/null
# Expected: No errors

# Preview what will be deployed (sample only)
kubectl kustomize gitops/base/istio --dry-run=client
# Expected: Shows PeerAuthentication and other Istio resources
```

### 3.2 Deploy Base Configuration

```bash
# Apply base configuration
kubectl apply -k gitops/base/

# Watch for completion
kubectl get pods -n kubestock-staging -w
# Expected: Pods transitioning to Running state

# Verify namespace creation
kubectl get namespace kubestock-staging
# Expected: Phase = Active

# Check namespace labels
kubectl describe namespace kubestock-staging
# Expected: Label istio-injection=enabled present

# Verify resource quotas applied
kubectl get resourcequota -n kubestock-staging
# Expected: staging-quota with limits

# Check limit ranges
kubectl get limitrange -n kubestock-staging
# Expected: staging-limits configured
```

### 3.3 Deploy Staging Overlay

```bash
# Apply staging overlay
kubectl apply -k gitops/overlays/staging/

# Watch deployment progress
kubectl get pods -n kubestock-staging -w
# Expected: All pods reach Running state (2-3 minutes)

# Wait for all pods ready
kubectl wait --for=condition=Ready pod --all -n kubestock-staging --timeout=300s
# Expected: All conditions met

# List all deployed services
kubectl get svc -n kubestock-staging
# Expected: 6 services (frontend, ms-identity, ms-inventory, ms-product, ms-supplier, ms-order-management)

# List all deployments
kubectl get deploy -n kubestock-staging
# Expected: 6 deployments

# Check pods are running
kubectl get pods -n kubestock-staging
# Expected: All pods in Running state
```

---

## Phase 4: Sidecar Injection Validation

### 4.1 Verify Automatic Sidecar Injection

```bash
# Get pod names
PODS=$(kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].metadata.name}')

# Check each pod has sidecar
for POD in $PODS; do
  CONTAINERS=$(kubectl get pod $POD -n kubestock-staging -o jsonpath='{.spec.containers[*].name}')
  if echo $CONTAINERS | grep -q "istio-proxy"; then
    echo "✓ $POD has istio-proxy"
  else
    echo "✗ $POD MISSING istio-proxy"
  fi
done
# Expected: All pods have istio-proxy

# Count total containers (should be 2 per pod: app + sidecar)
kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].spec.containers[*].name}' | tr ' ' '\n' | sort | uniq -c
# Expected: Each app appears once, istio-proxy appears 6 times

# Verify sidecar status in pod description
kubectl describe pod <pod-name> -n kubestock-staging | grep -A5 "Containers:"
# Expected: Both app container and istio-proxy listed

# Check sidecar logs for errors
kubectl logs <pod-name> -n kubestock-staging -c istio-proxy | head -20
# Expected: No error messages, shows Envoy startup logs
```

### 4.2 Verify Sidecar Configuration

```bash
# Get sidecar version
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- envoy --version
# Expected: Shows Envoy version (e.g., envoy 1.27.0)

# Check sidecar is listening on standard ports
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  netstat -tlnp | grep -E "15000|15001|15006"
# Expected: Ports 15000 (admin), 15001 (outbound), 15006 (inbound)

# Verify sidecar can reach Kubernetes API
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s http://localhost:15000/stats | grep upstream_cx | head -3
# Expected: Statistics showing active connections
```

---

## Phase 5: mTLS Validation

### 5.1 Verify mTLS is Enforced

```bash
# Check PeerAuthentication policy exists
kubectl get peerauthentication -n istio-system
# Expected: default policy listed

# Verify STRICT mode is configured
kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}'
# Expected: STRICT

# Check DestinationRules exist for all services
kubectl get destinationrules -n kubestock-staging
# Expected: 6 DestinationRules (one per service)

# Verify ISTIO_MUTUAL mode in each DestinationRule
for service in ms-identity ms-inventory ms-product ms-supplier ms-order-management frontend; do
  MODE=$(kubectl get dr ${service}-destination -n kubestock-staging -o jsonpath='{.spec.trafficPolicy.tls.mode}' 2>/dev/null)
  echo "$service: $MODE"
done
# Expected: All show ISTIO_MUTUAL
```

### 5.2 Verify Certificate Configuration

```bash
# Check if istiod is managing certificates
kubectl get pods -n istio-system -l app=istiod
# Expected: istiod pod running

# Verify certificate authority
kubectl get secret -n istio-system | grep istio-ca
# Expected: istio-ca-secret exists

# Check pod certificates (from sidecar perspective)
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s http://localhost:15000/config_dump | grep -o '"subject":"[^"]*"' | head -3
# Expected: Shows certificate subject info

# Verify certificate validity
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  openssl s_client -connect ms-identity:3006 -showcerts
# Expected: Certificate chain shown, no certificate errors
```

### 5.3 Verify mTLS in Action

```bash
# Deploy test pod to check mTLS
kubectl run test-mtls --image=curlimages/curl -n kubestock-staging -- sleep 1000
kubectl wait --for=condition=Ready pod/test-mtls -n kubestock-staging --timeout=60s

# Test HTTP call (should work - sidecars upgrade to mTLS)
kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-identity:3006/health 2>&1 | grep -E "Connected|CONNECT|SSL|TLS|200"
# Expected: Connection successful, may show SSL/TLS upgrade

# Check sidecar stats for mTLS connections
kubectl exec <ms-identity-pod> -n kubestock-staging -c istio-proxy -- \
  curl -s http://localhost:15000/stats | grep -E "ssl_connections|upstream_ssl"
# Expected: Shows active mTLS connections

# Verify all service-to-service connections are encrypted
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s http://localhost:15000/config_dump | grep -i "tls" | head -10
# Expected: TLS configuration present
```

---

## Phase 6: Asgardeo Integration Validation

### 6.1 Verify Asgardeo Configuration

```bash
# Check if secret exists
kubectl get secret -n kubestock-staging | grep asgardeo
# Expected: asgardeo-secret listed

# Verify secret has all required keys
kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath='{.data}' | jq 'keys'
# Expected: All Asgardeo keys present (ORG_NAME, BASE_URL, M2M_CLIENT_ID, etc.)

# Check secret values (base64)
kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath='{.data.ASGARDEO_ORG_NAME}' | base64 -d
# Expected: Shows organization name

# Verify ms-identity pod has environment variables
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- env | grep ASGARDEO
# Expected: Shows all ASGARDEO_* environment variables

# Check ms-identity can decode environment variables
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- env | grep -E "ASGARDEO_(ORG_NAME|BASE_URL)"
# Expected: Both show actual values (not base64)
```

### 6.2 Verify Token Validation Setup

```bash
# Check ms-identity has JWKS endpoint accessible
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s https://api.asgardeo.io/t/$(kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath='{.data.ASGARDEO_ORG_NAME}' | base64 -d)/oauth2/jwks | jq '.keys | length'
# Expected: Shows number of keys (> 0)

# Verify ms-identity startup logs don't show auth errors
kubectl logs <ms-identity-pod> -n kubestock-staging -c ms-identity | grep -i "asgardeo\|error\|failed" | head -5
# Expected: No critical errors related to Asgardeo

# Check if ms-identity is listening on port 3006
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  netstat -tlnp | grep 3006
# Expected: Shows listening on port 3006
```

### 6.3 Test Token Validation

```bash
# Get a valid Asgardeo token (manual process):
# 1. Access frontend login page
# 2. Login through Asgardeo
# 3. Get token from browser localStorage: get localStorage.getItem('__wso2_instance_state')

# Or use curl to get M2M token
M2M_TOKEN=$(kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${ASGARDEO_CLIENT_ID}&client_secret=${ASGARDEO_CLIENT_SECRET}" \
  https://api.asgardeo.io/t/$(echo $ASGARDEO_ORG_NAME | base64 -d)/oauth2/token | jq -r '.access_token')

# Test token with ms-identity
kubectl exec test-mtls -n kubestock-staging -- \
  curl -H "Authorization: Bearer $M2M_TOKEN" \
  http://ms-identity:3006/validate
# Expected: Returns 200 with token validation result
```

---

## Phase 7: Service-to-Service Communication Validation

### 7.1 Verify Service Discovery

```bash
# Test DNS resolution from test pod
kubectl exec test-mtls -n kubestock-staging -- \
  nslookup ms-identity
# Expected: Resolves to ClusterIP

# Test with FQDN
kubectl exec test-mtls -n kubestock-staging -- \
  nslookup ms-identity.kubestock-staging.svc.cluster.local
# Expected: Resolves successfully

# Test all services resolve
for service in ms-identity ms-inventory ms-product ms-supplier ms-order-management; do
  kubectl exec test-mtls -n kubestock-staging -- \
    nslookup $service > /dev/null && echo "✓ $service resolves" || echo "✗ $service failed"
done
# Expected: All resolve successfully
```

### 7.2 Verify Service Connectivity

```bash
# Test HTTP connectivity to each service
kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-identity:3006/health

kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-inventory:3001/health

kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-product:3003/health

# Expected: All return HTTP 200 or appropriate status

# Verify connections are encrypted (mTLS)
kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-identity:3006/health 2>&1 | grep -i "SSL\|TLS\|certificate"

# Expected: Shows SSL/TLS connection information
```

### 7.3 Verify VirtualService Routing

```bash
# Check VirtualServices exist
kubectl get virtualservices -n kubestock-staging
# Expected: 6 VirtualServices (one per service)

# Verify routing rules
kubectl get vs ms-identity -n kubestock-staging -o yaml | grep -A10 "http:"
# Expected: Shows HTTP routing with retries and timeout

# Verify retry configuration
kubectl get vs ms-identity -n kubestock-staging -o jsonpath='{.spec.http[0].retries.attempts}'
# Expected: 3

# Verify timeout configuration
kubectl get vs ms-identity -n kubestock-staging -o jsonpath='{.spec.http[0].timeout}'
# Expected: 30s
```

---

## Phase 8: Service Health Validation

### 8.1 Verify Health Checks

```bash
# Check readiness probes
kubectl get deploy -n kubestock-staging -o jsonpath='{.items[*].spec.template.spec.containers[*].readinessProbe}' | jq . | head -20
# Expected: Shows readiness probe configuration

# Test health endpoints directly
for port in 3006 3001 3003 3004 3002 3000; do
  kubectl exec test-mtls -n kubestock-staging -- \
    curl -s http://localhost:$port/health 2>/dev/null && echo "✓ Port $port responds" || true
done
# Expected: Health endpoints respond

# Check pod status
kubectl get pods -n kubestock-staging
# Expected: All in Running state, Ready 2/2 (app + sidecar)
```

### 8.2 Verify Deployment Status

```bash
# Check deployment status
kubectl get deploy -n kubestock-staging
# Expected: All READY 1/1

# Check for any pod errors
kubectl get pods -n kubestock-staging -o wide
# Expected: No CrashLoopBackOff or Error states

# Check recent events
kubectl get events -n kubestock-staging --sort-by='.lastTimestamp' | tail -20
# Expected: No warning or error events
```

---

## Phase 9: Observability Validation (Demo Profile)

### 9.1 Verify Observability Stack

```bash
# Check Kiali is running (demo profile)
kubectl get pods -n istio-system -l app=kiali
# Expected: Kiali pod in Running state

# Check Jaeger is running
kubectl get pods -n istio-system | grep jaeger
# Expected: Jaeger pods running

# Check Prometheus is running
kubectl get pods -n istio-system | grep prometheus
# Expected: Prometheus pod running

# Test Kiali access
kubectl port-forward -n istio-system svc/kiali 20000:20000 &
sleep 2
curl -s http://localhost:20000/kiali/api/namespaces | jq '.[] | .name'
# Expected: List of namespaces including kubestock-staging

# Test Prometheus access
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
sleep 2
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result | length'
# Expected: Shows number of metrics

# Test Jaeger access
kubectl port-forward -n istio-system svc/jaeger-collector 16686:16686 &
sleep 2
curl -s 'http://localhost:16686/api/traces?service=ms-identity' | jq '.data | length'
# Expected: May show traces if requests were made
```

### 9.2 Verify Metrics Collection

```bash
# Check if Istio is collecting metrics
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "requests_total|request_time" | head -5
# Expected: Shows Istio metrics

# Verify metric types
kubectl exec <pod-name> -n kubestock-staging -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -o '^[^:]*' | sort -u | head -10
# Expected: Shows metric names
```

---

## Phase 10: Error & Incompatibility Checks

### 10.1 Check for Common Issues

```bash
# Check for pod crashes
kubectl get pods -n kubestock-staging --field-selector=status.phase=Failed
# Expected: No failed pods

# Check for pending pods
kubectl get pods -n kubestock-staging --field-selector=status.phase=Pending
# Expected: No pending pods (if all started)

# Check pod logs for errors
for pod in $(kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].metadata.name}'); do
  ERRORS=$(kubectl logs $pod -n kubestock-staging -c $(kubectl get pod $pod -n kubestock-staging -o jsonpath='{.spec.containers[0].name}') 2>/dev/null | grep -i "error\|exception" | wc -l)
  if [ $ERRORS -gt 0 ]; then
    echo "⚠️  $pod has $ERRORS errors in logs"
  else
    echo "✓ $pod - no errors"
  fi
done
# Expected: All pods show no errors

# Check sidecar logs for errors
for pod in $(kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].metadata.name}'); do
  ERRORS=$(kubectl logs $pod -n kubestock-staging -c istio-proxy 2>/dev/null | grep -i "error\|exception" | wc -l)
  if [ $ERRORS -gt 0 ]; then
    echo "⚠️  $pod sidecar has $ERRORS errors"
  fi
done
# Expected: No errors in sidecars
```

### 10.2 Verify Istio Configuration Validity

```bash
# Run Istio analysis
istioctl analyze -n kubestock-staging
# Expected: No errors, only informational messages

# Validate all resources
kubectl apply -k gitops/overlays/staging/ --dry-run=client -o yaml | kubectl apply -f - --dry-run=client
# Expected: No validation errors

# Check for configuration issues
istioctl validate -f gitops/base/istio/peer-authentication-strict.yaml
# Expected: Passed validation
```

### 10.3 Check Asgardeo Integration Issues

```bash
# Check if Asgardeo endpoints are reachable from pods
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.asgardeo.io/health
# Expected: 200 or 404 (means it's reachable)

# Verify certificate chain for Asgardeo
kubectl exec <ms-identity-pod> -n kubestock-staging -c ms-identity -- \
  openssl s_client -connect api.asgardeo.io:443 -showcerts < /dev/null 2>/dev/null | \
  grep "Verify return code"
# Expected: "Verify return code: 0 (ok)"

# Check DNS resolution of Asgardeo endpoint
kubectl exec test-mtls -n kubestock-staging -- \
  nslookup api.asgardeo.io
# Expected: Resolves to IP address
```

---

## Phase 11: End-to-End Testing

### 11.1 Complete Authentication Flow Test

```bash
# 1. Access frontend (opens Asgardeo login)
FRONTEND_IP=$(kubectl get svc frontend -n kubestock-staging -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
# Or use port-forward
kubectl port-forward svc/frontend 3000:3000 -n kubestock-staging &

# 2. Open http://localhost:3000 in browser
# 3. Click login (redirects to Asgardeo)
# 4. Login with credentials
# 5. Should redirect back to app

# 6. Test API call from console
# In browser console:
# fetch('/api/user').then(r => r.json()).then(d => console.log(d))

# 7. Verify response shows user info from Asgardeo

# 8. Check ms-identity logs for token validation
kubectl logs <ms-identity-pod> -n kubestock-staging -c ms-identity | tail -20
# Expected: Shows successful token validation
```

### 11.2 Service-to-Service Flow Test

```bash
# 1. From frontend, trigger API call that requires service-to-service communication
# Example: Get supplier data (frontend → API gateway → ms-supplier)

# 2. Check logs of services involved
kubectl logs <frontend-pod> -n kubestock-staging -c frontend | grep -i "supplier\|api"

# 3. Check if services communicated successfully
kubectl logs <supplier-pod> -n kubestock-staging -c ms-supplier | grep -i "success\|error"

# 4. Verify mTLS was used
kubectl exec <supplier-pod> -n kubestock-staging -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_ssl"
# Expected: Shows mTLS connections
```

---

## Phase 12: Performance & Load Validation

### 12.1 Monitor Resource Usage

```bash
# Check current resource usage
kubectl top pods -n kubestock-staging --containers
# Expected: Memory ~150-300MB per pod (app + sidecar)

# Monitor over time (in separate terminal)
watch -n 5 'kubectl top pods -n kubestock-staging --containers'

# Check node resources
kubectl top nodes
# Expected: Sufficient available resources

# Check resource requests vs usage
kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].spec.containers[*].resources}' | jq .
# Expected: Requests and limits defined
```

### 12.2 Test Under Load

```bash
# Create load test pod
kubectl run load-test --image=loadimpact/k6 -n kubestock-staging --rm -it -- k6 run - <<'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let response = http.get('http://ms-identity:3006/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
EOF

# Monitor during load test
kubectl top pods -n kubestock-staging --containers &
# Expected: Resource usage increases proportionally, no errors
```

---

## Phase 13: Backup & Disaster Recovery Validation

### 13.1 Verify State Persistence

```bash
# Check if PersistentVolumes exist (if using)
kubectl get pv
# Expected: Shows PVs if any

# Check PersistentVolumeClaims
kubectl get pvc -n kubestock-staging
# Expected: Any PVCs are in Bound state

# Verify database connection
kubectl exec <pod-name> -n kubestock-staging -c <app> -- \
  psql -h postgres.default -d kubestock -c "SELECT 1" 2>/dev/null
# Expected: Connection successful
```

### 13.2 Test Recovery Scenarios

```bash
# Scenario 1: Pod restart
kubectl delete pod <pod-name> -n kubestock-staging
kubectl wait --for=condition=Ready pod <pod-name> -n kubestock-staging --timeout=60s

# Verify it comes back with sidecar
kubectl get pod <pod-name> -n kubestock-staging -o jsonpath='{.spec.containers[*].name}'
# Expected: Both app and istio-proxy present

# Scenario 2: Service unavailability
kubectl scale deploy ms-identity --replicas=0 -n kubestock-staging
sleep 10
kubectl exec test-mtls -n kubestock-staging -- \
  curl -v http://ms-identity:3006/health 2>&1 | grep -E "Connection|refused"
# Expected: Connection refused (service down)

# Restore
kubectl scale deploy ms-identity --replicas=1 -n kubestock-staging
kubectl wait --for=condition=Ready pod -l app=ms-identity -n kubestock-staging --timeout=60s

# Scenario 3: Network partition (if possible)
# Test istio retries kick in automatically
# Create temporary network delay and observe retries
```

---

## Quick Validation Checklist

Use this checklist for rapid validation:

```bash
#!/bin/bash

echo "🔍 KUBESTOCK ISTIO + ASGARDEO VALIDATION CHECKLIST"
echo "=================================================="

# Cluster
[ "$(kubectl get nodes -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o True | wc -l)" -gt 0 ] && echo "✓ Cluster nodes ready" || echo "✗ Cluster nodes not ready"

# Istio
[ "$(kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[*].status.phase}' | grep Running)" ] && echo "✓ Istio control plane running" || echo "✗ Istio not running"

# Sidecars
SIDECAR_COUNT=$(kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].spec.containers[?(@.name=="istio-proxy")]}' | jq 'length')
[ "$SIDECAR_COUNT" -eq 6 ] && echo "✓ All sidecars injected ($SIDECAR_COUNT)" || echo "✗ Sidecars missing"

# mTLS
[ "$(kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}')" == "STRICT" ] && echo "✓ STRICT mTLS enabled" || echo "✗ mTLS not strict"

# Services
RUNNING_PODS=$(kubectl get pods -n kubestock-staging -o jsonpath='{.items[*].status.phase}' | grep -o Running | wc -l)
[ "$RUNNING_PODS" -eq 6 ] && echo "✓ All services running ($RUNNING_PODS)" || echo "✗ Services not all running"

# Asgardeo Secret
[ "$(kubectl get secret asgardeo-secret -n kubestock-staging 2>/dev/null)" ] && echo "✓ Asgardeo secret exists" || echo "✗ Asgardeo secret missing"

# Health
ERRORS=$(kubectl logs -n kubestock-staging --tail=100 -l app=ms-identity | grep -i error | wc -l)
[ "$ERRORS" -eq 0 ] && echo "✓ No errors in logs" || echo "✗ Errors found: $ERRORS"

# Connectivity
kubectl exec test-mtls -n kubestock-staging -- curl -s http://ms-identity:3006/health > /dev/null 2>&1 && echo "✓ Service connectivity working" || echo "✗ Service connectivity failed"

echo "=================================================="
echo "Validation complete!"
```

---

## Summary Table

| Component            | Pass Criteria            | Check Command                                                   |
| -------------------- | ------------------------ | --------------------------------------------------------------- |
| **Cluster**          | All nodes Ready          | `kubectl get nodes`                                             |
| **Istio**            | istiod pod Running       | `kubectl get pods -n istio-system -l app=istiod`                |
| **Sidecars**         | 6 istio-proxy containers | `kubectl get pods -n kubestock-staging -o wide`                 |
| **mTLS**             | STRICT mode              | `kubectl get peerauthentication default -n istio-system`        |
| **Services**         | 6 Running pods           | `kubectl get pods -n kubestock-staging`                         |
| **Asgardeo**         | Secret exists            | `kubectl get secret asgardeo-secret -n kubestock-staging`       |
| **Connectivity**     | curl succeeds            | `kubectl exec test-mtls -- curl http://ms-identity:3006/health` |
| **Logs**             | No critical errors       | `kubectl logs -n kubestock-staging -l app=ms-identity`          |
| **VirtualServices**  | All 6 configured         | `kubectl get vs -n kubestock-staging`                           |
| **DestinationRules** | All 6 ISTIO_MUTUAL       | `kubectl get dr -n kubestock-staging -o yaml`                   |

---

## Troubleshooting Quick Links

If validation fails:

1. **Pods not running:** See DEPLOYMENT_CHECKLIST.md
2. **Sidecars not injecting:** Check namespace label and webhook
3. **mTLS issues:** Check PeerAuthentication and DestinationRules
4. **Asgardeo errors:** See ISTIO_ASGARDEO_COMPATIBILITY.md
5. **Service connectivity:** Check DNS and port availability
6. **Observability issues:** Verify Kiali/Jaeger pods are running

---

**Status:** Validation guide complete and ready to use!
