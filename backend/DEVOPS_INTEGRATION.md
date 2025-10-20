# DevOps Integration Guide

## Overview
This guide explains how to integrate the Inventory & Stock Management System with DevOps tools including Docker, Kubernetes, ArgoCD, Prometheus, and OpenSearch.

## 🐳 Docker Integration

### Build All Images
```bash
# Build all services
docker-compose build

# Build individual service
docker build -t user-service:v1.0.0 ./services/user-service
```

### Tag and Push to Registry
```bash
# Docker Hub
docker tag user-service:v1.0.0 yourusername/user-service:v1.0.0
docker push yourusername/user-service:v1.0.0

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag user-service:v1.0.0 <account-id>.dkr.ecr.us-east-1.amazonaws.com/user-service:v1.0.0
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/user-service:v1.0.0
```

## ☸️ Kubernetes Deployment

### 1. Create Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ims-system
```

### 2. ConfigMaps and Secrets
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ims-config
  namespace: ims-system
data:
  POSTGRES_HOST: "postgres-service"
  POSTGRES_PORT: "5432"
  NODE_ENV: "production"
---
apiVersion: v1
kind: Secret
metadata:
  name: ims-secrets
  namespace: ims-system
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  POSTGRES_PASSWORD: <base64-encoded-password>
```

### 3. PostgreSQL Deployment
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: ims-system
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ims-secrets
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ims-system
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

### 4. Service Deployments
```yaml
# k8s/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: ims-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: yourusername/user-service:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: ims-config
              key: POSTGRES_HOST
        - name: DB_NAME
          value: "user_service_db"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: ims-secrets
              key: JWT_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: ims-system
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### 5. Deploy All Services
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/product-catalog-service.yaml
kubectl apply -f k8s/inventory-service.yaml
kubectl apply -f k8s/supplier-service.yaml
kubectl apply -f k8s/order-service.yaml
```

## 🔄 ArgoCD GitOps

### 1. Install ArgoCD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Create Application Manifest
```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ims-system
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ims-system.git
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: ims-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

### 3. Deploy via ArgoCD
```bash
kubectl apply -f argocd/application.yaml
argocd app sync ims-system
```

## 📊 Prometheus Monitoring

### 1. Add Prometheus Client to Services
```javascript
// Add to each service's package.json
"prom-client": "^15.0.0"

// In server.js
const promClient = require('prom-client');
const register = new promClient.Registry();

// Collect default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

register.registerMetric(httpRequestDuration);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2. ServiceMonitor for Prometheus
```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ims-services
  namespace: ims-system
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### 3. Prometheus Alerts
```yaml
# prometheus/alerts.yaml
groups:
- name: ims-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
  
  - alert: ServiceDown
    expr: up{job="ims-services"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.instance }} is down"
```

## 🔍 OpenSearch Logging

### 1. Add Winston OpenSearch Transport
```javascript
// Add to each service
const { Client } = require('@opensearch-project/opensearch');
const winstonOpenSearch = require('winston-opensearch');

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.OPENSEARCH_URL || 'https://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
  },
  index: 'ims-logs',
};

logger.add(new winstonOpenSearch(esTransportOpts));
```

### 2. Deploy OpenSearch on Kubernetes
```yaml
# k8s/opensearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: opensearch
  namespace: ims-system
spec:
  serviceName: opensearch
  replicas: 1
  selector:
    matchLabels:
      app: opensearch
  template:
    metadata:
      labels:
        app: opensearch
    spec:
      containers:
      - name: opensearch
        image: opensearchproject/opensearch:2.11.0
        ports:
        - containerPort: 9200
        - containerPort: 9600
        env:
        - name: discovery.type
          value: "single-node"
        - name: OPENSEARCH_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
```

### 3. OpenSearch Dashboards
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opensearch-dashboards
  namespace: ims-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opensearch-dashboards
  template:
    metadata:
      labels:
        app: opensearch-dashboards
    spec:
      containers:
      - name: opensearch-dashboards
        image: opensearchproject/opensearch-dashboards:2.11.0
        ports:
        - containerPort: 5601
        env:
        - name: OPENSEARCH_HOSTS
          value: '["https://opensearch:9200"]'
```

## 🔄 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd services/user-service && npm ci
      
      - name: Run tests
        run: |
          cd services/user-service && npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/user-service:$IMAGE_TAG ./services/user-service
          docker push $ECR_REGISTRY/user-service:$IMAGE_TAG
      
      - name: Update Kubernetes manifests
        run: |
          sed -i 's|image:.*|image: ${{ steps.login-ecr.outputs.registry }}/user-service:${{ github.sha }}|' k8s/user-service.yaml
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add k8s/
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

## 📝 Deployment Checklist

- [ ] All Docker images built and pushed to registry
- [ ] Kubernetes cluster provisioned
- [ ] Namespaces created
- [ ] ConfigMaps and Secrets configured
- [ ] PostgreSQL StatefulSet deployed
- [ ] All microservices deployed
- [ ] Services exposed via LoadBalancer/Ingress
- [ ] ArgoCD installed and configured
- [ ] Prometheus monitoring setup
- [ ] OpenSearch logging configured
- [ ] CI/CD pipeline configured
- [ ] Health checks verified
- [ ] Load testing completed
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

## 🔐 Security Considerations

1. Use Kubernetes Secrets for sensitive data
2. Enable RBAC in Kubernetes
3. Implement Network Policies
4. Use TLS/SSL for all communications
5. Regular security scanning of images
6. Implement pod security policies
7. Use service mesh (Istio/Linkerd) for mTLS

## 🎯 Next Steps

1. Implement message queue (RabbitMQ/Kafka) for async communication
2. Add API Gateway (Kong/Ambassador)
3. Implement service mesh (Istio)
4. Add distributed tracing (Jaeger)
5. Implement rate limiting and circuit breakers
6. Add caching layer (Redis)
7. Implement blue-green deployments
8. Setup disaster recovery procedures
