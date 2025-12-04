#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       AWS Infrastructure Cleanup                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠  WARNING: This will destroy ALL AWS resources! ⚠${NC}"
echo ""
echo "This will delete:"
echo "  - All EC2 instances"
echo "  - VPC and subnets"
echo "  - Security groups"
echo "  - EBS volumes"
echo "  - Load balancers"
echo "  - NAT gateways"
echo ""
echo -e "${YELLOW}You will NOT be able to recover these resources!${NC}"
echo ""
read -p "Are you absolutely sure? Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

cd terraform

echo "Running terraform destroy..."
terraform destroy -auto-approve

echo ""
echo -e "${GREEN}✓ AWS infrastructure destroyed${NC}"
echo ""

# Optional: Clean up SSH keys
read -p "Delete local SSH keys? (y/N): " delete_keys
if [[ $delete_keys =~ ^[Yy]$ ]]; then
    rm -f ~/.ssh/inventory-system-key*
    echo -e "${GREEN}✓ SSH keys deleted${NC}"
fi

# Optional: Delete AWS key pair
read -p "Delete AWS key pair? (y/N): " delete_aws_key
if [[ $delete_aws_key =~ ^[Yy]$ ]]; then
    AWS_REGION=$(aws configure get region)
    aws ec2 delete-key-pair --key-name inventory-system-key --region "$AWS_REGION" || true
    echo -e "${GREEN}✓ AWS key pair deleted${NC}"
fi

echo ""
echo -e "${GREEN}Cleanup complete!${NC}"
