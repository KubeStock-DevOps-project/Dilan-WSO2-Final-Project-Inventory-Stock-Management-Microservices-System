# Quick Validation Reference Card

## 🚀 One-Line Validation Commands

### Health Check

```bash
# Complete health check (recommended first step)
./validate-deployment.sh

# With verbose output
./validate-deployment.sh --verbose

# With automatic fixes enabled
./validate-deployment.sh --fix-issues
```

### Cluster Status

```bash
kubectl get nodes -o wide
kubectl get pods -n istio-system
kubectl get pods -n kubestock-staging
```

### Service Mesh Status

```bash
# Check mTLS is STRICT
kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}'

# Count services with sidecars
kubectl get pods -n kubestock-staging -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | while read pod; do
  echo -n "$pod: "; kubectl get pod $pod -n kubestock-staging -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].name}' | wc -w
done

# Check all destination rules have ISTIO_MUTUAL
kubectl get dr -n kubestock-staging -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.trafficPolicy.tls.mode}{"\n"}{end}'
```

### Connectivity Test

```bash
# Access test pod
kubectl exec -it test-mtls -n kubestock-staging -- /bin/sh

# From inside test pod:
curl http://ms-identity:3006/health
curl http://ms-inventory:3001/health
nslookup ms-identity
```

### Asgardeo Check

```bash
# Verify secret exists
kubectl get secret asgardeo-secret -n kubestock-staging

# Check secret keys
kubectl get secret asgardeo-secret -n kubestock-staging -o jsonpath='{.data}' | jq 'keys'

# Check ms-identity pod status
kubectl get pod -l app=ms-identity -n kubestock-staging -o wide
```

---

## ✅ Validation Checklist (Manual)

### Pre-Deployment (Before installing Istio)

- [ ] Cluster nodes are all Ready

  ```bash
  kubectl get nodes
  ```

- [ ] Kubernetes API is working

  ```bash
  kubectl cluster-info
  ```

- [ ] Required namespaces exist

  ```bash
  kubectl get namespaces
  ```

- [ ] No existing Istio installation
  ```bash
  kubectl get namespace istio-system 2>/dev/null || echo "OK - Istio not installed yet"
  ```

### Installation Verification

- [ ] Istio namespace created

  ```bash
  kubectl get namespace istio-system
  ```

- [ ] istiod pod is running

  ```bash
  kubectl get pod -n istio-system -l app=istiod
  ```

- [ ] All Istio CRDs installed (~50)

  ```bash
  kubectl get crds | grep istio.io | wc -l
  ```

- [ ] Webhook is active
  ```bash
  kubectl get mutatingwebhookconfigurations | grep istio-sidecar-injector
  ```

### Namespace & Configuration

- [ ] Sidecar injection label enabled

  ```bash
  kubectl get ns kubestock-staging -o jsonpath='{.metadata.labels.istio-injection}'
  # Expected: enabled
  ```

- [ ] PeerAuthentication is STRICT

  ```bash
  kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}'
  # Expected: STRICT
  ```

- [ ] 6 DestinationRules exist with ISTIO_MUTUAL

  ```bash
  kubectl get dr -n kubestock-staging --no-headers | wc -l
  ```

- [ ] 6 VirtualServices exist
  ```bash
  kubectl get vs -n kubestock-staging --no-headers | wc -l
  ```

### Pod Status

- [ ] All 6 services are Running

  ```bash
  kubectl get pods -n kubestock-staging
  ```

- [ ] All pods have 2/2 containers (app + sidecar)

  ```bash
  kubectl get pods -n kubestock-staging
  ```

- [ ] No error in pod events
  ```bash
  kubectl get events -n kubestock-staging
  ```

### Service Discovery & Connectivity

- [ ] DNS works from test pod

  ```bash
  kubectl exec test-mtls -n kubestock-staging -- nslookup ms-identity
  ```

- [ ] Services are reachable

  ```bash
  kubectl exec test-mtls -n kubestock-staging -- curl -s http://ms-identity:3006/health | head -c 50
  ```

- [ ] All services have endpoints
  ```bash
  kubectl get endpoints -n kubestock-staging
  ```

### Asgardeo Integration

- [ ] Secret exists

  ```bash
  kubectl get secret asgardeo-secret -n kubestock-staging
  ```

- [ ] ms-identity pod is ready

  ```bash
  kubectl get pod -l app=ms-identity -n kubestock-staging
  ```

- [ ] No auth errors in logs
  ```bash
  kubectl logs -l app=ms-identity -n kubestock-staging -c ms-identity | grep -i "error\|401\|unauthorized" | head -5
  ```

### No Critical Errors

- [ ] No failed pods

  ```bash
  kubectl get pods -n kubestock-staging --field-selector=status.phase!=Running
  ```

- [ ] No errors in recent logs (< 5 errors)

  ```bash
  kubectl logs -n kubestock-staging --all-containers=true --tail=100 | grep -i error | wc -l
  ```

- [ ] Istio analysis passes
  ```bash
  istioctl analyze -n kubestock-staging
  ```

---

## 🔧 Quick Fixes

### Sidecar Not Injecting

```bash
# Add label
kubectl label namespace kubestock-staging istio-injection=enabled --overwrite

# Restart pods
kubectl delete pods -n kubestock-staging -l app=ms-identity
```

