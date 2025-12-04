# ============================================================================
# STORAGE MODULE
# Creates EBS volumes for persistent storage in Kubernetes
# ============================================================================

resource "aws_ebs_volume" "persistent" {
  count             = var.persistent_volume_count
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]
  size              = var.persistent_volume_size
  type              = var.persistent_volume_type
  encrypted         = true

  tags = {
    Name        = "${var.environment}-k8s-pv-${count.index + 1}"
    Environment = var.environment
    Purpose     = "persistent-volume"
    VolumeIndex = count.index + 1
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "persistent_volume_ids" {
  description = "IDs of persistent EBS volumes"
  value       = aws_ebs_volume.persistent[*].id
}

output "persistent_volume_arns" {
  description = "ARNs of persistent EBS volumes"
  value       = aws_ebs_volume.persistent[*].arn
}
