# Zero Trust Security Stack

Comprehensive security implementation following Zero Trust principles for Kubernetes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Zero Trust Security Layers                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 1: Admission Control (OPA Gatekeeper)             │  │
│  │  - Policy enforcement at resource creation               │  │
│  │  - 5 constraint templates, 5 active policies             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 2: Network Segmentation (NetworkPolicies)         │  │
│  │  - Default deny all traffic                              │  │
│  │  - Explicit allow rules per service                      │  │
│  │  - Microsegmentation between services                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 3: Pod Security (PSS)                             │  │
│  │  - Restricted mode for production                        │  │
│  │  - Non-root execution                                    │  │
│  │  - Read-only root filesystem                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 4: Service Mesh mTLS (Linkerd) [Optional]         │  │
│  │  - Automatic mutual TLS between services                 │  │
│  │  - Zero-config encryption                                │  │
│  │  - Traffic monitoring and authorization                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. OPA Gatekeeper (Policy Engine)

**Purpose**: Enforce organizational policies at admission time

**Deployment**:
- 3 webhook controllers (high availability)
- 1 audit controller (periodic compliance checks)

**Constraint Templates** (5):

1. **K8sRequiredLabels**: Enforces required labels on resources
   - Required: `app`, `version`, `environment`
   - Scope: Deployments, StatefulSets, DaemonSets

2. **K8sDenyPrivileged**: Blocks privileged containers
   - Prevents privilege escalation
   - Applies to all containers and init containers

3. **K8sContainerLimits**: Requires resource limits/requests
   - Enforces CPU and memory limits
   - Prevents resource exhaustion

4. **K8sAllowedRepos**: Restricts image repositories
   - Allowed: ghcr.io, docker.io, quay.io, gcr.io, registry.k8s.io
   - Prevents untrusted images

5. **K8sBlockDefault**: Blocks default namespace usage
   - Forces explicit namespace assignment
   - Production best practice

### 2. Network Policies

**Default Deny All**:
```yaml
# Blocks all ingress traffic by default
# Blocks all egress except DNS
```

**Service-Specific Policies**:

- **Kong Gateway**: 
  - Ingress: Allow from any (external entry point)
  - Egress: Allow to all backend services

- **User Service**:
  - Ingress: Kong only
  - Egress: Database + DNS

- **Inventory Service**:
  - Ingress: Kong + Order Service
  - Egress: Database + DNS

- **Order Service**:
  - Ingress: Kong only
  - Egress: Inventory + Product Catalog + Database + DNS

- **Product Catalog Service**:
  - Ingress: Kong + Order Service
  - Egress: Database + DNS

- **Supplier Service**:
  - Ingress: Kong only
  - Egress: Database + DNS

**Monitoring Integration**:
- Allow Prometheus scraping from monitoring namespace

### 3. Pod Security Standards

**Production Namespace** (Restricted):
- `runAsNonRoot: true`
- `allowPrivilegeEscalation: false`
- `capabilities: drop ALL`
- `readOnlyRootFilesystem: true`
- `seccompProfile: RuntimeDefault`

**Staging Namespace** (Baseline):
- Less restrictive for testing
- Warn on violations

### 4. Linkerd Service Mesh (Optional)

**mTLS Benefits**:
- Automatic certificate rotation
- Zero-config encryption
- Traffic authorization policies
- Per-request authentication

## Installation

### Quick Install (All Components)

```bash
cd k8s/security
chmod +x install.sh
./install.sh
```

### Manual Installation

#### Step 1: OPA Gatekeeper
```bash
kubectl apply -f opa-gatekeeper/install.yaml
kubectl wait --for=condition=available --timeout=120s \
  deployment/gatekeeper-controller-manager -n gatekeeper-system
```

#### Step 2: Constraint Templates
```bash
kubectl apply -f opa-gatekeeper/constraint-templates.yaml
```

