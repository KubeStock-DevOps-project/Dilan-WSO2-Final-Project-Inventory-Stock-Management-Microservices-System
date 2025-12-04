# OpenSearch + FluentBit Logging Stack

Centralized logging solution for Kubernetes using OpenSearch and FluentBit.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Pod Logs   │───▶│  FluentBit   │───▶│  OpenSearch  │    │
│  │  /var/log    │    │  DaemonSet   │    │   Cluster    │    │
│  └──────────────┘    └──────────────┘    └──────┬───────┘    │
│                                                   │             │
│                                           ┌───────▼───────┐    │
│                                           │  OpenSearch   │    │
│                                           │  Dashboards   │    │
│                                           └───────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### OpenSearch Cluster
- **Replicas**: 3 nodes (high availability)
- **Storage**: 10GB per node (persistent volumes)
- **Memory**: 1GB heap per node
- **Ports**: 
  - 9200 (HTTP API)
  - 9300 (Inter-node transport)
  - NodePort 30920 (external access)

### FluentBit DaemonSet
- **Deployment**: One pod per node
- **Sources**: 
  - Container logs from `/var/log/containers/*.log`
  - System logs from `kubelet.service`
- **Processing**:
  - Kubernetes metadata enrichment
  - JSON parsing
  - Multi-line log handling
  - Log filtering and routing

### OpenSearch Dashboards
- **UI**: Web interface for log search and visualization
- **Port**: 5601 (NodePort 30561)
- **Features**:
  - Log search with Lucene query syntax
  - Dashboard creation
  - Index pattern management
  - Data visualization

### Index Management
- **Application Logs**: `application-logs-YYYY.MM.DD`
- **System Logs**: `system-logs-YYYY.MM.DD`
- **Retention**: 30 days automatic deletion
- **Rollover**: Daily or when size exceeds 5GB

## Installation

```bash
cd k8s/logging
chmod +x install.sh
./install.sh
```

## Access

### OpenSearch Dashboards (Primary UI)
```bash
kubectl port-forward svc/opensearch-dashboards -n logging 5601:5601
```
Access: http://localhost:5601

### OpenSearch API
```bash
kubectl port-forward svc/opensearch -n logging 9200:9200
```
Access: http://localhost:9200

## Usage

### 1. Create Index Pattern (First Time)

1. Open OpenSearch Dashboards: http://localhost:5601
2. Navigate to: **Management → Stack Management → Index Patterns**
3. Click **Create index pattern**
4. Enter pattern: `application-logs-*`
5. Select time field: `@timestamp`
6. Click **Create index pattern**
7. Repeat for `system-logs-*`

### 2. Search Logs

**Navigate to**: Discover

**Example Queries**:

```
# All logs from a specific pod
k8s_pod_name: "user-service-*"

# Error logs only
log: *error* OR log: *ERROR*

# Logs from specific namespace
k8s_namespace_name: "default"

# Logs from specific container
k8s_container_name: "inventory-service"

# Time range logs (last 15 minutes)
@timestamp:[now-15m TO now]

# Combined query
k8s_namespace_name: "default" AND log: *error*
```

### 3. Create Dashboard

1. Navigate to: **Dashboard → Create dashboard**
2. Add visualizations:
   - Log count over time (Line chart)
   - Top pods by log volume (Pie chart)
   - Error rate trends (Area chart)
   - Namespace distribution (Bar chart)

### 4. Check Cluster Health

```bash
# Check OpenSearch cluster health
curl -X GET "http://localhost:9200/_cluster/health?pretty"

# List all indices
curl -X GET "http://localhost:9200/_cat/indices?v"

# Check index stats
curl -X GET "http://localhost:9200/application-logs-*/_stats?pretty"
```

## Verification

### Check Pod Status
```bash
kubectl get pods -n logging
```

Expected output:
```
NAME                       READY   STATUS    RESTARTS   AGE
opensearch-0               1/1     Running   0          5m
opensearch-1               1/1     Running   0          4m
opensearch-2               1/1     Running   0          3m
opensearch-dashboards-xxx  1/1     Running   0          5m
fluent-bit-xxx             1/1     Running   0          5m
fluent-bit-yyy             1/1     Running   0          5m
```

### Check FluentBit Logs
```bash
kubectl logs -n logging daemonset/fluent-bit --tail=50
```

Should see messages like:
```
[output:es] worker #0 sent 100 records
[output:es] buffer_size=4.2M
```

### Verify Log Ingestion
```bash
# Check if indices are being created
curl -X GET "http://localhost:9200/_cat/indices?v" | grep application-logs

# Count logs in index
curl -X GET "http://localhost:9200/application-logs-*/_count"
```

