# ============================================================================
# MAIN TERRAFORM CONFIGURATION
# Self-Managed Kubernetes Cluster Infrastructure
# ============================================================================
# Purpose: Provision VMs for k3s/kubeadm/RKE2 cluster
# Provider: AWS (EC2) - Can be adapted for GCP/Azure/On-prem
# ============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Remote backend for state management
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "inventory-system/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# ============================================================================
# PROVIDER CONFIGURATION
# ============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Inventory-Stock-Management"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps-Team"
    }
  }
}

# ============================================================================
# NETWORKING MODULE
# ============================================================================

module "networking" {
  source = "./modules/networking"

  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  enable_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# ============================================================================
# SECURITY MODULE
# ============================================================================

module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.networking.vpc_id

  # Allow SSH from your IP (set in terraform.tfvars)
  allowed_ssh_cidr_blocks = var.allowed_ssh_cidr_blocks

  # K8s API server access
  allowed_k8s_api_cidr_blocks = var.allowed_k8s_api_cidr_blocks
}

# ============================================================================
# COMPUTE MODULE - KUBERNETES NODES
# ============================================================================

module "k8s_nodes" {
  source = "./modules/compute"

  environment = var.environment

  # VPC Configuration
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids

  # Security Groups
  master_security_group_id = module.security.k8s_master_sg_id
  worker_security_group_id = module.security.k8s_worker_sg_id
  lb_security_group_id     = module.security.lb_sg_id

  # Master Node Configuration
  master_count         = var.master_node_count
  master_instance_type = var.master_instance_type

  # Worker Node Configuration
  worker_count         = var.worker_node_count
  worker_instance_type = var.worker_instance_type

  # Storage
  root_volume_size = var.root_volume_size
  data_volume_size = var.data_volume_size

  # SSH Key
  ssh_key_name = var.ssh_key_name

  # Tags
  cluster_name = var.cluster_name
}

# ============================================================================
# LOAD BALANCER MODULE
# ============================================================================

module "load_balancer" {
  source = "./modules/load_balancer"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.public_subnet_ids

  security_group_id = module.security.lb_sg_id

  master_instance_ids = module.k8s_nodes.master_instance_ids
  worker_instance_ids = module.k8s_nodes.worker_instance_ids

  cluster_name = var.cluster_name

  # Health check for K8s API
  health_check_path = "/healthz"
  health_check_port = 6443
}

# ============================================================================
# STORAGE MODULE - EBS VOLUMES FOR PERSISTENT STORAGE
# ============================================================================

module "storage" {
  source = "./modules/storage"

  environment        = var.environment
  availability_zones = var.availability_zones

  # Create persistent volumes for stateful workloads
  persistent_volume_size  = var.persistent_volume_size
  persistent_volume_count = var.persistent_volume_count
  persistent_volume_type  = var.persistent_volume_type
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "master_nodes" {
  description = "Master node details"
  value = {
    public_ips   = module.k8s_nodes.master_public_ips
    private_ips  = module.k8s_nodes.master_private_ips
    instance_ids = module.k8s_nodes.master_instance_ids
  }
}

output "worker_nodes" {
  description = "Worker node details"
  value = {
    public_ips   = module.k8s_nodes.worker_public_ips
    private_ips  = module.k8s_nodes.worker_private_ips
    instance_ids = module.k8s_nodes.worker_instance_ids
  }
}

output "load_balancer_dns" {
  description = "Load Balancer DNS name for K8s API access"
  value       = module.load_balancer.lb_dns_name
}

output "load_balancer_endpoint" {
  description = "Load Balancer endpoint for K8s API"
  value       = "https://${module.load_balancer.lb_dns_name}:6443"
}

output "ssh_connection_commands" {
  description = "SSH commands to connect to nodes"
  value = {
    master_nodes = [
      for ip in module.k8s_nodes.master_public_ips :
      "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${ip}"
    ]
    worker_nodes = [
      for ip in module.k8s_nodes.worker_public_ips :
      "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${ip}"
    ]
  }
}

output "ansible_inventory_file" {
  description = "Path to generated Ansible inventory"
  value       = local_file.ansible_inventory.filename
}

output "kubeconfig_path" {
  description = "Path where kubeconfig will be stored after Ansible provisioning"
  value       = "${path.module}/kubeconfig"
}

output "next_steps" {
  description = "Next steps to complete cluster setup"
  value       = <<-EOT
    
    ============================================================================
    INFRASTRUCTURE PROVISIONED SUCCESSFULLY!
    ============================================================================
    
    Next Steps:
    
    1. INSTALL KUBERNETES WITH ANSIBLE:
       cd ../ansible
       ansible-playbook -i inventory/hosts.ini playbooks/install-k3s.yml
       
    2. GET KUBECONFIG:
       The Ansible playbook will fetch kubeconfig to: ./kubeconfig
       export KUBECONFIG=$(pwd)/kubeconfig
       
    3. VERIFY CLUSTER:
       kubectl get nodes
       kubectl cluster-info
       
    4. APPLY K8S MANIFESTS:
       kubectl apply -f ../../k8s/base/
       
    5. INSTALL ARGOCD:
       kubectl apply -f ../../k8s/argocd/
       
    ============================================================================
    Master Nodes: ${length(module.k8s_nodes.master_public_ips)}
    Worker Nodes: ${length(module.k8s_nodes.worker_public_ips)}
    Load Balancer: ${module.load_balancer.lb_dns_name}
    ============================================================================
  EOT
}

# ============================================================================
# GENERATE ANSIBLE INVENTORY
# ============================================================================

resource "local_file" "ansible_inventory" {
  filename = "${path.module}/../ansible/inventory/hosts.ini"

  content = templatefile("${path.module}/templates/ansible-inventory.tpl", {
    master_ips = module.k8s_nodes.master_public_ips
    worker_ips = module.k8s_nodes.worker_public_ips
    ssh_key    = var.ssh_key_name
    ssh_user   = var.ssh_user
  })

  file_permission = "0644"
}

# ============================================================================
# GENERATE ANSIBLE VARIABLES
# ============================================================================

resource "local_file" "ansible_vars" {
  filename = "${path.module}/../ansible/group_vars/all.yml"

  content = yamlencode({
    cluster_name     = var.cluster_name
    k8s_version      = var.k8s_version
    k8s_distribution = var.k8s_distribution
    pod_network_cidr = var.pod_network_cidr
    service_cidr     = var.service_cidr
    cluster_domain   = var.cluster_domain
    lb_endpoint      = module.load_balancer.lb_dns_name

    # Storage configuration
    storage_class_name = "local-storage"
    persistent_volumes = module.storage.persistent_volume_ids
  })

  file_permission = "0644"
}
