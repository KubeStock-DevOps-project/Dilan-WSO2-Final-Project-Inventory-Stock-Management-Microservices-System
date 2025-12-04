variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH"
  type        = list(string)
}

variable "allowed_k8s_api_cidr_blocks" {
  description = "CIDR blocks allowed for K8s API access"
  type        = list(string)
}
