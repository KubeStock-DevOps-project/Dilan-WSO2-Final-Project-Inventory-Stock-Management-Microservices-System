# Terraform Infrastructure - Self-Managed Kubernetes

This Terraform configuration provisions infrastructure for a **self-managed Kubernetes cluster** using k3s, kubeadm, or RKE2.

## 📋 What This Creates

### Infrastructure Components

- **VPC & Networking**
  - VPC with public/private subnets across multiple AZs
  - Internet Gateway for public access
  - NAT Gateway for private subnet internet access
  - Route tables and associations

- **Compute Resources**
  - Master nodes (1 or 3 for HA)
  - Worker nodes (configurable count)
  - Ubuntu 22.04 LTS
  - Encrypted EBS volumes

- **Load Balancers**
  - Network Load Balancer for Kubernetes API (port 6443)
  - Application Load Balancer for apps (HTTP/HTTPS)

- **Security**
  - Security groups for master, worker, and load balancer
  - Firewall rules for Kubernetes components
  - SSH access control

- **Storage**
  - Persistent EBS volumes for stateful workloads
  - Encrypted at rest

## 🚀 Quick Start

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **AWS CLI** configured with credentials
4. **SSH Key Pair** created in AWS EC2

### Step 1: Configure Variables

```bash
cd infrastructure/terraform

# Copy and edit configuration
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars
```

**Important: Update these values in `terraform.tfvars`:**

```hcl
# Get your IP address
# curl ifconfig.me

allowed_ssh_cidr_blocks     = ["YOUR_IP/32"]
allowed_k8s_api_cidr_blocks = ["YOUR_IP/32"]

# Your SSH key name from AWS console
ssh_key_name = "your-key-name"
```

### Step 2: Initialize Terraform

```bash
terraform init
```

### Step 3: Plan Infrastructure

```bash
terraform plan
```

Review the plan to see what will be created:
- 1 VPC
- 2 Public subnets
- 2 Private subnets
- 1 or 3 Master nodes
- 2+ Worker nodes
- 2 Load balancers
- 5 Persistent volumes
- Security groups and networking

### Step 4: Apply Configuration

```bash
terraform apply
```

Type `yes` to confirm. This takes ~5-10 minutes.

### Step 5: Get Outputs

```bash
terraform output
```

You'll see:
- Master node IPs
- Worker node IPs
- Load balancer DNS
- SSH connection commands
- Next steps for Ansible

## 📁 Project Structure

```
terraform/
├── main.tf                    # Main configuration
├── variables.tf               # Variable definitions
├── terraform.tfvars.example   # Example configuration
├── modules/
│   ├── networking/            # VPC, subnets, routing
│   ├── security/              # Security groups
│   ├── compute/               # EC2 instances
│   ├── load_balancer/         # NLB and ALB
│   └── storage/               # EBS volumes
└── templates/
    └── ansible-inventory.tpl  # Ansible inventory template
```

## 🔧 Configuration Options

### Cluster Sizing

| Configuration | Master Nodes | Worker Nodes | Instance Type | Use Case |
|--------------|--------------|--------------|---------------|----------|
| **Development** | 1 | 2 | t3.medium | Testing, dev |
| **Staging** | 1 | 3 | t3.large | Pre-production |
| **Production HA** | 3 | 5+ | t3.xlarge | Production |

### Kubernetes Distributions

Choose in `terraform.tfvars`:

```hcl
k8s_distribution = "k3s"      # Lightweight, easy (recommended)
k8s_distribution = "kubeadm"  # Standard K8s
k8s_distribution = "rke2"     # Rancher's secure K8s
```

## 📊 Cost Estimation

**Staging Configuration** (1 master, 2 workers, t3.medium):
- EC2 Instances: ~$75/month
- Load Balancers: ~$35/month
- EBS Storage: ~$15/month
- **Total: ~$125/month**

**Production HA** (3 masters, 5 workers, t3.large):
- EC2 Instances: ~$400/month
- Load Balancers: ~$35/month
- EBS Storage: ~$40/month
- **Total: ~$475/month**

Use AWS Free Tier for initial testing!

## 🔒 Security Best Practices

1. **Restrict Access**
   ```hcl
   allowed_ssh_cidr_blocks = ["YOUR_IP/32"]
   ```

2. **Use Bastion Host** for production

3. **Enable VPC Flow Logs**

4. **Rotate SSH Keys** regularly

5. **Use AWS Secrets Manager** for sensitive data

## 🎯 Next Steps After Terraform

1. **Run Ansible** to install Kubernetes:
   ```bash
   cd ../ansible
   ansible-playbook -i inventory/hosts.ini playbooks/install-k3s.yml
   ```

2. **Get kubeconfig**:
   ```bash
   export KUBECONFIG=./kubeconfig
   kubectl get nodes
   ```

3. **Apply K8s manifests**:
   ```bash
   kubectl apply -f ../../k8s/base/
   ```

4. **Install ArgoCD**:
   ```bash
   kubectl apply -f ../../k8s/argocd/
   ```

## 🔄 Managing Infrastructure

### Update Infrastructure

```bash
# Modify terraform.tfvars
terraform plan
terraform apply
```

### Add Worker Nodes

```hcl
# terraform.tfvars
worker_node_count = 3  # Increase from 2
```

```bash
terraform apply
```

### Destroy Infrastructure

⚠️ **Warning: This deletes everything!**

```bash
terraform destroy
```

## 🐛 Troubleshooting

### Issue: Cannot SSH to nodes

**Solution:**
- Check security group allows your IP
- Verify SSH key exists: `ls ~/.ssh/your-key.pem`
- Check permissions: `chmod 400 ~/.ssh/your-key.pem`

### Issue: Terraform apply fails

**Solution:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify SSH key exists in AWS: `aws ec2 describe-key-pairs`
- Check region matches: `aws configure get region`

### Issue: Out of resources

**Solution:**
- Check AWS account limits
- Request limit increase
- Use smaller instance types

## 📚 Additional Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [K3s Documentation](https://docs.k3s.io/)
- [Kubeadm Setup](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)
- [RKE2 Documentation](https://docs.rke2.io/)

## 🤝 Support

For issues or questions:
1. Check Terraform outputs: `terraform output`
2. Review AWS Console for resource status
3. Check Terraform state: `terraform state list`
4. Enable debug: `TF_LOG=DEBUG terraform apply`

---

**Generated by:** Terraform Infrastructure as Code
**Maintained by:** DevOps Team
**Last Updated:** 2025-11-29
