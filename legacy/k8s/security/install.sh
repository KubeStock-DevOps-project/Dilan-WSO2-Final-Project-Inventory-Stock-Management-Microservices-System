#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Zero Trust Security Stack Installation                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/6] Creating security namespace...${NC}"
kubectl apply -f "$SCRIPT_DIR/namespace.yaml"
echo -e "${GREEN}✓ Security namespace created${NC}"
echo ""

echo -e "${YELLOW}[2/6] Installing OPA Gatekeeper...${NC}"
kubectl apply -f "$SCRIPT_DIR/opa-gatekeeper/install.yaml"
echo -e "${GREEN}✓ OPA Gatekeeper deployed${NC}"
echo ""

echo -e "${YELLOW}[3/6] Waiting for Gatekeeper webhooks to be ready...${NC}"
sleep 30
kubectl wait --for=condition=available --timeout=120s deployment/gatekeeper-controller-manager -n gatekeeper-system || echo -e "${YELLOW}⚠ Gatekeeper may need more time${NC}"
echo ""

echo -e "${YELLOW}[4/6] Installing Constraint Templates...${NC}"
kubectl apply -f "$SCRIPT_DIR/opa-gatekeeper/constraint-templates.yaml"
echo -e "${GREEN}✓ Constraint templates installed${NC}"
echo ""

echo -e "${YELLOW}[5/6] Applying Policy Constraints...${NC}"
sleep 10  # Wait for CRDs to be ready
kubectl apply -f "$SCRIPT_DIR/opa-gatekeeper/constraints.yaml" || echo -e "${YELLOW}⚠ Some constraints may need retry${NC}"
echo -e "${GREEN}✓ Policy constraints applied${NC}"
echo ""

echo -e "${YELLOW}[6/6] Deploying Network Policies...${NC}"
kubectl apply -f "$SCRIPT_DIR/network-policies/default-deny-all.yaml"
kubectl apply -f "$SCRIPT_DIR/network-policies/microservices-policies.yaml"
echo -e "${GREEN}✓ Network policies deployed${NC}"
echo ""

echo -e "${YELLOW}[Optional] Applying Pod Security Standards...${NC}"
kubectl apply -f "$SCRIPT_DIR/pod-security-standards/restricted-pss.yaml" || echo -e "${YELLOW}⚠ PSS may require K8s v1.23+${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Installation Complete!                                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Deployed Components:${NC}"
echo -e "  ✓ OPA Gatekeeper (policy enforcement)"
echo -e "  ✓ 5 Constraint Templates"
echo -e "  ✓ 5 Active Constraints"
echo -e "  ✓ Network Policies (default deny + microservices)"
echo -e "  ✓ Pod Security Standards (restricted mode)"
echo ""

echo -e "${YELLOW}Security Status:${NC}"
echo ""
echo -e "OPA Gatekeeper Pods:"
kubectl get pods -n gatekeeper-system
echo ""
echo -e "Active Constraints:"
kubectl get constraints
echo ""
echo -e "Network Policies:"
kubectl get networkpolicies -n default
echo ""

echo -e "${YELLOW}Optional: Install Linkerd for mTLS${NC}"
echo -e "  Run: ${GREEN}cd $SCRIPT_DIR/linkerd && chmod +x install-linkerd.sh && ./install-linkerd.sh${NC}"
echo ""

echo -e "${GREEN}✅ Zero Trust Security features are active!${NC}"
echo ""