## Troubleshooting

### OpenSearch Pods Not Starting

**Issue**: Pods stuck in `CrashLoopBackOff`

**Solution**:
```bash
# Check logs
kubectl logs -n logging opensearch-0

# Common fix: Increase vm.max_map_count on host
sudo sysctl -w vm.max_map_count=262144
```

### FluentBit Not Sending Logs

**Issue**: No logs appearing in OpenSearch

**Solution**:
```bash
# Check FluentBit logs
kubectl logs -n logging -l app=fluent-bit --tail=100

# Verify OpenSearch connectivity
kubectl exec -n logging -it fluent-bit-xxx -- \
  curl -v http://opensearch.logging.svc.cluster.local:9200

# Check if indices exist
curl http://localhost:9200/_cat/indices?v
```

### OpenSearch Dashboards Connection Error

**Issue**: "Unable to connect to OpenSearch"

**Solution**:
```bash
# Check if OpenSearch is accessible
kubectl exec -n logging opensearch-dashboards-xxx -- \
  curl -v http://opensearch:9200

# Restart dashboards
kubectl rollout restart deployment/opensearch-dashboards -n logging
```

### Disk Space Issues

**Issue**: Cluster status RED, disk watermark exceeded

**Solution**:
```bash
# Check disk usage
curl http://localhost:9200/_cat/allocation?v

# Delete old indices manually
curl -X DELETE "http://localhost:9200/application-logs-2025.10.01"

# Increase PVC size (requires storage class support)
kubectl patch pvc data-opensearch-0 -n logging \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

### No Logs for Specific Pods

**Issue**: Some pod logs not appearing

**Solution**:
```bash
# Verify FluentBit is running on all nodes
kubectl get pods -n logging -l app=fluent-bit -o wide

# Check if pod logs exist on host
kubectl exec -n logging fluent-bit-xxx -- ls -la /var/log/containers/ | grep <pod-name>

# Verify Kubernetes filter is working
kubectl logs -n logging fluent-bit-xxx | grep kubernetes
```

## Maintenance

### Manual Index Deletion
```bash
# Delete indices older than 30 days
curl -X DELETE "http://localhost:9200/application-logs-2025.10.*"
```

### Backup Index Data
```bash
# Create snapshot repository
curl -X PUT "http://localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/backup"
  }
}'

# Take snapshot
curl -X PUT "http://localhost:9200/_snapshot/backup/snapshot_1?wait_for_completion=true"
```

### Scale OpenSearch Cluster
```bash
# Increase to 5 nodes
kubectl scale statefulset opensearch -n logging --replicas=5

# Decrease to 2 nodes
kubectl scale statefulset opensearch -n logging --replicas=2
```

## Performance Tuning

### Increase FluentBit Memory
```yaml
# Edit fluentbit/daemonset.yaml
resources:
  limits:
    memory: 1Gi  # Increase from 512Mi
```

### Adjust OpenSearch Heap
```yaml
# Edit opensearch/statefulset.yaml
env:
  - name: OPENSEARCH_JAVA_OPTS
    value: "-Xms1g -Xmx1g"  # Increase from 512m
```

### Optimize Index Settings
```bash
# Reduce replica count for testing
curl -X PUT "http://localhost:9200/application-logs-*/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "number_of_replicas": 0
  }
}'
```

## Security Considerations

**Current Configuration**: Security plugin disabled for simplicity

**Production Recommendations**:
1. Enable OpenSearch Security plugin
2. Configure TLS/SSL for API
3. Set up authentication (basic auth, LDAP, SAML)
4. Implement role-based access control
5. Use NetworkPolicies to restrict access
6. Enable audit logging

## Metrics & Monitoring

FluentBit exposes Prometheus metrics on port 2020:

```bash
kubectl port-forward -n logging svc/fluent-bit 2020:2020
curl http://localhost:2020/api/v1/metrics/prometheus
```

Key metrics:
- `fluentbit_input_records_total`: Total records processed
- `fluentbit_output_errors_total`: Output errors
- `fluentbit_output_retries_total`: Retry attempts

## Assignment Requirements Satisfied

✅ **Implemented K8S infrastructure log management using OpenSearch stack**
- OpenSearch cluster for log storage and indexing
- FluentBit for log collection from all pods
- OpenSearch Dashboards for log visualization
- 30-day retention policy
- Application and system log separation

## Resources

- OpenSearch Documentation: https://opensearch.org/docs/latest/
- FluentBit Documentation: https://docs.fluentbit.io/
- Kubernetes Logging: https://kubernetes.io/docs/concepts/cluster-administration/logging/
