# Cluster Autoscaler Deployment Checklist

## Overview

This checklist guides you through deploying Kubernetes Cluster Autoscaler for automatic node scaling (1-8 nodes).

## Prerequisites

✅ ASG already configured with autoscaler tags  
✅ IAM permissions already in place  
✅ ArgoCD installed and running  
✅ Nodes auto-join cluster via golden AMI  

## Deployment Steps

### 1. Update Terraform Configuration

```bash
cd infrastructure/terraform/prod

# The max capacity has been updated to 8 nodes in:
# - modules/kubernetes/variables.tf (default = 8)
# - variables.tf (default = 8)

# Apply Terraform changes
terraform plan
terraform apply
```

**What this does:**
- Updates ASG max_size from 5 to 8 nodes
- Allows Cluster Autoscaler to scale up to 8 nodes

### 2. Push GitOps Configuration

The following files have been created in the gitops repository:

```
gitops/
├── apps/
│   └── cluster-autoscaler.yaml           # ArgoCD Application
└── base/
    └── cluster-autoscaler/
        ├── namespace.yaml
        ├── serviceaccount.yaml
        ├── rbac.yaml
        ├── deployment.yaml
        ├── service.yaml
        ├── podmonitor.yaml
        ├── kustomization.yaml
        └── README.md
```

**Actions needed:**

```bash
cd /home/ubuntu/kubestock-core

# Add all cluster-autoscaler files
git add gitops/base/cluster-autoscaler/
git add gitops/apps/cluster-autoscaler.yaml

# Also add updated Terraform files
git add infrastructure/terraform/prod/modules/kubernetes/variables.tf
git add infrastructure/terraform/prod/variables.tf

# Add documentation
git add infrastructure/docs/asg-ssm-setup-guide.md
git add infrastructure/docs/cluster-autoscaler-setup-guide.md

# Commit
git commit -m "Add Kubernetes Cluster Autoscaler for automatic node scaling (1-8 nodes)

- Add cluster-autoscaler manifests in gitops/base/cluster-autoscaler/
- Add ArgoCD Application for cluster-autoscaler
- Update ASG max capacity from 5 to 8 nodes in Terraform
- Add comprehensive cluster-autoscaler setup guide
- Update ASG documentation with autoscaler configuration

Features:
- Automatic scale-up when pods pending
- Automatic scale-down of idle nodes (50% threshold, 10min delay)
- Least-waste expander strategy
- Prometheus metrics for monitoring
- Fully managed via GitOps"

# Push to your repository
git push origin main  # or your current branch
```

### 3. Sync GitOps Repository

If you're using a separate GitOps repository (kubestock-gitops), copy the files:

```bash
# Copy cluster-autoscaler base manifests
cp -r gitops/base/cluster-autoscaler/ ../kubestock-gitops/base/

# Copy ArgoCD application
cp gitops/apps/cluster-autoscaler.yaml ../kubestock-gitops/apps/

# Commit and push to GitOps repo
cd ../kubestock-gitops
git add base/cluster-autoscaler/
git add apps/cluster-autoscaler.yaml
git commit -m "Add cluster-autoscaler for automatic node scaling"
git push origin main
```

### 4. Deploy Cluster Autoscaler

```bash
# Apply the ArgoCD Application
kubectl apply -f gitops/apps/cluster-autoscaler.yaml

# Or if using separate GitOps repo URL in the Application manifest,
# just sync via ArgoCD UI or CLI:
argocd app sync cluster-autoscaler
```

### 5. Verify Deployment

```bash
# Check ArgoCD Application
kubectl get application -n argocd cluster-autoscaler

# Check pod is running
kubectl get pods -n cluster-autoscaler

# View logs
kubectl logs -n cluster-autoscaler -l app=cluster-autoscaler -f

# Check current nodes
kubectl get nodes
```

**Expected output:**
```
NAME                                           STATUS   ROLES           AGE
ip-10-0-10-21.ap-south-1.compute.internal     Ready    control-plane   5d
ip-10-0-11-xxx.ap-south-1.compute.internal    Ready    <none>          2d
ip-10-0-12-xxx.ap-south-1.compute.internal    Ready    <none>          2d
```

