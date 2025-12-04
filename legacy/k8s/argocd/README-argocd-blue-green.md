# ArgoCD Blue/Green setup

Files added:

- `argocd-project-inventory.yaml` — AppProject for the inventory apps
- `applications/inventory-blue.yaml` — ArgoCD Application pointing to `k8s/overlays/blue`
- `applications/inventory-green.yaml` — ArgoCD Application pointing to `k8s/overlays/green`
- `k8s/overlays/blue/kustomization.yaml` — Kustomize overlay that applies base services with `track: blue`
- `k8s/overlays/green/kustomization.yaml` — Kustomize overlay that applies base services with `track: green`

Quick use:

1. Ensure the `inventory` namespace exists: `kubectl create ns inventory`
2. Apply the ArgoCD project and application manifests to your ArgoCD namespace (commonly `argocd`):

```powershell
kubectl apply -f k8s/argocd/argocd-project-inventory.yaml -n argocd
kubectl apply -f k8s/argocd/applications/inventory-blue.yaml -n argocd
kubectl apply -f k8s/argocd/applications/inventory-green.yaml -n argocd
```

3. ArgoCD will sync both overlays; both blue and green deployments will be created with label `track: blue` or `track: green` respectively.

Promoting green to live (options):

- Option A (Service selector swap): update your Service selector to target `track: green` instead of `track: blue`.
- Option B (Ingress/Traffic routing): update your Ingress / gateway to route traffic to the green endpoints.
- Option C (Argo Rollouts): convert deployments to an Argo Rollouts `BlueGreen` strategy (requires Argo Rollouts controller).

If you want, I can add a sample Service manifest and a small script to switch the selector automatically.
