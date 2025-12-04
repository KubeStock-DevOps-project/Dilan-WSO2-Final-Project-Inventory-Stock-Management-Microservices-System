#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    AWS Infrastructure Deployment Script                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not installed${NC}"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform not installed${NC}"
    exit 1
fi

if ! command -v ansible &> /dev/null; then
    echo -e "${RED}Error: Ansible not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Get user confirmation
echo -e "${YELLOW}This will create AWS resources that will incur costs (~\$150/month)${NC}"
echo -e "${YELLOW}Resources to be created:${NC}"
echo "  - 3 EC2 t3.medium instances"
echo "  - 1 VPC with 2 subnets"
echo "  - 1 Application Load Balancer"
echo "  - 3 EBS volumes (30GB each)"
echo "  - Security groups and IAM roles"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}[2/8] Configuring SSH key pair...${NC}"

# Check if SSH key exists
if [ ! -f ~/.ssh/aws-k8s-key ]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/aws-k8s-key -N ""
    echo -e "${GREEN}✓ SSH key generated${NC}"
else
    echo -e "${GREEN}✓ SSH key already exists${NC}"
fi

# Import key to AWS (if not exists)
if ! aws ec2 describe-key-pairs --key-names k8s-cluster-key --region us-east-1 &> /dev/null; then
    echo "Importing key pair to AWS..."
    aws ec2 import-key-pair \
      --key-name k8s-cluster-key \
      --public-key-material fileb://~/.ssh/aws-k8s-key.pub \
      --region us-east-1
    echo -e "${GREEN}✓ Key pair imported to AWS${NC}"
else
    echo -e "${GREEN}✓ Key pair already exists in AWS${NC}"
fi

echo ""
echo -e "${YELLOW}[3/8] Getting your public IP for security group...${NC}"
ADMIN_IP=$(curl -s ifconfig.me)
echo "Your IP: ${ADMIN_IP}"

echo ""
echo -e "${YELLOW}[4/8] Preparing Terraform configuration...${NC}"

cd terraform

# Create terraform.tfvars if it doesn't exist
if [ ! -f terraform.tfvars ]; then
    cat > terraform.tfvars <<EOF
# AWS Configuration
aws_region = "us-east-1"
environment = "production"
project_name = "inventory-system"

# EC2 Configuration
master_instance_type = "t3.medium"
worker_instance_type = "t3.medium"
worker_count = 2

# SSH Key
key_pair_name = "k8s-cluster-key"

# Networking
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
availability_zones = ["us-east-1a", "us-east-1b"]

# Admin access
admin_ip = "${ADMIN_IP}/32"

# Tags
tags = {
  Project = "Inventory-Management"
  Environment = "Production"
  ManagedBy = "Terraform"
}
EOF
    echo -e "${GREEN}✓ terraform.tfvars created${NC}"
else
    echo -e "${GREEN}✓ terraform.tfvars already exists${NC}"
fi

echo ""
echo -e "${YELLOW}[5/8] Initializing Terraform...${NC}"
terraform init

echo ""
echo -e "${YELLOW}[6/8] Planning infrastructure...${NC}"
terraform plan -out=tfplan

echo ""
read -p "Review the plan above. Apply? (yes/no): " APPLY_CONFIRM

if [ "$APPLY_CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}[7/8] Deploying infrastructure to AWS...${NC}"
echo -e "${BLUE}This will take 5-10 minutes...${NC}"
terraform apply tfplan

echo ""
echo -e "${GREEN}✓ Infrastructure deployed successfully!${NC}"

# Get outputs
MASTER_IP=$(terraform output -raw master_public_ip)
WORKER_IPS=$(terraform output -json worker_public_ips | jq -r '.[]')
LB_DNS=$(terraform output -raw load_balancer_dns)

echo ""
echo -e "${YELLOW}[8/8] Configuring Ansible inventory...${NC}"

cd ../ansible

# Create inventory directory if not exists
mkdir -p inventory

# Get worker IPs as array
WORKER_ARRAY=($(terraform -chdir=../terraform output -json worker_public_ips | jq -r '.[]'))

# Create inventory file
cat > inventory/aws-production.ini <<EOF
[k8s_master]
master ansible_host=${MASTER_IP} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/aws-k8s-key

[k8s_workers]
$(for i in "${!WORKER_ARRAY[@]}"; do
    echo "worker$((i+1)) ansible_host=${WORKER_ARRAY[$i]} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/aws-k8s-key"
done)

[k8s_cluster:children]
k8s_master
k8s_workers

[k8s_cluster:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
k8s_version=v1.28
cluster_name=inventory-system-prod
cluster_cidr=10.244.0.0/16
service_cidr=10.96.0.0/12
EOF

echo -e "${GREEN}✓ Ansible inventory created${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Infrastructure Deployment Complete!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📊 Resource Summary:${NC}"
echo "  Master Node: ${MASTER_IP}"
echo "  Worker Nodes:"
for i in "${!WORKER_ARRAY[@]}"; do
    echo "    Worker $((i+1)): ${WORKER_ARRAY[$i]}"
done
echo "  Load Balancer: ${LB_DNS}"
echo ""

echo -e "${YELLOW}🔑 SSH Access:${NC}"
echo "  ssh -i ~/.ssh/aws-k8s-key ubuntu@${MASTER_IP}"
echo ""

echo -e "${YELLOW}⏭️  Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Install k3s cluster:${NC}"
echo "   cd ansible"
echo "   ansible all -i inventory/aws-production.ini -m ping"
echo "   ansible-playbook -i inventory/aws-production.ini playbooks/k3s-install.yml"
echo ""

echo -e "${BLUE}2. Configure kubectl:${NC}"
echo "   scp -i ~/.ssh/aws-k8s-key ubuntu@${MASTER_IP}:~/.kube/config ~/.kube/config-aws"
echo "   sed -i 's/127.0.0.1/${MASTER_IP}/g' ~/.kube/config-aws"
echo "   export KUBECONFIG=~/.kube/config-aws"
echo "   kubectl get nodes"
echo ""

echo -e "${BLUE}3. Deploy applications:${NC}"
echo "   kubectl apply -k ../../k8s/base/"
echo "   cd ../../k8s/argocd && ./install.sh"
echo "   cd ../monitoring && ./install.sh"
echo "   cd ../logging && ./install.sh"
echo "   cd ../security && ./install.sh"
echo ""

echo -e "${BLUE}4. Access application:${NC}"
echo "   http://${LB_DNS}"
echo ""

echo -e "${YELLOW}💰 Estimated Monthly Cost: ~\$150${NC}"
echo ""

echo -e "${RED}⚠️  Remember to destroy resources when done to avoid charges:${NC}"
echo "   cd terraform && terraform destroy"
echo ""