### mTLS Not Strict

```bash
# Apply STRICT mode
kubectl apply -f gitops/base/istio/peer-authentication-strict.yaml
```

### Pod Stuck in Pending

```bash
# Check why
kubectl describe pod <pod-name> -n kubestock-staging

# Usually: need to pull image or add resource quota
```

### Service Not Reachable

```bash
# Check if pods are running
kubectl get pods -n kubestock-staging

# Check if sidecar is injected
kubectl get pod <pod-name> -n kubestock-staging -o jsonpath='{.spec.containers[*].name}'

# Restart sidecar injector
kubectl rollout restart deploy -n istio-system sidecar-injector
```

### High Memory Usage

```bash
# Check what's using memory
kubectl top pods -n kubestock-staging --containers | sort -k3 -nr

# Increase limits if needed
kubectl set resources deployment <name> -n kubestock-staging --limits=memory=512Mi
```

---

## 📊 Expected Values

| Component              | Expected        | Alert If           |
| ---------------------- | --------------- | ------------------ |
| Ready Nodes            | All nodes Ready | Any NotReady       |
| istiod pods            | 1-3 Running     | 0 or CrashLoop     |
| istio-proxy containers | 6 (one per pod) | < 6                |
| mTLS mode              | STRICT          | Different          |
| Service pods           | All Running     | Any Pending/Failed |
| Pod readiness          | 2/2 Ready       | 1/2 or 0/2         |
| DestinationRules       | 6 total         | < 6                |
| VirtualServices        | 6 total         | < 6                |
| Service endpoints      | > 0 each        | 0 endpoints        |
| Memory per pod         | 150-300 MB      | > 500 MB           |
| CPU per pod            | 50-200 mCPU     | > 1000 mCPU        |

---

## 🔍 What Each File Does

### Validation Files

| File                                      | Purpose                                            | Run When                        |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------- |
| `COMPREHENSIVE_VALIDATION_GUIDE.md`       | Complete validation procedures with detailed steps | Initial deployment verification |
| `DIAGNOSTIC_AND_TROUBLESHOOTING_GUIDE.md` | Diagnostic commands and troubleshooting procedures | Debugging issues                |
| `validate-deployment.sh`                  | Automated validation script                        | After every deployment          |
| `QUICK_VALIDATION_REFERENCE.md`           | This file - quick commands                         | During daily operations         |

### Configuration Files

| File                                                | Purpose                          | Used By             |
| --------------------------------------------------- | -------------------------------- | ------------------- |
| `gitops/base/istio/peer-authentication-strict.yaml` | Enforces STRICT mTLS globally    | Istio control plane |
| `gitops/base/services/*/istio-destinationrule.yaml` | Per-service mTLS configuration   | Service connections |
| `gitops/base/services/*/istio-virtualservice.yaml`  | Traffic routing with retries     | Service routing     |
| `gitops/base/namespaces/staging.yaml`               | Namespace with sidecar injection | Pod deployment      |

---

## 🚨 Common Issues & Quick Fixes

```bash
# Issue: Sidecars not injecting
Fix: kubectl label namespace kubestock-staging istio-injection=enabled --overwrite

# Issue: mTLS errors (connection refused)
Fix: kubectl get peerauthentication default -n istio-system
# If not STRICT, apply the peer auth from gitops/base/istio/

# Issue: Pod can't reach service
Fix: kubectl exec <pod> -n kubestock-staging -- nslookup <service>

# Issue: High memory usage
Fix: kubectl top pods -n kubestock-staging --containers

# Issue: Asgardeo token validation failing
Fix: kubectl get secret asgardeo-secret -n kubestock-staging

# Issue: Service discovery not working
Fix: kubectl logs -n kube-system -l k8s-app=kube-dns
```

---

## 📋 Monitoring Dashboards

### Kiali (Service Mesh Visualization)

```bash
kubectl port-forward -n istio-system svc/kiali 20000:20000 &
# Open: http://localhost:20000/kiali
```

### Prometheus (Metrics)

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
# Open: http://localhost:9090
```

### Jaeger (Distributed Tracing)

```bash
kubectl port-forward -n istio-system svc/jaeger-collector 16686:16686 &
# Open: http://localhost:16686
```

---

## 📞 Support Resources

- **Istio Issues**: See `DIAGNOSTIC_AND_TROUBLESHOOTING_GUIDE.md` Section 7
- **Asgardeo Integration**: See `ISTIO_ASGARDEO_COMPATIBILITY.md`
- **Configuration Details**: See `ISTIO_RECONFIGURATION_SUMMARY.md`
- **Installation Issues**: See `infrastructure/install-istio.sh`

---

## ✨ Success Indicators

Your deployment is healthy when:

✅ All 6 services pods are Running (2/2 Ready)
✅ mTLS mode shows STRICT
✅ Service DNS resolution works
✅ Curl requests between services succeed
✅ Kiali dashboard shows services communicating
✅ No errors in recent logs
✅ Asgardeo secret exists and is mounted
✅ Token validation working (ms-identity logs show no auth errors)

---

**Last Updated:** Complete validation reference ready for operations team!

**Next Steps:**

1. Run `./validate-deployment.sh` after each deployment
2. Monitor dashboards via Kiali
3. Check logs regularly with provided grep commands
4. Use troubleshooting guide if issues arise
