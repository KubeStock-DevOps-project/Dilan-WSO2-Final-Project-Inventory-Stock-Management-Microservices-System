#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       AWS Deployment Setup for Inventory System              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    echo "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    echo -e "${GREEN}✓ AWS CLI installed${NC}"
fi

echo -e "${BLUE}AWS CLI Version:${NC}"
aws --version
echo ""

# Configure AWS credentials
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 1: Configure AWS Credentials${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Please enter your AWS credentials:"
echo "(You can find these in AWS Console → Security Credentials)"
echo ""

# Check if already configured
if aws sts get-caller-identity &> /dev/null; then
    echo -e "${GREEN}✓ AWS credentials are already configured${NC}"
    aws sts get-caller-identity
    echo ""
    read -p "Do you want to reconfigure? (y/N): " reconfigure
    if [[ ! $reconfigure =~ ^[Yy]$ ]]; then
        echo "Using existing credentials"
    else
        aws configure
    fi
else
    aws configure
fi

echo ""
echo -e "${GREEN}✓ AWS credentials configured${NC}"
aws sts get-caller-identity
echo ""

# Create SSH key pair
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 2: Create SSH Key Pair${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

KEY_NAME="inventory-system-key"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

if [ -f "$KEY_PATH" ]; then
    echo -e "${GREEN}✓ SSH key already exists at $KEY_PATH${NC}"
else
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$KEY_PATH" -N "" -C "inventory-system-aws"
    chmod 600 "$KEY_PATH"
    echo -e "${GREEN}✓ SSH key generated${NC}"
fi

# Import key to AWS
echo "Checking if key exists in AWS..."
AWS_REGION=$(aws configure get region)
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${GREEN}✓ Key pair already exists in AWS${NC}"
else
    echo "Importing key pair to AWS..."
    aws ec2 import-key-pair \
        --key-name "$KEY_NAME" \
        --public-key-material fileb://"$KEY_PATH.pub" \
        --region "$AWS_REGION"
    echo -e "${GREEN}✓ Key pair imported to AWS${NC}"
fi

echo ""

# Initialize Terraform
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 3: Initialize Terraform${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cd terraform

echo "Initializing Terraform..."
terraform init

echo ""
echo "Validating Terraform configuration..."
terraform validate

echo ""
echo "Formatting Terraform files..."
terraform fmt -recursive

echo ""
echo -e "${GREEN}✓ Terraform initialized and validated${NC}"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Step 4: Review Terraform Plan${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Creating Terraform plan..."
terraform plan -out=tfplan

echo ""
echo -e "${GREEN}✓ Terraform plan created${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Review the Terraform plan above"
echo "2. Run: terraform apply tfplan"
echo "3. Wait 5-10 minutes for infrastructure creation"
echo "4. Run: ./aws-deploy-k8s.sh (to deploy Kubernetes)"
echo ""
echo -e "${YELLOW}⚠ Estimated AWS Cost: ~\$90/month${NC}"
echo "   - 1x t3.medium master: ~\$30/month"
echo "   - 2x t3.medium workers: ~\$60/month"
echo "   - EBS, NAT, ALB, etc: Additional costs"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
