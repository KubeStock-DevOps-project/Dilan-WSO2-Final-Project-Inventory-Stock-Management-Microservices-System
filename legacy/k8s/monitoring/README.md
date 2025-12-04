# Monitoring Stack - Prometheus + Grafana

Complete monitoring solution for the Inventory Management System using Prometheus and Grafana.

## 📋 Overview

This monitoring stack provides:
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert routing and notifications
- **kube-state-metrics** - Kubernetes cluster metrics
- **ServiceMonitors** - Automatic service discovery

## 🚀 Quick Start

### Installation

```bash
cd k8s/monitoring
./install.sh
```

### Access Components

**Prometheus:**
```bash
kubectl port-forward svc/prometheus -n monitoring 9090:9090
# Open: http://localhost:9090
```

**Grafana:**
```bash
kubectl port-forward svc/grafana -n monitoring 3000:3000
# Open: http://localhost:3000
# Username: admin
# Password: admin123
```

**Alertmanager:**
```bash
kubectl port-forward svc/alertmanager -n monitoring 9093:9093
# Open: http://localhost:9093
```

## 📁 Components

### Prometheus Operator
- Manages Prometheus instances
- Handles ServiceMonitor CRDs
- Auto-discovery of services

### Prometheus Instance
- 15-day retention
- 10GB storage
- Scrapes all ServiceMonitors with label `team: inventory-system`

### Grafana
- Pre-configured Prometheus datasource
- Admin credentials: admin/admin123
- Ready for dashboard imports

### ServiceMonitors
Configured for all microservices:
- user-service
- inventory-service
- order-service
- product-catalog-service
- supplier-service
- kong-gateway

### Alert Rules
Pre-configured alerts:
- Pod down/crash looping
- High memory/CPU usage
- Node not ready
- Deployment replica mismatches
- HPA maxed out

## 📊 Importing Dashboards

### Recommended Dashboards

1. **Kubernetes Cluster Monitoring** (ID: 7249)
2. **Node Exporter Full** (ID: 1860)
3. **Kubernetes Pods** (ID: 6417)
4. **ArgoCD** (ID: 14584)

### Import Process
1. Access Grafana UI
2. Go to Dashboards → Import
3. Enter dashboard ID
4. Select Prometheus datasource
5. Click Import

## 🔔 Configuring Alerts

### Slack Integration

Edit `alertmanager/deployment.yaml`:

```yaml
receivers:
- name: 'critical'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts-critical'
```

Apply changes:
```bash
kubectl apply -f alertmanager/deployment.yaml
```

### Email Integration

```yaml
receivers:
- name: 'critical'
  email_configs:
  - to: 'team@example.com'
    from: 'alertmanager@example.com'
    smarthost: 'smtp.gmail.com:587'
    auth_username: 'your-email@gmail.com'
    auth_password: 'your-app-password'
```

## 📈 Metrics Available

### Application Metrics
- HTTP request rates
- Response times
- Error rates
- Custom business metrics

### Kubernetes Metrics
- CPU/Memory usage
- Pod restarts
- Network traffic
- Persistent volume usage

### Node Metrics
- CPU/Memory/Disk usage
- Network I/O
- System load

## 🔍 Useful Prometheus Queries

### Pod CPU Usage
```promql
rate(container_cpu_usage_seconds_total{namespace="inventory-system"}[5m])
```

### Pod Memory Usage
```promql
container_memory_usage_bytes{namespace="inventory-system"}
```

### HTTP Request Rate
```promql
rate(http_requests_total{namespace="inventory-system"}[5m])
```

### Pod Restart Count
```promql
kube_pod_container_status_restarts_total{namespace="inventory-system"}
```

## 🛠️ Troubleshooting

### Prometheus not scraping targets

Check ServiceMonitor labels:
```bash
kubectl get servicemonitors -n monitoring
kubectl describe servicemonitor <name> -n monitoring
```

Ensure services have correct labels:
```bash
kubectl get svc -n inventory-system --show-labels
```

### Grafana not showing data

1. Check Prometheus datasource:
   - Grafana UI → Configuration → Data Sources
   - Test connection

2. Verify Prometheus is collecting metrics:
   - Open Prometheus UI
   - Status → Targets
   - All targets should be "UP"

### High memory usage

Reduce retention period in `prometheus/prometheus.yaml`:
```yaml
spec:
  retention: 7d  # Changed from 15d
```

Or reduce storage:
```yaml
storage:
  volumeClaimTemplate:
    spec:
      resources:
        requests:
          storage: 5Gi  # Changed from 10Gi
```

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)

## ✅ Verification

```bash
# Check all monitoring pods
kubectl get pods -n monitoring

# Check ServiceMonitors
kubectl get servicemonitors -n monitoring

# Check Prometheus targets
kubectl port-forward svc/prometheus -n monitoring 9090:9090
# Visit: http://localhost:9090/targets

# Check Grafana
kubectl port-forward svc/grafana -n monitoring 3000:3000
# Visit: http://localhost:3000
```

---

**Status**: ✅ Production-ready monitoring stack
