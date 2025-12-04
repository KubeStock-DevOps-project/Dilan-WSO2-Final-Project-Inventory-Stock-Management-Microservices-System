#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       Kubernetes Deployment on AWS Infrastructure             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd terraform

# Get Terraform outputs
echo -e "${BLUE}Getting infrastructure details...${NC}"
MASTER_IP=$(terraform output -raw master_public_ip 2>/dev/null)
WORKER_IPS=$(terraform output -json worker_public_ips 2>/dev/null)
LB_DNS=$(terraform output -raw lb_dns_name 2>/dev/null || echo "N/A")
VPC_ID=$(terraform output -raw vpc_id 2>/dev/null)

if [ -z "$MASTER_IP" ]; then
    echo -e "${RED}✗ Cannot get Terraform outputs. Did you run 'terraform apply'?${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Infrastructure details retrieved${NC}"
echo "  Master IP: $MASTER_IP"
echo "  Load Balancer: $LB_DNS"
echo "  VPC ID: $VPC_ID"
echo ""

# Extract worker IPs
WORKER_1=$(echo "$WORKER_IPS" | jq -r '.[0]')
WORKER_2=$(echo "$WORKER_IPS" | jq -r '.[1]')

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 1: Create Ansible Inventory${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd ../ansible

# Create inventory directory if it doesn't exist
mkdir -p inventory

# Create AWS inventory
cat > inventory/aws-hosts.yml <<EOF
all:
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: ~/.ssh/inventory-system-key
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
  
  children:
    k8s_cluster:
      children:
        master_nodes:
          hosts:
            master-1:
              ansible_host: $MASTER_IP
              k8s_role: master
        
        worker_nodes:
          hosts:
            worker-1:
              ansible_host: $WORKER_1
              k8s_role: worker
            worker-2:
              ansible_host: $WORKER_2
              k8s_role: worker
EOF

echo -e "${GREEN}✓ Ansible inventory created${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 2: Test SSH Connectivity${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Waiting 30 seconds for instances to be ready..."
sleep 30

echo "Testing connectivity to master node..."
if ansible master-1 -i inventory/aws-hosts.yml -m ping; then
    echo -e "${GREEN}✓ Master node reachable${NC}"
else
    echo -e "${RED}✗ Cannot reach master node${NC}"
    echo "Troubleshooting tips:"
    echo "1. Check security group allows SSH from your IP"
    echo "2. Verify key permissions: chmod 600 ~/.ssh/inventory-system-key"
    echo "3. Try manual SSH: ssh -i ~/.ssh/inventory-system-key ubuntu@$MASTER_IP"
    exit 1
fi

echo ""
echo "Testing connectivity to worker nodes..."
ansible worker_nodes -i inventory/aws-hosts.yml -m ping
echo -e "${GREEN}✓ All nodes reachable${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 3: Deploy k3s Cluster${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Installing k3s on master and worker nodes..."
echo "This will take 5-10 minutes..."
echo ""

ansible-playbook -i inventory/aws-hosts.yml playbooks/k3s/install.yml

echo ""
echo -e "${GREEN}✓ k3s cluster deployed${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 4: Configure kubectl${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Fetching kubeconfig from master node..."
ssh -i ~/.ssh/inventory-system-key ubuntu@$MASTER_IP "sudo cat /etc/rancher/k3s/k3s.yaml" | \
    sed "s/127.0.0.1/$MASTER_IP/g" > ~/.kube/config-aws

export KUBECONFIG=~/.kube/config-aws

echo -e "${GREEN}✓ kubeconfig configured${NC}"
echo ""

echo "Verifying cluster access..."
kubectl get nodes
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 5: Deploy Applications${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd ../../k8s

echo "Creating namespace..."
kubectl create namespace inventory-system --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "Deploying base resources..."
kubectl apply -f base/

echo ""
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n inventory-system

echo ""
echo -e "${GREEN}✓ Applications deployed${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 6: Deploy Monitoring Stack${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd monitoring
./install.sh

echo ""
echo -e "${GREEN}✓ Monitoring deployed${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 7: Deploy Logging Stack${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd ../logging
./install.sh

echo ""
echo -e "${GREEN}✓ Logging deployed${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 8: Deploy Security Stack${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd ../security
./install.sh

echo ""
echo -e "${GREEN}✓ Security deployed${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Complete! 🎉${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo "Cluster Information:"
echo "  Master IP: $MASTER_IP"
echo "  Load Balancer: $LB_DNS"
echo ""
echo "Access Services:"
echo "  1. Grafana: kubectl port-forward svc/grafana -n monitoring 3000:3000"
echo "  2. OpenSearch: kubectl port-forward svc/opensearch-dashboards -n logging 5601:5601"
echo "  3. ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo ""
echo "Verify Deployment:"
echo "  kubectl get pods --all-namespaces"
echo "  kubectl get nodes -o wide"
echo ""
echo "SSH to Master:"
echo "  ssh -i ~/.ssh/inventory-system-key ubuntu@$MASTER_IP"
echo ""
echo -e "${GREEN}Happy Kubernetes! 🚀${NC}"
