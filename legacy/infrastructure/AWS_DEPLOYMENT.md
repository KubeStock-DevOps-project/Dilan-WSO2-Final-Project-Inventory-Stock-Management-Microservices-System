# AWS Deployment Guide

Complete guide for deploying the Inventory & Stock Management System to AWS cloud infrastructure.

## Prerequisites

### AWS Account Setup

1. **AWS Account**
   - Active AWS account with billing enabled
   - Access to EC2, VPC, IAM services

2. **AWS CLI**
   ```bash
   # Install AWS CLI v2
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Verify installation
   aws --version
   ```

3. **AWS Credentials**
   ```bash
   # Configure AWS credentials
   aws configure
   
   # Enter:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., us-east-1)
   # - Default output format (json)
   
   # Verify credentials
   aws sts get-caller-identity
   ```

4. **Required Permissions**
   - EC2 (full access)
   - VPC (full access)
   - IAM (create roles, policies)
   - EBS (volume management)
   - Route53 (optional, for DNS)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                    VPC (10.0.0.0/16)                   │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │Public Subnet │  │Private Subnet│  │Private Subnet│ │   │
│  │  │  10.0.1.0/24 │  │  10.0.2.0/24 │  │  10.0.3.0/24 │ │   │
│  │  │              │  │              │  │              │ │   │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │ │   │
│  │  │ │  Bastion │ │  │ │  K8s     │ │  │ │  K8s     │ │ │   │
│  │  │ │  Host    │ │  │ │  Master  │ │  │ │  Worker  │ │ │   │
│  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │ │   │
│  │  │              │  │              │  │              │ │   │
│  │  │ ┌──────────┐ │  │              │  │ ┌──────────┐ │ │   │
│  │  │ │   NAT    │ │  │              │  │ │  K8s     │ │ │   │
│  │  │ │ Gateway  │ │  │              │  │ │  Worker  │ │ │   │
│  │  │ └──────────┘ │  │              │  │ └──────────┘ │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │            Application Load Balancer            │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Update Terraform Variables

Edit `infrastructure/terraform/terraform.tfvars`:

```hcl
# AWS Configuration
aws_region = "us-east-1"

# Project Configuration
project_name = "inventory-system"
environment  = "production"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Compute Configuration
master_instance_type = "t3.medium"  # 2 vCPU, 4GB RAM
worker_instance_type = "t3.large"   # 2 vCPU, 8GB RAM
worker_count        = 2

# Storage Configuration
ebs_volume_size = 50  # GB
ebs_volume_type = "gp3"

# SSH Configuration
key_pair_name = "inventory-system-key"  # Create this in AWS Console

# Tags
tags = {
  Project     = "Inventory System"
  Environment = "Production"
  ManagedBy   = "Terraform"
  Owner       = "DevOps Team"
}
```

### Step 2: Create SSH Key Pair

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/inventory-system-key -C "inventory-system-aws"

# Import to AWS
aws ec2 import-key-pair \
  --key-name inventory-system-key \
  --public-key-material fileb://~/.ssh/inventory-system-key.pub \
  --region us-east-1

# Verify
aws ec2 describe-key-pairs --key-names inventory-system-key
```

### Step 3: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Plan deployment
terraform plan -out=tfplan

# Review plan output carefully
```

### Step 4: Deploy Infrastructure

```bash
# Apply Terraform configuration
terraform apply tfplan

# Terraform will create:
# - VPC with public/private subnets
# - Internet Gateway + NAT Gateway
# - Security Groups
# - EC2 instances (1 master, 2 workers)
# - EBS volumes
# - Application Load Balancer

# Wait for completion (~5-10 minutes)
```

### Step 5: Verify Infrastructure

```bash
# Get outputs
terraform output

# Example output:
# master_public_ip  = "54.123.45.67"
# worker_public_ips = ["54.123.45.68", "54.123.45.69"]
# lb_dns_name       = "inventory-lb-123456.us-east-1.elb.amazonaws.com"
# vpc_id            = "vpc-0123456789abcdef"

# Save master IP for SSH access
export MASTER_IP=$(terraform output -raw master_public_ip)
```

