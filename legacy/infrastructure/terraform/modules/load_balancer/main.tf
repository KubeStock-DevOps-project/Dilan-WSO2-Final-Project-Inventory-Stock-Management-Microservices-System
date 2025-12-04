# ============================================================================
# LOAD BALANCER MODULE
# Creates Network Load Balancer for K8s API and application traffic
# ============================================================================

# Network Load Balancer for K8s API
resource "aws_lb" "k8s_api" {
  name               = "${var.environment}-k8s-api-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = var.subnet_ids

  enable_deletion_protection       = false
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "${var.environment}-k8s-api-nlb"
    Environment = var.environment
    Purpose     = "kubernetes-api"
  }
}

# Target Group for K8s API (port 6443)
resource "aws_lb_target_group" "k8s_api" {
  name     = "${var.environment}-k8s-api-tg"
  port     = 6443
  protocol = "TCP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    protocol            = "HTTPS"
    path                = var.health_check_path
    port                = var.health_check_port
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 10
  }

  tags = {
    Name        = "${var.environment}-k8s-api-tg"
    Environment = var.environment
  }
}

# Listener for K8s API
resource "aws_lb_listener" "k8s_api" {
  load_balancer_arn = aws_lb.k8s_api.arn
  port              = "6443"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.k8s_api.arn
  }
}

# Attach master nodes to target group
resource "aws_lb_target_group_attachment" "master" {
  count            = length(var.master_instance_ids)
  target_group_arn = aws_lb_target_group.k8s_api.arn
  target_id        = var.master_instance_ids[count.index]
  port             = 6443
}

# ============================================================================
# APPLICATION LOAD BALANCER (HTTP/HTTPS)
# ============================================================================

# Application Load Balancer
resource "aws_lb" "apps" {
  name               = "${var.environment}-k8s-apps-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.subnet_ids

  enable_deletion_protection = false
  enable_http2               = true

  tags = {
    Name        = "${var.environment}-k8s-apps-alb"
    Environment = var.environment
    Purpose     = "applications"
  }
}

# Target Group for HTTP traffic
resource "aws_lb_target_group" "http" {
  name     = "${var.environment}-k8s-http-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/healthz"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 10
    matcher             = "200-399"
  }

  tags = {
    Name        = "${var.environment}-k8s-http-tg"
    Environment = var.environment
  }
}

# HTTP Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.apps.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.http.arn
  }
}

# Attach worker nodes to HTTP target group
resource "aws_lb_target_group_attachment" "http_workers" {
  count            = length(var.worker_instance_ids)
  target_group_arn = aws_lb_target_group.http.arn
  target_id        = var.worker_instance_ids[count.index]
  port             = 30080 # NodePort for ingress controller
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "lb_dns_name" {
  description = "Load balancer DNS name for K8s API"
  value       = aws_lb.k8s_api.dns_name
}

output "lb_arn" {
  description = "Load balancer ARN"
  value       = aws_lb.k8s_api.arn
}

output "app_lb_dns_name" {
  description = "Application load balancer DNS name"
  value       = aws_lb.apps.dns_name
}

output "app_lb_arn" {
  description = "Application load balancer ARN"
  value       = aws_lb.apps.arn
}
