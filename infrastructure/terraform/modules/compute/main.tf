# ============================================================================
# COMPUTE MODULE
# Creates EC2 instances for Kubernetes master and worker nodes
# ============================================================================

# Get latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ============================================================================
# MASTER NODES
# ============================================================================

resource "aws_instance" "master" {
  count         = var.master_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.master_instance_type

  subnet_id              = var.public_subnet_ids[count.index % length(var.public_subnet_ids)]
  vpc_security_group_ids = [var.master_security_group_id]
  key_name               = var.ssh_key_name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.environment}-k8s-master-${count.index + 1}-root"
    }
  }

  ebs_block_device {
    device_name           = "/dev/sdb"
    volume_type           = "gp3"
    volume_size           = var.data_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.environment}-k8s-master-${count.index + 1}-data"
    }
  }

  user_data = templatefile("${path.module}/templates/init.sh", {
    node_role  = "master"
    node_index = count.index + 1
  })

  tags = {
    Name        = "${var.environment}-k8s-master-${count.index + 1}"
    Environment = var.environment
    Role        = "master"
    Cluster     = var.cluster_name
    NodeIndex   = count.index + 1
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# ============================================================================
# WORKER NODES
# ============================================================================

resource "aws_instance" "worker" {
  count         = var.worker_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.worker_instance_type

  subnet_id              = var.public_subnet_ids[count.index % length(var.public_subnet_ids)]
  vpc_security_group_ids = [var.worker_security_group_id]
  key_name               = var.ssh_key_name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.environment}-k8s-worker-${count.index + 1}-root"
    }
  }

  ebs_block_device {
    device_name           = "/dev/sdb"
    volume_type           = "gp3"
    volume_size           = var.data_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.environment}-k8s-worker-${count.index + 1}-data"
    }
  }

  user_data = templatefile("${path.module}/templates/init.sh", {
    node_role  = "worker"
    node_index = count.index + 1
  })

  tags = {
    Name        = "${var.environment}-k8s-worker-${count.index + 1}"
    Environment = var.environment
    Role        = "worker"
    Cluster     = var.cluster_name
    NodeIndex   = count.index + 1
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "master_instance_ids" {
  description = "Master node instance IDs"
  value       = aws_instance.master[*].id
}

output "master_public_ips" {
  description = "Master node public IPs"
  value       = aws_instance.master[*].public_ip
}

output "master_private_ips" {
  description = "Master node private IPs"
  value       = aws_instance.master[*].private_ip
}

output "worker_instance_ids" {
  description = "Worker node instance IDs"
  value       = aws_instance.worker[*].id
}

output "worker_public_ips" {
  description = "Worker node public IPs"
  value       = aws_instance.worker[*].public_ip
}

output "worker_private_ips" {
  description = "Worker node private IPs"
  value       = aws_instance.worker[*].private_ip
}
