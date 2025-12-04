# AWS Deployment Guide

Complete guide for deploying the Inventory & Stock Management System to AWS using Terraform and Ansible.

## Prerequisites

### 1. AWS Account & Credentials

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 2. SSH Key Pair

```bash
# Generate SSH key for EC2 instances
ssh-keygen -t rsa -b 4096 -f ~/.ssh/aws-k8s-key -N ""

# Import to AWS
aws ec2 import-key-pair \
  --key-name k8s-cluster-key \
  --public-key-material fileb://~/.ssh/aws-k8s-key.pub \
  --region us-east-1
```

### 3. Required Tools

```bash
# Terraform (already installed - v1.9.8)
terraform version

# Ansible (already installed - core 2.16.3)
ansible --version

# kubectl (already installed - v1.31.3)
kubectl version --client
```

## Architecture

### AWS Resources to be Created

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud (us-east-1)                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  VPC (10.0.0.0/16)                                        │ │
│  │                                                           │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐       │ │
│  │  │ Public Subnet (AZ1) │  │ Public Subnet (AZ2) │       │ │
│  │  │   10.0.1.0/24       │  │   10.0.2.0/24       │       │ │
│  │  │                     │  │                     │       │ │
│  │  │  ┌──────────────┐   │  │  ┌──────────────┐   │       │ │
│  │  │  │ Master Node  │   │  │  │ Worker Node  │   │       │ │
│  │  │  │ t3.medium    │   │  │  │ t3.medium    │   │       │ │
│  │  │  │ k3s master   │   │  │  │ k3s worker   │   │       │ │
│  │  │  └──────────────┘   │  │  └──────────────┘   │       │ │
│  │  └─────────────────────┘  └─────────────────────┘       │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │  Internet Gateway                                │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Security Groups                                          │ │
│  │  - SSH (22) - Admin only                                  │ │
│  │  - K8s API (6443) - Admin + Worker nodes                  │ │
│  │  - HTTP/HTTPS (80/443) - Public                           │ │
│  │  - Node ports (30000-32767) - Public                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Elastic Load Balancer (ALB)                              │ │
│  │  - Routes to Kong Gateway                                 │ │
│  │  - SSL/TLS termination                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Specifications

**Master Node:**
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Role: k3s server (control plane + etcd)
- Storage: 30GB gp3 EBS

**Worker Nodes:**
- Count: 2
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Role: k3s agent (workload nodes)
- Storage: 30GB gp3 EBS each

**Networking:**
- VPC CIDR: 10.0.0.0/16
- Subnet 1 (AZ1): 10.0.1.0/24
- Subnet 2 (AZ2): 10.0.2.0/24
- Internet Gateway: Full public access
- Route Table: 0.0.0.0/0 → IGW

## Deployment Steps

### Step 1: Configure Terraform Variables

```bash
cd infrastructure/terraform

# Create terraform.tfvars
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
admin_ip = "$(curl -s ifconfig.me)/32"  # Your IP only

# Tags
tags = {
  Project = "Inventory-Management"
  Environment = "Production"
  ManagedBy = "Terraform"
  Owner = "DevOps-Team"
}
EOF

# Initialize Terraform
terraform init
```

### Step 2: Plan Infrastructure

```bash
# Review what will be created
terraform plan

# Expected output:
# - 1 VPC
# - 2 Subnets
# - 1 Internet Gateway
# - 1 Route Table
# - 4 Security Groups
# - 3 EC2 Instances (1 master + 2 workers)
# - 1 Application Load Balancer
# - 3 EBS Volumes
# - 1 Target Group
# - IAM roles and policies

# Estimated cost: ~$150-200/month
```

### Step 3: Deploy Infrastructure

```bash
# Apply configuration
terraform apply

# Confirm with: yes

# Wait for completion (~5-10 minutes)
# Outputs:
# - master_public_ip
# - worker_public_ips
# - load_balancer_dns
# - vpc_id
# - security_group_ids
```

### Step 4: Configure Ansible Inventory

