#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Linkerd Service Mesh Installation                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if linkerd CLI is installed
if ! command -v linkerd &> /dev/null; then
    echo -e "${YELLOW}Linkerd CLI not found. Installing...${NC}"
    curl -fsL https://run.linkerd.io/install | sh
    export PATH=$PATH:$HOME/.linkerd2/bin
    echo -e "${GREEN}✓ Linkerd CLI installed${NC}"
else
    echo -e "${GREEN}✓ Linkerd CLI already installed${NC}"
fi

echo ""
echo -e "${YELLOW}[1/5] Pre-flight checks...${NC}"
linkerd check --pre || {
    echo -e "${RED}Pre-flight checks failed. Please resolve issues before continuing.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo ""

echo -e "${YELLOW}[2/5] Installing Linkerd CRDs...${NC}"
linkerd install --crds | kubectl apply -f -
echo -e "${GREEN}✓ Linkerd CRDs installed${NC}"
echo ""

echo -e "${YELLOW}[3/5] Installing Linkerd control plane...${NC}"
linkerd install | kubectl apply -f -
echo -e "${GREEN}✓ Linkerd control plane installed${NC}"
echo ""

echo -e "${YELLOW}[4/5] Waiting for Linkerd to be ready...${NC}"
linkerd check || {
    echo -e "${YELLOW}⚠ Linkerd is still initializing. Run 'linkerd check' to verify later.${NC}"
}
echo ""

echo -e "${YELLOW}[5/5] Installing Linkerd Viz (monitoring dashboard)...${NC}"
linkerd viz install | kubectl apply -f -
linkerd viz check || echo -e "${YELLOW}⚠ Viz is still initializing${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Installation Complete!                                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo -e "1. Inject Linkerd proxy into microservices:"
echo -e "   ${YELLOW}kubectl get deploy -n default -o name | xargs -I {} kubectl annotate {} linkerd.io/inject=enabled${NC}"
echo -e "   ${YELLOW}kubectl rollout restart deploy -n default${NC}"
echo ""
echo -e "2. Access Linkerd dashboard:"
echo -e "   ${YELLOW}linkerd viz dashboard &${NC}"
echo -e "   → Opens in browser automatically"
echo ""
echo -e "3. View service mesh status:"
echo -e "   ${YELLOW}linkerd viz stat deploy -n default${NC}"
echo ""
echo -e "4. Check mTLS status:"
echo -e "   ${YELLOW}linkerd viz edges deployment -n default${NC}"
echo ""