## Testing

### Test Scale-Up

```bash
# Create resource-intensive workload
kubectl create deployment scale-test --image=nginx --replicas=20
kubectl set resources deployment scale-test --requests=cpu=500m,memory=512Mi

# Watch autoscaler logs
kubectl logs -n cluster-autoscaler -l app=cluster-autoscaler -f

# Watch nodes (new nodes should appear in 2-3 minutes)
watch kubectl get nodes
```

### Test Scale-Down

```bash
# Delete workload
kubectl delete deployment scale-test

# Watch autoscaler logs
kubectl logs -n cluster-autoscaler -l app=cluster-autoscaler -f

# Watch nodes (nodes should be removed after 10+ minutes)
watch kubectl get nodes
```

## Configuration

### Current Settings

| Parameter | Value |
|-----------|-------|
| Min nodes | 1 |
| Max nodes | 8 |
| Scale-down threshold | 50% utilization |
| Scale-down delay | 10 minutes after scale-up |
| Scale-down unneeded time | 10 minutes |
| Expander | least-waste |

### Adjusting Settings

Edit `gitops/base/cluster-autoscaler/deployment.yaml`:

```yaml
command:
  - ./cluster-autoscaler
  - --scale-down-unneeded-time=15m      # Change idle time
  - --scale-down-utilization-threshold=0.4  # Change threshold
  - --scale-down-delay-after-add=15m    # Change delay
```

Commit and push - ArgoCD will auto-sync.

## Monitoring

### View Metrics

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n cluster-autoscaler svc/cluster-autoscaler 8085:8085

# View metrics
curl http://localhost:8085/metrics | grep cluster_autoscaler
```

### Key Metrics

- `cluster_autoscaler_nodes_count` - Current node count
- `cluster_autoscaler_unschedulable_pods_count` - Pods waiting for scale-up
- `cluster_autoscaler_scaled_up_nodes_total` - Total scale-up events
- `cluster_autoscaler_scaled_down_nodes_total` - Total scale-down events

### Grafana Dashboards

Import Cluster Autoscaler dashboard (ID: 3831) in Grafana for visualization.

## Troubleshooting

### Check Status

```bash
# View autoscaler status
kubectl get cm cluster-autoscaler-status -n cluster-autoscaler -o yaml

# View logs
kubectl logs -n cluster-autoscaler -l app=cluster-autoscaler --tail=100

# Describe pod
kubectl describe pod -n cluster-autoscaler -l app=cluster-autoscaler
```

### Common Issues

**Scale-up not working:**
- Check if max capacity (8) is reached: `kubectl get nodes | wc -l`
- Verify IAM permissions on nodes
- Check pod resource requests are defined
- View autoscaler logs for errors

**Scale-down not working:**
- Check node utilization: `kubectl top nodes`
- Verify nodes are below 50% utilization
- Check for PodDisruptionBudgets blocking drains
- Ensure 10+ minutes have passed since last scale-up

See [cluster-autoscaler-setup-guide.md](infrastructure/docs/cluster-autoscaler-setup-guide.md) for detailed troubleshooting.

## Rollback

If issues occur, remove the autoscaler:

```bash
# Delete ArgoCD Application
kubectl delete application -n argocd cluster-autoscaler

# Delete namespace
kubectl delete namespace cluster-autoscaler

# Revert Terraform (optional)
cd infrastructure/terraform/prod
# Edit variables.tf to set max_size back to 5
terraform apply
```

## Documentation

- **Setup Guide**: [cluster-autoscaler-setup-guide.md](infrastructure/docs/cluster-autoscaler-setup-guide.md)
- **ASG Documentation**: [asg-ssm-setup-guide.md](infrastructure/docs/asg-ssm-setup-guide.md)
- **Base Manifests**: [gitops/base/cluster-autoscaler/](gitops/base/cluster-autoscaler/)
- **Official Docs**: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler

## Success Criteria

✅ ArgoCD Application synced successfully  
✅ Cluster Autoscaler pod running  
✅ No errors in autoscaler logs  
✅ Scale-up test creates new nodes  
✅ Scale-down test removes idle nodes  
✅ Prometheus metrics available  