```bash
cd ../../infrastructure/ansible

# Get instance IPs from Terraform output
MASTER_IP=$(cd ../../infrastructure/terraform && terraform output -raw master_public_ip)
WORKER1_IP=$(cd ../../infrastructure/terraform && terraform output -raw worker_public_ips | jq -r '.[0]')
WORKER2_IP=$(cd ../../infrastructure/terraform && terraform output -raw worker_public_ips | jq -r '.[1]')

# Create inventory file
cat > inventory/aws-production.ini <<EOF
[k8s_master]
master ansible_host=${MASTER_IP} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/aws-k8s-key

[k8s_workers]
worker1 ansible_host=${WORKER1_IP} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/aws-k8s-key
worker2 ansible_host=${WORKER2_IP} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/aws-k8s-key

[k8s_cluster:children]
k8s_master
k8s_workers

[k8s_cluster:vars]
ansible_python_interpreter=/usr/bin/python3
k8s_version=v1.28
cluster_name=inventory-system-prod
cluster_cidr=10.244.0.0/16
service_cidr=10.96.0.0/12
EOF

# Test connectivity
ansible all -i inventory/aws-production.ini -m ping
```

### Step 5: Install k3s Cluster

```bash
# Run k3s installation playbook
ansible-playbook -i inventory/aws-production.ini playbooks/k3s-install.yml

# This will:
# 1. Install k3s server on master node
# 2. Install k3s agent on worker nodes
# 3. Configure networking and CNI
# 4. Setup kubeconfig
# 5. Join workers to cluster

# Duration: ~5-10 minutes
```

### Step 6: Configure kubectl Access

```bash
# Copy kubeconfig from master
MASTER_IP=$(cd ../../infrastructure/terraform && terraform output -raw master_public_ip)

scp -i ~/.ssh/aws-k8s-key ubuntu@${MASTER_IP}:~/.kube/config ~/.kube/config-aws

# Update server address
sed -i "s/127.0.0.1/${MASTER_IP}/g" ~/.kube/config-aws

# Set kubeconfig
export KUBECONFIG=~/.kube/config-aws

# Verify cluster
kubectl get nodes
# Expected: 3 nodes Ready

kubectl get pods -A
# Expected: All system pods Running
```

### Step 7: Deploy Core Components

```bash
cd ../../

# Deploy base manifests
kubectl apply -k k8s/base/

# Deploy services
kubectl apply -f k8s/base/services/user-service/
kubectl apply -f k8s/base/services/inventory-service/
kubectl apply -f k8s/base/services/order-service/
kubectl apply -f k8s/base/services/product-catalog-service/
kubectl apply -f k8s/base/services/supplier-service/
kubectl apply -f k8s/base/kong-gateway/

# Wait for pods
kubectl wait --for=condition=Ready pods --all -n inventory-system --timeout=300s
```

### Step 8: Install ArgoCD

```bash
# Install ArgoCD
cd k8s/argocd
./install.sh

# Get admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

echo "ArgoCD Password: ${ARGOCD_PASSWORD}"

# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login at https://localhost:8080
# Username: admin
# Password: <from above>
```

### Step 9: Deploy Monitoring Stack

```bash
cd ../monitoring
./install.sh

# Wait for pods
kubectl wait --for=condition=Ready pods --all -n monitoring --timeout=300s

# Access Grafana
kubectl port-forward svc/grafana -n monitoring 3000:3000 &
# URL: http://localhost:3000
# Login: admin / admin123
```

### Step 10: Deploy Logging Stack

```bash
cd ../logging
./install.sh

# Wait for OpenSearch cluster
kubectl wait --for=condition=Ready pod/opensearch-0 -n logging --timeout=600s

# Access OpenSearch Dashboards
kubectl port-forward svc/opensearch-dashboards -n logging 5601:5601 &
# URL: http://localhost:5601
```

### Step 11: Deploy Security Stack

```bash
cd ../security
./install.sh

# Verify OPA Gatekeeper
kubectl get pods -n gatekeeper-system

# Verify NetworkPolicies
kubectl get networkpolicies -n default

# Check constraints
kubectl get constraints
```

