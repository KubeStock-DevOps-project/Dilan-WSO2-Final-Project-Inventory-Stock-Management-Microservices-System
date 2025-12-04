# AWS Configuration
aws_region = "us-east-1"

# Project Configuration
project_name = "inventory-system"
environment  = "production"

# Network Configuration
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Compute Configuration - Optimized for cost
master_instance_type = "t3.medium"  # 2 vCPU, 4GB RAM - $30/month
worker_instance_type = "t3.medium"  # 2 vCPU, 4GB RAM - $30/month each
worker_count         = 2

# Storage Configuration
ebs_volume_size = 30  # GB - Reduced from 50GB to save costs
ebs_volume_type = "gp3"

# SSH Configuration
key_pair_name = "inventory-system-key"

# Tags
tags = {
  Project     = "Inventory-System"
  Environment = "Production"
  ManagedBy   = "Terraform"
  Owner       = "DevOps-Team"
  Purpose     = "University-Assignment"
}
