# ArgoCD GitOps Setup

Complete ArgoCD configuration for GitOps-based continuous delivery of the Inventory Management System.

## 📋 Overview

This directory contains:
- **ArgoCD Installation**: Core ArgoCD components with HA configuration
- **Projects**: Staging and production environments with RBAC
- **Applications**: Automated deployment configurations for all microservices
- **Notifications**: Slack/Email alerts for deployment events

## 🚀 Quick Start

### 1. Install ArgoCD

```bash
# Run the automated installation script
cd k8s/argocd
chmod +x install.sh
./install.sh
```

**Or manual installation:**

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply custom configurations
kubectl apply -f argocd-cm.yaml
kubectl apply -f argocd-rbac-cm.yaml
kubectl apply -f argocd-notifications-cm.yaml

# Create projects
kubectl apply -f projects/

# Create applications
kubectl apply -f applications/staging/
kubectl apply -f applications/production/
```

### 2. Access ArgoCD UI

**Get admin password:**
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**Port-forward for local access:**
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Access at:** https://localhost:8080
- Username: `admin`
- Password: (from command above)

### 3. Install ArgoCD CLI (Optional)

```bash
# Linux/macOS
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64

# Login
argocd login localhost:8080
```

## 📁 Directory Structure

```
k8s/argocd/
├── namespace.yaml                     # ArgoCD namespace
├── install.yaml                       # Installation notes
├── argocd-cm.yaml                     # Configuration (repo, settings)
├── argocd-rbac-cm.yaml                # RBAC policies
├── argocd-server-ingress.yaml         # Ingress for UI
├── argocd-notifications-cm.yaml       # Notifications config
├── projects/
│   ├── staging-project.yaml           # Staging project + RBAC
│   └── production-project.yaml        # Production project + RBAC
├── applications/
│   ├── staging/
│   │   ├── inventory-system-staging.yaml    # All microservices
│   │   └── kong-gateway-staging.yaml        # API Gateway
│   └── production/
│       └── inventory-system-production.yaml # Production apps
└── install.sh                         # Automated installation script
```

## 🔧 Configuration

### Repository Configuration

Update `argocd-cm.yaml` with your repository:

```yaml
data:
  repositories: |
    - url: https://github.com/YOUR_ORG/YOUR_REPO.git
      name: inventory-system
      type: git
```

### Ingress Domain

Update `argocd-server-ingress.yaml`:

```yaml
spec:
  rules:
  - host: argocd.yourdomain.com  # Replace with your domain
```

### Notifications

Configure Slack/Email in `argocd-notifications-cm.yaml`:

```yaml
data:
  service.slack: |
    token: $slack-token  # Add as secret
  
  service.email.gmail: |
    username: $email-username
    password: $email-password
```

**Create secrets:**
```bash
kubectl create secret generic argocd-notifications-secret \
  --from-literal=slack-token=YOUR_SLACK_TOKEN \
  -n argocd
```

## 📦 Projects & Applications

### Projects

**Staging Project:**
- Auto-sync enabled
- Prune and self-heal enabled
- 24/7 deployment windows
- Roles: admin, readonly

**Production Project:**
- Manual sync (requires approval)
- No auto-prune
- Restricted deployment windows (Mon-Fri, 6 AM - 10 PM)
- Roles: admin, deployer, readonly

### Applications

**Staging:**
- `inventory-system-staging`: All 5 microservices
- `kong-gateway-staging`: API Gateway

**Production:**
- `inventory-system-production`: All 5 microservices (manual sync)

## 🔐 RBAC Roles

Configured in `argocd-rbac-cm.yaml`:

| Role | Permissions | Users |
|------|-------------|-------|
| **admin** | Full access | admin group |
| **developer** | Manage apps, sync, logs | developer group |
| **viewer** | Read-only | viewer group |
| **cicd** | Sync apps | CI/CD automation |

## 🔔 Notifications

Configured triggers:
- ✅ **on-deployed**: Application successfully deployed
- ❌ **on-sync-failed**: Sync operation failed
- ⚠️ **on-health-degraded**: Application health degraded

**Subscribe to notifications:**

Edit application annotations:
```yaml
metadata:
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: inventory-alerts
    notifications.argoproj.io/subscribe.on-sync-failed.email: team@company.com
```

## 🚦 Sync Policies

### Staging (Automated)
```yaml
syncPolicy:
  automated:
    prune: true          # Delete removed resources
    selfHeal: true       # Auto-sync on drift detection
    allowEmpty: false    # Prevent empty commits
```

### Production (Manual)
```yaml
syncPolicy:
  automated:
    prune: false         # Manual pruning only
    selfHeal: false      # Manual sync only