### Step 12: Configure DNS (Optional)

```bash
# Get Load Balancer DNS
LB_DNS=$(cd infrastructure/terraform && terraform output -raw load_balancer_dns)

echo "Load Balancer DNS: ${LB_DNS}"

# Option 1: Use Route53 (if you have a domain)
aws route53 change-resource-record-sets \
  --hosted-zone-id <YOUR_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "inventory.yourdomain.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'${LB_DNS}'"}]
      }
    }]
  }'

# Option 2: Use LoadBalancer DNS directly
echo "Access application at: http://${LB_DNS}"
```

## Verification

### Check Infrastructure

```bash
# AWS Resources
aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=Inventory-Management" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,PrivateIpAddress]' \
  --output table

# Cluster Health
kubectl get nodes
kubectl get pods -A
kubectl cluster-info

# Component Status
kubectl get deployments -A
kubectl get services -A
kubectl get pvc -A
```

### Check Applications

```bash
# Get service endpoints
kubectl get svc -n inventory-system

# Check ArgoCD applications
kubectl get applications -n argocd

# Verify monitoring
kubectl get servicemonitors -n monitoring

# Check logging
kubectl get pods -n logging

# Verify security
kubectl get constraints
```

### Health Checks

```bash
# Get LoadBalancer URL
LB_DNS=$(cd infrastructure/terraform && terraform output -raw load_balancer_dns)

# Test Kong Gateway
curl http://${LB_DNS}/health

# Test services (via Kong)
curl http://${LB_DNS}/api/users/health
curl http://${LB_DNS}/api/inventory/health
curl http://${LB_DNS}/api/orders/health
curl http://${LB_DNS}/api/products/health
curl http://${LB_DNS}/api/suppliers/health
```

## Cost Estimation

### Monthly AWS Costs (us-east-1)

| Resource | Specification | Quantity | Monthly Cost |
|----------|--------------|----------|--------------|
| EC2 t3.medium | 2 vCPU, 4GB RAM | 3 instances | $100.80 |
| EBS gp3 | 30GB per instance | 3 volumes | $7.20 |
| Application Load Balancer | - | 1 | $22.50 |
| Data Transfer | First 10TB/month | ~100GB | $9.00 |
| Elastic IP | Static IPs | 3 | $10.80 |
| **Total** | | | **~$150.30/month** |

### Cost Optimization Tips

1. **Use Reserved Instances** (save 30-40%)
   ```bash
   # 1-year commitment: ~$70/month savings
   # 3-year commitment: ~$100/month savings
   ```

2. **Auto-scaling during off-hours**
   - Scale down workers 6PM-6AM
   - Save ~30% on compute

3. **Use Spot Instances for workers**
   - Save 50-70% on worker nodes
   - Not recommended for production master

4. **Optimize storage**
   - Use lifecycle policies for logs
   - Enable EBS volume snapshots

## Troubleshooting

### Cannot SSH to Instances

```bash
# Check security group
aws ec2 describe-security-groups \
  --filters "Name=tag:Project,Values=Inventory-Management"

# Verify key pair
ls -la ~/.ssh/aws-k8s-key

# Test connection
ssh -i ~/.ssh/aws-k8s-key ubuntu@<INSTANCE_IP> -v
```

### k3s Installation Failed

```bash
# Check Ansible logs
ansible-playbook -i inventory/aws-production.ini playbooks/k3s-install.yml -vvv

# SSH to master and check
ssh -i ~/.ssh/aws-k8s-key ubuntu@<MASTER_IP>
sudo systemctl status k3s

# Check logs
sudo journalctl -u k3s -n 50
```

### Pods Not Starting

```bash
# Check node resources
kubectl top nodes

# Check pod logs
kubectl logs <POD_NAME> -n <NAMESPACE>

# Describe pod for events
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# Check PVC status
kubectl get pvc -A
```

### Load Balancer Not Working

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN>

# Check Kong Gateway service
kubectl get svc kong-gateway -n inventory-system

