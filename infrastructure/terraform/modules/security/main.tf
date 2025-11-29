# ============================================================================
# SECURITY MODULE
# Creates Security Groups for Master, Worker, and Load Balancer
# ============================================================================

# ============================================================================
# MASTER NODE SECURITY GROUP
# ============================================================================

resource "aws_security_group" "k8s_master" {
  name_prefix = "${var.environment}-k8s-master-"
  description = "Security group for Kubernetes master nodes"
  vpc_id      = var.vpc_id

  # SSH access
  ingress {
    description = "SSH from allowed IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr_blocks
  }

  # Kubernetes API server
  ingress {
    description = "K8s API server"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = var.allowed_k8s_api_cidr_blocks
  }

  # etcd server client API
  ingress {
    description = "etcd server client API"
    from_port   = 2379
    to_port     = 2380
    protocol    = "tcp"
    self        = true
  }

  # Kubelet API
  ingress {
    description = "Kubelet API"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    self        = true
  }

  # kube-scheduler
  ingress {
    description = "kube-scheduler"
    from_port   = 10259
    to_port     = 10259
    protocol    = "tcp"
    self        = true
  }

  # kube-controller-manager
  ingress {
    description = "kube-controller-manager"
    from_port   = 10257
    to_port     = 10257
    protocol    = "tcp"
    self        = true
  }

  # Allow all traffic between master nodes
  ingress {
    description = "All traffic between masters"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-k8s-master-sg"
    Environment = var.environment
    Role        = "master"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# WORKER NODE SECURITY GROUP
# ============================================================================

resource "aws_security_group" "k8s_worker" {
  name_prefix = "${var.environment}-k8s-worker-"
  description = "Security group for Kubernetes worker nodes"
  vpc_id      = var.vpc_id

  # SSH access
  ingress {
    description = "SSH from allowed IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr_blocks
  }

  # Kubelet API
  ingress {
    description = "Kubelet API"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    self        = true
  }

  # NodePort Services
  ingress {
    description = "NodePort Services"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all traffic between worker nodes
  ingress {
    description = "All traffic between workers"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Pod network (Flannel/Calico VXLAN)
  ingress {
    description = "Pod network VXLAN"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    self        = true
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-k8s-worker-sg"
    Environment = var.environment
    Role        = "worker"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# SECURITY GROUP RULES (to avoid circular dependencies)
# ============================================================================

# Master → Worker traffic
resource "aws_security_group_rule" "master_to_worker" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.k8s_master.id
  security_group_id        = aws_security_group.k8s_worker.id
  description              = "All traffic from masters"
}

# Worker → Master traffic
resource "aws_security_group_rule" "worker_to_master" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.k8s_worker.id
  security_group_id        = aws_security_group.k8s_master.id
  description              = "All traffic from workers"
}

# ============================================================================
# LOAD BALANCER SECURITY GROUP
# ============================================================================

resource "aws_security_group" "lb" {
  name_prefix = "${var.environment}-k8s-lb-"
  description = "Security group for Kubernetes load balancer"
  vpc_id      = var.vpc_id

  # HTTPS access for K8s API
  ingress {
    description = "HTTPS for K8s API"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = var.allowed_k8s_api_cidr_blocks
  }

  # HTTP for applications
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS for applications
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-k8s-lb-sg"
    Environment = var.environment
    Role        = "load-balancer"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "k8s_master_sg_id" {
  description = "Master node security group ID"
  value       = aws_security_group.k8s_master.id
}

output "k8s_worker_sg_id" {
  description = "Worker node security group ID"
  value       = aws_security_group.k8s_worker.id
}

output "lb_sg_id" {
  description = "Load balancer security group ID"
  value       = aws_security_group.lb.id
}
