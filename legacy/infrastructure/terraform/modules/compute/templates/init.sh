#!/bin/bash
#============================================================================
# Node Initialization Script
# Prepares Ubuntu nodes for Kubernetes installation
#============================================================================

set -e

# Variables
NODE_ROLE="${node_role}"
NODE_INDEX="${node_index}"

echo "============================================"
echo "Initializing K8s $NODE_ROLE Node #$NODE_INDEX"
echo "============================================"

# Update system
apt-get update
apt-get upgrade -y

# Install basic tools
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    net-tools \
    wget \
    vim \
    htop \
    jq \
    git

# Configure hostname
hostnamectl set-hostname "k8s-$NODE_ROLE-$NODE_INDEX"

# Disable swap (required for Kubernetes)
swapoff -a
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Set sysctl parameters
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system

# Install Docker (container runtime)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Configure containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

systemctl restart containerd
systemctl enable containerd

# Format and mount data volume
if [ -b /dev/nvme1n1 ] || [ -b /dev/xvdb ]; then
    DEVICE=$(lsblk -n -o NAME,TYPE | grep disk | tail -1 | awk '{print "/dev/"$1}')
    if ! grep -qs "$DEVICE" /proc/mounts; then
        mkfs.ext4 $DEVICE
        mkdir -p /mnt/data
        mount $DEVICE /mnt/data
        echo "$DEVICE /mnt/data ext4 defaults 0 0" >> /etc/fstab
    fi
fi

# Create directories for Kubernetes
mkdir -p /etc/kubernetes
mkdir -p /var/lib/kubelet
mkdir -p /var/lib/etcd

echo "Node initialization complete!"
echo "Ready for Ansible provisioning"