### Step 6: Configure Kubernetes Cluster

```bash
cd ../ansible

# Update inventory file with actual IPs
cat > inventory/aws-hosts.yml <<EOF
all:
  children:
    k8s_cluster:
      children:
        master_nodes:
          hosts:
            master-1:
              ansible_host: ${MASTER_IP}
              ansible_user: ubuntu
              ansible_ssh_private_key_file: ~/.ssh/inventory-system-key
        
        worker_nodes:
          hosts:
            worker-1:
              ansible_host: $(terraform output -raw worker_public_ips | jq -r '.[0]')
              ansible_user: ubuntu
              ansible_ssh_private_key_file: ~/.ssh/inventory-system-key
            worker-2:
              ansible_host: $(terraform output -raw worker_public_ips | jq -r '.[1]')
              ansible_user: ubuntu
              ansible_ssh_private_key_file: ~/.ssh/inventory-system-key
EOF

# Test connectivity
ansible all -i inventory/aws-hosts.yml -m ping

# Deploy k3s cluster
ansible-playbook -i inventory/aws-hosts.yml playbooks/k3s/install.yml

# Wait for completion (~5-10 minutes)
```

### Step 7: Configure kubectl

```bash
# SSH to master node
ssh -i ~/.ssh/inventory-system-key ubuntu@${MASTER_IP}

# Copy kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml

# Exit from SSH
exit

# On local machine, create kubeconfig
mkdir -p ~/.kube
cat > ~/.kube/config-aws <<EOF
# Paste kubeconfig content here
# Replace 127.0.0.1 with ${MASTER_IP}
EOF

# Set KUBECONFIG
export KUBECONFIG=~/.kube/config-aws

# Verify cluster access
kubectl get nodes

# Should show:
# NAME       STATUS   ROLES                  AGE   VERSION
# master-1   Ready    control-plane,master   5m    v1.28.x
# worker-1   Ready    <none>                 4m    v1.28.x
# worker-2   Ready    <none>                 4m    v1.28.x
```

### Step 8: Deploy Applications

```bash
cd ../../k8s

# Create namespace
kubectl create namespace inventory-system

# Deploy base resources
kubectl apply -f base/

# Verify deployments
kubectl get pods -n inventory-system

# Check services
kubectl get svc -n inventory-system
```

### Step 9: Deploy Monitoring Stack

```bash
cd monitoring

# Install monitoring
./install.sh

# Wait for pods to be ready
kubectl get pods -n monitoring -w

# Access Grafana (via port-forward)
kubectl port-forward svc/grafana -n monitoring 3000:3000
```

### Step 10: Deploy Logging Stack

```bash
cd ../logging

# Install logging
./install.sh

# Wait for OpenSearch to be ready
kubectl get pods -n logging -w

# Access OpenSearch Dashboards
kubectl port-forward svc/opensearch-dashboards -n logging 5601:5601
```

### Step 11: Deploy Security Stack

```bash
cd ../security

# Install security policies
./install.sh

# Verify OPA Gatekeeper
kubectl get pods -n gatekeeper-system

# Check constraints
kubectl get constraints

# Verify network policies
kubectl get networkpolicies -n inventory-system
```

### Step 12: Deploy ArgoCD

```bash
cd ../argocd

# Install ArgoCD
./install.sh

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Step 13: Configure Load Balancer

```bash
# Update Kong service to use LoadBalancer type
kubectl patch svc kong-gateway -n inventory-system \
  -p '{"spec": {"type": "LoadBalancer"}}'

# Get Load Balancer URL
kubectl get svc kong-gateway -n inventory-system