```

## 📊 Health Checks

ArgoCD monitors:
- Deployment readiness
- Pod status
- Service endpoints
- ConfigMap/Secret changes

**Custom health checks** in `argocd-cm.yaml`:
```yaml
resource.customizations: |
  networking.k8s.io/Ingress:
    health.lua: |
      hs = {}
      hs.status = "Healthy"
      return hs
```

## 🔄 GitOps Workflow

### Staging Deployment
1. Developer pushes code to `main` branch
2. CI/CD pipeline builds Docker image
3. CI/CD updates image tag in Git repository
4. ArgoCD detects change (auto-sync every 3 minutes)
5. ArgoCD applies changes to Kubernetes
6. Health checks validate deployment
7. Notifications sent to Slack

### Production Deployment
1. Tag release in Git repository
2. CI/CD pipeline builds production image
3. Manual approval required
4. ArgoCD sync triggered manually
5. Blue-green or canary deployment strategy
6. Health checks validate deployment
7. Notifications sent to Slack + Email

## 🛠️ Common Operations

### Sync Application
```bash
# CLI
argocd app sync inventory-system-staging

# kubectl
kubectl patch application inventory-system-staging \
  -n argocd --type merge \
  -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'
```

### View Application Status
```bash
argocd app get inventory-system-staging
```

### Rollback Application
```bash
argocd app rollback inventory-system-staging <history-id>
```

### View Sync History
```bash
argocd app history inventory-system-staging
```

### Delete Application
```bash
argocd app delete inventory-system-staging
# Or
kubectl delete application inventory-system-staging -n argocd
```

## 🔍 Troubleshooting

### Check ArgoCD status
```bash
kubectl get pods -n argocd
kubectl logs -n argocd deployment/argocd-server
```

### Application not syncing
```bash
# Check application status
argocd app get <app-name>

# View sync errors
kubectl describe application <app-name> -n argocd

# Force refresh
argocd app get <app-name> --refresh
```

### Repository connection issues
```bash
# Test repository connection
argocd repo list

# Add repository manually
argocd repo add https://github.com/your-org/your-repo.git
```

### Reset admin password
```bash
# Get current password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Or update password
argocd account update-password
```

## 🔧 Advanced Configuration

### Multi-cluster Setup
```bash
# Add external cluster
argocd cluster add <context-name>

# Update destination in application
spec:
  destination:
    server: https://external-cluster-api
    namespace: inventory-system
```

### ApplicationSet for Multiple Environments
```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: inventory-system-envs
spec:
  generators:
  - list:
      elements:
      - env: staging
        namespace: inventory-system
      - env: production
        namespace: inventory-system
  template:
    metadata:
      name: '{{env}}-inventory-system'
    spec:
      source:
        path: k8s/overlays/{{env}}
```

### Image Updater
```bash
# Install ArgoCD Image Updater
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

# Configure image update annotations
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: user-service=ghcr.io/it21182914/user-service:~sha-
    argocd-image-updater.argoproj.io/write-back-method: git
```

## 📚 Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [RBAC Configuration](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- [Notifications Setup](https://argocd-notifications.readthedocs.io/)

## 🔗 Integration with CI/CD

Update GitHub Actions workflows (`.github/workflows/ci-cd-staging.yml`):

```yaml
# Stage 4: Update GitOps Repository (instead of direct kubectl apply)
- name: Update Image Tag
  run: |
    git config user.name "github-actions"
    git config user.email "actions@github.com"
    
    # Update image tag in k8s manifests
    cd k8s/base/services
    sed -i "s|image: ghcr.io/.*/user-service:.*|image: ghcr.io/${{ github.repository }}/user-service:sha-${{ github.sha }}|g" user-service/deployment.yaml
    
    git add .
    git commit -m "Update user-service to sha-${{ github.sha }}"
    git push
```

ArgoCD will automatically detect and sync the changes!

## ✅ Verification

```bash
# Check ArgoCD is running
kubectl get pods -n argocd

# Verify applications are healthy
argocd app list

# Check sync status
argocd app get inventory-system-staging

# View application in UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Open https://localhost:8080
```

## 🎯 Next Steps

After ArgoCD setup:
1. ✅ Configure monitoring stack (Prometheus/Grafana)
2. ✅ Set up logging (OpenSearch/FluentBit)
3. ✅ Implement Zero Trust security (mTLS, OPA)
4. ✅ Update CI/CD pipelines for GitOps workflow
5. ✅ Configure backup/disaster recovery

---

**Status**: ✅ Production-ready GitOps configuration complete!
