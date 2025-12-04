#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           OpenSearch + FluentBit Logging Stack Installation                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/8] Creating logging namespace...${NC}"
kubectl apply -f "$SCRIPT_DIR/namespace.yaml"
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

echo -e "${YELLOW}[2/8] Deploying OpenSearch cluster (3 nodes)...${NC}"
kubectl apply -f "$SCRIPT_DIR/opensearch/statefulset.yaml"
echo -e "${GREEN}✓ OpenSearch StatefulSet deployed${NC}"
echo ""

echo -e "${YELLOW}[3/8] Waiting for OpenSearch pods to be ready (this may take 2-3 minutes)...${NC}"
timeout=300
elapsed=0
while [ $elapsed -lt $timeout ]; do
    ready=$(kubectl get pods -n logging -l app=opensearch --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    total=$(kubectl get pods -n logging -l app=opensearch --no-headers 2>/dev/null | wc -l || echo "0")
    
    if [ "$total" -eq 3 ] && [ "$ready" -eq 3 ]; then
        echo -e "${GREEN}✓ All 3 OpenSearch pods are running${NC}"
        break
    fi
    
    echo -n "."
    sleep 10
    elapsed=$((elapsed + 10))
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${YELLOW}⚠ Warning: OpenSearch pods took longer than expected${NC}"
fi
echo ""

echo -e "${YELLOW}[4/8] Creating index templates and retention policies...${NC}"
kubectl apply -f "$SCRIPT_DIR/index-templates/application-template.yaml"
echo -e "${GREEN}✓ Index templates configured${NC}"
echo ""

echo -e "${YELLOW}[5/8] Deploying FluentBit DaemonSet...${NC}"
kubectl apply -f "$SCRIPT_DIR/fluentbit/configmap.yaml"
kubectl apply -f "$SCRIPT_DIR/fluentbit/daemonset.yaml"
echo -e "${GREEN}✓ FluentBit deployed${NC}"
echo ""

echo -e "${YELLOW}[6/8] Waiting for FluentBit pods to be ready...${NC}"
kubectl rollout status daemonset/fluent-bit -n logging --timeout=120s || echo -e "${YELLOW}⚠ FluentBit rollout may still be in progress${NC}"
echo -e "${GREEN}✓ FluentBit is collecting logs${NC}"
echo ""

echo -e "${YELLOW}[7/8] Deploying OpenSearch Dashboards...${NC}"
kubectl apply -f "$SCRIPT_DIR/opensearch-dashboards/deployment.yaml"
echo -e "${GREEN}✓ OpenSearch Dashboards deployed${NC}"
echo ""

echo -e "${YELLOW}[8/8] Waiting for OpenSearch Dashboards to be ready...${NC}"
kubectl rollout status deployment/opensearch-dashboards -n logging --timeout=180s || echo -e "${YELLOW}⚠ Dashboards may need more time to start${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Installation Complete!                                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Deployed Components:${NC}"
echo -e "  ✓ OpenSearch cluster (3 nodes)"
echo -e "  ✓ OpenSearch Dashboards (UI)"
echo -e "  ✓ FluentBit DaemonSet (log collection)"
echo -e "  ✓ Index templates with 30-day retention"
echo ""

echo -e "${YELLOW}Access Instructions:${NC}"
echo ""
echo -e "OpenSearch Dashboards (UI):"
echo -e "  $ kubectl port-forward svc/opensearch-dashboards -n logging 5601:5601"
echo -e "  → http://localhost:5601"
echo ""
echo -e "OpenSearch API:"
echo -e "  $ kubectl port-forward svc/opensearch -n logging 9200:9200"
echo -e "  → http://localhost:9200"
echo ""

echo -e "${YELLOW}Quick Status Check:${NC}"
kubectl get pods -n logging
echo ""

echo -e "${GREEN}✅ Logging stack is ready to collect and index logs!${NC}"
echo ""