#### Step 3: Policy Constraints
```bash
kubectl apply -f opa-gatekeeper/constraints.yaml
```

#### Step 4: Network Policies
```bash
kubectl apply -f network-policies/default-deny-all.yaml
kubectl apply -f network-policies/microservices-policies.yaml
```

#### Step 5: Pod Security Standards
```bash
kubectl apply -f pod-security-standards/restricted-pss.yaml
```

#### Step 6: Linkerd (Optional)
```bash
cd linkerd
chmod +x install-linkerd.sh
./install-linkerd.sh
```

## Verification

### Check OPA Gatekeeper Status
```bash
# Check pods
kubectl get pods -n gatekeeper-system

# View active constraints
kubectl get constraints

# Check constraint details
kubectl describe k8srequiredlabels must-have-app-label
```

### Test Policy Enforcement

**Test 1: Deploy without required labels (should fail)**
```bash
kubectl run test-pod --image=nginx
# Expected: Error - missing required labels
```

**Test 2: Deploy privileged container (should fail)**
```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
spec:
  containers:
  - name: nginx
    image: nginx
    securityContext:
      privileged: true
EOF
# Expected: Error - privileged containers not allowed
```

**Test 3: Deploy without resource limits (should fail)**
```bash
kubectl create deployment test --image=nginx
# Expected: Error - must specify resource limits
```

### Check Network Policies
```bash
# View all policies
kubectl get networkpolicies -n default

# Describe specific policy
kubectl describe networkpolicy user-service-policy -n default

# Test connectivity (from inside pod)
kubectl exec -it <pod-name> -- curl http://inventory-service:3001/health
```

### Test Network Segmentation

```bash
# Should FAIL - blocked by network policy
kubectl run test-pod --image=nginx --rm -it -- curl http://user-service:3000

# Should SUCCEED - allowed through Kong
kubectl exec -it kong-gateway-xxx -- curl http://user-service:3000/health
```

### Check Linkerd mTLS Status
```bash
# View mesh status
linkerd viz stat deploy -n default

# Check mTLS edges
linkerd viz edges deployment -n default

# View tap (live traffic)
linkerd viz tap deployment/user-service -n default
```

Expected output:
```
NAME                      SECURED  SUCCESS       RPS   ...
user-service              100.00%   100.00%    2.0rps ...
inventory-service         100.00%   100.00%    5.2rps ...
```

### Audit Violations

```bash
# View policy violations
kubectl get constraints -o yaml | grep -A 10 violations

# Check audit logs
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit
```

## Zero Trust Principles Implementation

### 1. ✅ Verify Explicitly
- **OPA Gatekeeper**: Every resource creation validated against policies
- **Constraint Templates**: Explicit rules for security requirements
- **Network Policies**: Explicit allow rules (no implicit trust)

### 2. ✅ Least Privilege Access
- **Network Policies**: Default deny, minimal required permissions
- **Pod Security**: Drop all capabilities, non-root execution
- **RBAC**: Service-specific roles with minimal permissions

### 3. ✅ Assume Breach
- **Network Segmentation**: Microsegmentation between services
- **mTLS**: Encrypted service-to-service communication
- **Audit Logging**: Continuous monitoring and violation tracking

### 4. ✅ Defense in Depth
- **Layer 1**: Admission control (Gatekeeper)
- **Layer 2**: Network policies (segmentation)
- **Layer 3**: Pod security standards (runtime)
- **Layer 4**: Service mesh (mTLS encryption)

## Troubleshooting

### Gatekeeper Webhook Not Working

**Issue**: Resources being created without policy enforcement

**Solution**:
```bash
# Check webhook configuration
kubectl get validatingwebhookconfigurations

# Verify webhook service
kubectl get svc -n gatekeeper-system

# Check controller logs
kubectl logs -n gatekeeper-system deployment/gatekeeper-controller-manager
```

### NetworkPolicy Blocking Legitimate Traffic

**Issue**: Service cannot communicate