# Wait for EXTERNAL-IP to be assigned
# This will be an AWS ELB DNS name
```

### Step 14: Configure DNS (Optional)

```bash
# Get Load Balancer DNS
export LB_DNS=$(kubectl get svc kong-gateway -n inventory-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create Route53 record (if you have a domain)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.inventory-system.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$LB_DNS'"}]
      }
    }]
  }'
```

## Post-Deployment Verification

### Check Cluster Health

```bash
# Node status
kubectl get nodes -o wide

# System pods
kubectl get pods -n kube-system

# Application pods
kubectl get pods -n inventory-system

# All resources
kubectl get all -A
```

### Test API Endpoints

```bash
# Get Load Balancer URL
export API_URL=$(kubectl get svc kong-gateway -n inventory-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoints
curl http://${API_URL}/user-service/health
curl http://${API_URL}/inventory-service/health
curl http://${API_URL}/order-service/health
curl http://${API_URL}/product-catalog-service/health
curl http://${API_URL}/supplier-service/health
```

### Monitor Resource Usage

```bash
# CPU and Memory
kubectl top nodes
kubectl top pods -n inventory-system

# Disk usage
kubectl get pvc -A

# Network
kubectl get svc -A
```

## Cost Estimation

### Monthly AWS Costs (US East - 1)

| Resource | Specifications | Monthly Cost |
|----------|---------------|--------------|
| EC2 Master | t3.medium (1x) | ~$30 |
| EC2 Workers | t3.large (2x) | ~$120 |
| EBS Volumes | 50GB gp3 (3x) | ~$15 |
| NAT Gateway | Single AZ | ~$32 |
| ALB | Application LB | ~$23 |
| Data Transfer | 100GB egress | ~$9 |
| **Total** | | **~$229/month** |

### Cost Optimization Tips

1. **Use Spot Instances**
   - Save up to 70% on worker nodes
   - Not recommended for master

2. **Right-size Instances**
   - Monitor usage, downsize if possible
   - t3.medium workers may suffice

3. **Reserved Instances**
   - 1-year commitment: 30-40% savings
   - 3-year commitment: 50-60% savings

4. **Stop Non-Production**
   - Stop instances after hours
   - Use AWS Instance Scheduler

5. **Use S3 for Storage**
   - Cheaper than EBS for logs
   - Integrate with OpenSearch

## Troubleshooting

### Cannot SSH to Instances

**Problem:** `Connection timed out`

**Solutions:**
1. Check security group allows SSH (port 22) from your IP
2. Verify key pair is correct
3. Ensure instance is in public subnet with public IP
4. Check NACL rules

```bash
# Update security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr $(curl -s ifconfig.me)/32
```

### Kubernetes Nodes Not Ready

**Problem:** Nodes show `NotReady` status

**Solutions:**
1. Check k3s service status
   ```bash
   ssh -i ~/.ssh/inventory-system-key ubuntu@${MASTER_IP}
   sudo systemctl status k3s
   ```

2. Check logs
   ```bash
   sudo journalctl -u k3s -f
   ```

3. Restart k3s
   ```bash
   sudo systemctl restart k3s
   ```

### Pods in CrashLoopBackOff

**Problem:** Pods continuously restarting

**Solutions:**
1. Check logs
   ```bash
   kubectl logs <pod-name> -n inventory-system
   ```

2. Describe pod
   ```bash
   kubectl describe pod <pod-name> -n inventory-system
   ```

3. Check resources
   ```bash
   kubectl top pods -n inventory-system
   ```

### Load Balancer Not Working

**Problem:** Cannot access services via LB

**Solutions:**
1. Check service type
   ```bash
   kubectl get svc kong-gateway -n inventory-system
   ```

2. Verify security groups allow traffic
3. Check target health in AWS console
4. Verify pod selectors match

### High AWS Costs

**Problem:** Unexpected billing

**Solutions:**
1. Enable AWS Cost Explorer
2. Check for:
   - Running but unused instances
   - Unattached EBS volumes
   - Excessive data transfer
   - NAT Gateway usage

3. Set up billing alerts
   ```bash
   aws budgets create-budget \
     --account-id $(aws sts get-caller-identity --query Account --output text) \
     --budget file://budget.json
   ```

## Cleanup

### Destroy Infrastructure

```bash
cd infrastructure/terraform

# Destroy all resources
terraform destroy

# Confirm with 'yes'

# Verify all resources deleted
aws ec2 describe-instances --filters "Name=tag:Project,Values=Inventory System"
```

### Manual Cleanup (if needed)

```bash
# Delete Load Balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `inventory`)].LoadBalancerArn' --output text | xargs -I {} aws elbv2 delete-load-balancer --load-balancer-arn {}

# Delete Security Groups
aws ec2 describe-security-groups --filters "Name=tag:Project,Values=Inventory System" --query 'SecurityGroups[].GroupId' --output text | xargs -I {} aws ec2 delete-security-group --group-id {}

# Delete EBS Volumes
aws ec2 describe-volumes --filters "Name=tag:Project,Values=Inventory System" --query 'Volumes[].VolumeId' --output text | xargs -I {} aws ec2 delete-volume --volume-id {}

# Delete Key Pair
aws ec2 delete-key-pair --key-name inventory-system-key
```

## Security Best Practices

### 1. Network Security

- ✅ Use private subnets for application instances
- ✅ Restrict security group rules to minimum required
- ✅ Use NAT Gateway for outbound internet access
- ✅ Enable VPC Flow Logs
- ✅ Use AWS WAF with Application Load Balancer

### 2. Access Control

- ✅ Use IAM roles for EC2 instances (no access keys)
- ✅ Enable MFA for AWS console access
- ✅ Use Secrets Manager for sensitive data
- ✅ Rotate SSH keys regularly
- ✅ Implement least privilege principle

### 3. Data Protection

- ✅ Enable EBS encryption
- ✅ Use SSL/TLS for all communications
- ✅ Enable S3 bucket encryption (for backups)
- ✅ Regular automated backups
- ✅ Implement data retention policies

### 4. Monitoring & Logging

- ✅ Enable CloudWatch Logs
- ✅ Set up CloudWatch Alarms
- ✅ Enable AWS Config for compliance
- ✅ Use CloudTrail for API auditing
- ✅ Integrate with Prometheus/Grafana

### 5. Compliance

- ✅ Enable AWS Security Hub
- ✅ Use AWS Inspector for vulnerability scanning
- ✅ Implement CIS benchmarks
- ✅ Regular security audits
- ✅ Document compliance procedures

## Maintenance

### Regular Tasks

**Daily:**
- Monitor CloudWatch dashboards
- Check pod health
- Review application logs

**Weekly:**
- Update system packages
- Review security group rules
- Check resource utilization
- Backup verification

**Monthly:**
- Review and optimize costs
- Update Kubernetes cluster
- Security patches
- Capacity planning

**Quarterly:**
- Review disaster recovery procedures
- Update documentation
- Security audit
- Performance testing

## Advanced Topics

### Multi-AZ Deployment

For high availability, deploy across multiple availability zones:

```hcl
# terraform.tfvars
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
worker_count = 3  # One per AZ
```

### Auto-Scaling

Enable cluster auto-scaling:

```bash
# Install Cluster Autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
```

### Disaster Recovery

Implement backup and restore:

```bash
# Install Velero
kubectl apply -f https://raw.githubusercontent.com/vmware-tanzu/velero/main/examples/aws/00-velero-namespace.yaml

# Create backup
velero backup create inventory-backup --include-namespaces inventory-system

# Restore
velero restore create --from-backup inventory-backup
```

## References

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [k3s Documentation](https://docs.k3s.io/)
- [Kubernetes on AWS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## Support

For issues or questions:
- Check troubleshooting section above
- Review application logs
- Consult AWS Support (if subscribed)
- Open GitHub issue for application-specific problems