# Verify NodePort allocation
kubectl get svc kong-gateway -n inventory-system -o yaml | grep nodePort
```

### High Costs

```bash
# Check resource usage
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE

# Check EC2 usage
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]'
```

## Scaling

### Horizontal (Add Worker Nodes)

```bash
# Update terraform.tfvars
worker_count = 4  # Increase from 2

# Apply changes
cd infrastructure/terraform
terraform apply

# Get new worker IPs
terraform output worker_public_ips

# Update Ansible inventory
# Add new workers to inventory/aws-production.ini

# Join to cluster
ansible-playbook -i inventory/aws-production.ini playbooks/k3s-install.yml --tags worker
```

### Vertical (Larger Instances)

```bash
# Update terraform.tfvars
master_instance_type = "t3.large"  # 2 vCPU → 4 vCPU
worker_instance_type = "t3.large"  # 4GB RAM → 8GB RAM

# This requires recreation
terraform apply
```

## Backup & Disaster Recovery

### Backup etcd (Control Plane)

```bash
# SSH to master
ssh -i ~/.ssh/aws-k8s-key ubuntu@<MASTER_IP>

# Backup etcd
sudo k3s etcd-snapshot save --name backup-$(date +%Y%m%d-%H%M%S)

# List backups
sudo k3s etcd-snapshot ls

# Copy to S3
aws s3 cp /var/lib/rancher/k3s/server/db/snapshots/ \
  s3://your-bucket/k3s-backups/ --recursive
```

### Restore from Backup

```bash
# SSH to master
ssh -i ~/.ssh/aws-k8s-key ubuntu@<MASTER_IP>

# Stop k3s
sudo systemctl stop k3s

# Restore
sudo k3s server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/<SNAPSHOT>

# Start k3s
sudo systemctl start k3s
```

### Application Data Backup

```bash
# Backup PVCs
kubectl get pvc -A -o yaml > pvc-backup.yaml

# Backup databases (if applicable)
kubectl exec -n inventory-system postgres-0 -- \
  pg_dump -U postgres inventory_db > inventory-backup.sql

# Upload to S3
aws s3 cp inventory-backup.sql s3://your-bucket/backups/
```

## Cleanup

### Destroy Infrastructure

```bash
# Drain nodes
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data

# Delete applications
kubectl delete namespace inventory-system --force --grace-period=0
kubectl delete namespace argocd --force --grace-period=0
kubectl delete namespace monitoring --force --grace-period=0
kubectl delete namespace logging --force --grace-period=0

# Destroy Terraform resources
cd infrastructure/terraform
terraform destroy

# Confirm with: yes

# Clean up SSH keys
aws ec2 delete-key-pair --key-name k8s-cluster-key
rm ~/.ssh/aws-k8s-key*

# Verify deletion
aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=Inventory-Management"
```

## Security Best Practices

1. **Enable CloudTrail** for audit logging
2. **Use AWS Systems Manager** instead of SSH
3. **Enable VPC Flow Logs** for network monitoring
4. **Use AWS Secrets Manager** for sensitive data
5. **Enable GuardDuty** for threat detection
6. **Regular security group audits**
7. **Enable EBS encryption** at rest
8. **Use IAM roles** instead of access keys
9. **Enable MFA** for AWS console access
10. **Regular AMI updates** for security patches

## Next Steps

1. ✅ Infrastructure deployed
2. ✅ Kubernetes cluster running
3. ✅ Applications deployed
4. ⏳ Configure monitoring alerts
5. ⏳ Setup automated backups
6. ⏳ Configure auto-scaling policies
7. ⏳ Setup CI/CD to deploy to AWS
8. ⏳ Configure DNS with your domain
9. ⏳ Enable HTTPS with ACM certificate
10. ⏳ Setup log aggregation to CloudWatch

## Support & Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [k3s Documentation](https://docs.k3s.io/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Ansible AWS Guide](https://docs.ansible.com/ansible/latest/collections/amazon/aws/)

## Cost Calculator

Use AWS Pricing Calculator to estimate your costs:
https://calculator.aws/

Input your specific requirements for accurate estimates.