**Solution**:
```bash
# Check if NetworkPolicy exists
kubectl get networkpolicy -n default

# Verify policy rules
kubectl describe networkpolicy <policy-name> -n default

# Temporarily disable for testing
kubectl delete networkpolicy <policy-name> -n default

# Test connectivity
kubectl exec -it <source-pod> -- curl http://<target-service>:<port>
```

### Constraint Violation Not Detected

**Issue**: Resource created despite violating constraint

**Solution**:
```bash
# Check if constraint is ready
kubectl get constraints

# Verify constraint has no errors
kubectl describe <constraint-kind> <constraint-name>

# Check audit controller logs
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit

# Force audit run
kubectl annotate constraint <constraint-name> \
  audit.gatekeeper.sh/last-run-time-
```

### Linkerd Injection Not Working

**Issue**: Pods deployed without sidecars

**Solution**:
```bash
# Check if namespace annotated
kubectl get namespace default -o yaml | grep linkerd

# Annotate namespace
kubectl annotate namespace default linkerd.io/inject=enabled

# Annotate deployment
kubectl annotate deployment <name> linkerd.io/inject=enabled

# Restart deployment
kubectl rollout restart deployment <name>

# Verify injection
kubectl describe pod <pod-name> | grep linkerd-proxy
```

## Maintenance

### Update Gatekeeper
```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

### Add New Constraint Template
```bash
# Create template file
cat > new-constraint.yaml <<EOF
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8snewpolicy
spec:
  # ... template definition
EOF

# Apply template
kubectl apply -f new-constraint.yaml

# Wait for CRD creation
kubectl get crd | grep k8snewpolicy

# Create constraint instance
kubectl apply -f new-constraint-instance.yaml
```

### Audit Existing Resources
```bash
# Run audit
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit

# Get all violations
kubectl get constraints -o yaml | grep -A 20 violations

# Check specific constraint
kubectl get k8srequiredlabels must-have-app-label -o yaml
```

## Security Best Practices

### 1. Regular Audits
```bash
# Schedule daily audit checks
kubectl logs -n gatekeeper-system deployment/gatekeeper-audit --since=24h
```

### 2. Network Policy Testing
```bash
# Test before production
kubectl create ns test
kubectl apply -f network-policies/ -n test
# Validate connectivity
```

### 3. Constraint Refinement
```bash
# Start with warn mode
spec:
  enforcementAction: warn  # Don't block, just warn

# Monitor for violations
kubectl get constraints -o yaml | grep violations

# Switch to deny mode
spec:
  enforcementAction: deny  # Block violations
```

### 4. mTLS Verification
```bash
# Regularly check encryption status
linkerd viz stat deploy -n default --json | jq '.rows[] | select(.meshed != "1/1")'
```

## Integration with CI/CD

### GitOps (ArgoCD)
```yaml
# Add security policies to ArgoCD application
spec:
  source:
    path: k8s/security
    targetRevision: main
  syncPolicy:
    automated:
      prune: false  # Don't auto-delete security policies
```

### Pre-Deployment Validation
```bash
# Add to CI pipeline
gator test -f policies/ -f test-cases/
kubectl apply --dry-run=server -f deployment.yaml
```

## Assignment Requirements Satisfied

✅ **Zero Trust Security Implementation**
- Admission control with OPA Gatekeeper (policy enforcement)
- Network segmentation with NetworkPolicies (microsegmentation)
- Pod Security Standards (restricted mode for production)
- Optional mTLS with Linkerd (encrypted communication)
- Defense in depth (4 security layers)
- Least privilege access (default deny + explicit allows)
- Continuous verification (audit controller)

## Resources

- OPA Gatekeeper: https://open-policy-agent.github.io/gatekeeper/
- Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Linkerd: https://linkerd.io/2.14/features/automatic-mtls/
- Zero Trust: https://www.cisa.gov/zero-trust-maturity-model
