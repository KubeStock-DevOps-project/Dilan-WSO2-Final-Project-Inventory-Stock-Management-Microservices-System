# ============================================================================
# TERRAFORM VARIABLES
# Self-Managed Kubernetes Cluster
# ============================================================================

# ============================================================================
# GENERAL CONFIGURATION
# ============================================================================

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production", "dev"], var.environment)
    error_message = "Environment must be staging, production, or dev."
  }
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "inventory-k8s-cluster"
}

variable "aws_region" {
  description = "AWS region for infrastructure"
  type        = string
  default     = "us-east-1"
}

# ============================================================================
# NETWORKING CONFIGURATION
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# ============================================================================
# KUBERNETES NETWORK CONFIGURATION
# ============================================================================

variable "pod_network_cidr" {
  description = "CIDR for pod network (Calico/Flannel)"
  type        = string
  default     = "10.244.0.0/16"
}

variable "service_cidr" {
  description = "CIDR for Kubernetes services"
  type        = string
  default     = "10.96.0.0/12"
}

variable "cluster_domain" {
  description = "Kubernetes cluster domain"
  type        = string
  default     = "cluster.local"
}

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH to nodes"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CHANGE THIS TO YOUR IP FOR SECURITY!
}

variable "allowed_k8s_api_cidr_blocks" {
  description = "CIDR blocks allowed to access K8s API"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CHANGE THIS FOR PRODUCTION!
}

variable "ssh_key_name" {
  description = "SSH key pair name for EC2 instances"
  type        = string
  default     = "k8s-cluster-key"
}

variable "ssh_user" {
  description = "SSH username for instances"
  type        = string
  default     = "ubuntu"
}

# ============================================================================
# MASTER NODE CONFIGURATION
# ============================================================================

variable "master_node_count" {
  description = "Number of master nodes (1 or 3 for HA)"
  type        = number
  default     = 1

  validation {
    condition     = contains([1, 3], var.master_node_count)
    error_message = "Master node count must be 1 or 3 for HA."
  }
}

variable "master_instance_type" {
  description = "EC2 instance type for master nodes"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4 GB RAM
}

# ============================================================================
# WORKER NODE CONFIGURATION
# ============================================================================

variable "worker_node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2

  validation {
    condition     = var.worker_node_count >= 1 && var.worker_node_count <= 10
    error_message = "Worker node count must be between 1 and 10."
  }
}

variable "worker_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4 GB RAM
}

# ============================================================================
# STORAGE CONFIGURATION
# ============================================================================

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30
}

variable "data_volume_size" {
  description = "Data volume size in GB for each node"
  type        = number
  default     = 50
}

variable "persistent_volume_size" {
  description = "Size of each persistent volume in GB"
  type        = number
  default     = 20
}

variable "persistent_volume_count" {
  description = "Number of persistent volumes to create"
  type        = number
  default     = 5
}

variable "persistent_volume_type" {
  description = "EBS volume type for persistent storage"
  type        = string
  default     = "gp3"

  validation {
    condition     = contains(["gp2", "gp3", "io1", "io2"], var.persistent_volume_type)
    error_message = "Volume type must be gp2, gp3, io1, or io2."
  }
}

# ============================================================================
# KUBERNETES DISTRIBUTION CONFIGURATION
# ============================================================================

variable "k8s_distribution" {
  description = "Kubernetes distribution to install (k3s, kubeadm, rke2)"
  type        = string
  default     = "k3s"

  validation {
    condition     = contains(["k3s", "kubeadm", "rke2"], var.k8s_distribution)
    error_message = "K8s distribution must be k3s, kubeadm, or rke2."
  }
}

variable "k8s_version" {
  description = "Kubernetes version to install"
  type        = string
  default     = "v1.28.5"
}

# ============================================================================
# TAGS
# ============================================================================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
