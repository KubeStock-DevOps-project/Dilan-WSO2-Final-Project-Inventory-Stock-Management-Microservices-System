#!/bin/bash
# ============================================================================
# DEPLOY SELF-MANAGED KUBERNETES CLUSTER
# End-to-end deployment: Terraform → Ansible → Kubernetes → ArgoCD
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
K8S_DISTRIBUTION=${K8S_DISTRIBUTION:-"k3s"}  # k3s, kubeadm, or rke2
TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/terraform" && pwd)"
ANSIBLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/ansible" && pwd)"
K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s" && pwd)"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    local missing=0
    
    # Check Terraform
    if command -v terraform &> /dev/null; then
        print_success "Terraform: $(terraform version -json | jq -r '.terraform_version')"
    else
        print_error "Terraform not found. Install from: https://www.terraform.io/downloads"
        missing=1
    fi
    
    # Check Ansible
    if command -v ansible &> /dev/null; then
        print_success "Ansible: $(ansible --version | head -1 | awk '{print $2}')"
    else
        print_error "Ansible not found. Install: apt install ansible"
        missing=1
    fi
    
    # Check kubectl
    if command -v kubectl &> /dev/null; then
        print_success "kubectl: $(kubectl version --client -o json | jq -r '.clientVersion.gitVersion')"
    else
        print_warning "kubectl not found. Will be installed with Kubernetes."
    fi
    
    # Check AWS CLI
    if command -v aws &> /dev/null; then
        print_success "AWS CLI: $(aws --version | awk '{print $1}')"
    else
        print_error "AWS CLI not found. Install: apt install awscli"
        missing=1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found (optional). Install: apt install jq"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Missing required tools. Please install them first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    
    print_success "AWS Account: $(aws sts get-caller-identity --query 'Account' --output text)"
    print_success "All prerequisites met!"
}

deploy_terraform() {
    print_header "STEP 1: DEPLOYING INFRASTRUCTURE WITH TERRAFORM"
    
    cd "$TERRAFORM_DIR"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        print_error "terraform.tfvars not found!"
        echo "Copy terraform.tfvars.example to terraform.tfvars and configure it."
        exit 1
    fi
    
    print_success "Initializing Terraform..."
    terraform init
    
    print_success "Validating configuration..."
    terraform validate
    
    print_success "Planning infrastructure..."
    terraform plan -out=tfplan
    
    echo ""
    read -p "Apply this Terraform plan? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi
    
    print_success "Applying infrastructure..."
    terraform apply tfplan
    
    print_success "Terraform deployment complete!"
    
    # Save outputs
    terraform output -json > /tmp/terraform-outputs.json
    
    echo ""
    echo "Infrastructure Details:"
    echo "======================="
    terraform output
}

install_kubernetes() {
    print_header "STEP 2: INSTALLING KUBERNETES WITH ANSIBLE"
    
    cd "$ANSIBLE_DIR"
    
    # Wait for instances to be ready
    print_success "Waiting for instances to initialize (30 seconds)..."
    sleep 30
    
    # Test connectivity
    print_success "Testing SSH connectivity..."
    if ! ansible -i inventory/hosts.ini all -m ping; then
        print_error "Cannot connect to nodes. Check SSH keys and security groups."
        exit 1
    fi
    
    print_success "All nodes are accessible!"
    
    # Install Kubernetes
    case $K8S_DISTRIBUTION in
        k3s)
            print_success "Installing K3s..."
            ansible-playbook -i inventory/hosts.ini playbooks/install-k3s.yml
            ;;
        kubeadm)
            print_success "Installing Kubeadm..."
            ansible-playbook -i inventory/hosts.ini playbooks/install-kubeadm.yml
            ;;
        rke2)
            print_success "Installing RKE2..."
            ansible-playbook -i inventory/hosts.ini playbooks/install-rke2.yml
            ;;
        *)
            print_error "Unknown K8s distribution: $K8S_DISTRIBUTION"
            exit 1
            ;;
    esac
    
    print_success "Kubernetes installation complete!"
}

configure_kubectl() {
    print_header "STEP 3: CONFIGURING KUBECTL"
    
    export KUBECONFIG="$TERRAFORM_DIR/kubeconfig"
    
    if [ ! -f "$KUBECONFIG" ]; then
        print_error "Kubeconfig not found at $KUBECONFIG"
        exit 1
    fi
    
    print_success "Kubeconfig location: $KUBECONFIG"
    echo "export KUBECONFIG=$KUBECONFIG" >> ~/.bashrc
    
    print_success "Verifying cluster access..."
    kubectl cluster-info
    
    print_success "Cluster nodes:"
    kubectl get nodes -o wide
    
    print_success "System pods:"
    kubectl get pods -n kube-system
}

deploy_base_manifests() {
    print_header "STEP 4: DEPLOYING BASE KUBERNETES MANIFESTS"
    
    if [ ! -d "$K8S_DIR/base" ]; then
        print_warning "Base manifests not found at $K8S_DIR/base"
        return
    fi
    
    print_success "Applying base manifests..."
    kubectl apply -f "$K8S_DIR/base/"
    
    print_success "Base manifests deployed!"
    kubectl get all -A
}

deploy_argocd() {
    print_header "STEP 5: DEPLOYING ARGOCD FOR GITOPS"
    
    if [ ! -d "$K8S_DIR/argocd" ]; then
        print_warning "ArgoCD manifests not found at $K8S_DIR/argocd"
        return
    fi
    
    print_success "Installing ArgoCD..."
    kubectl create namespace argocd || true
    kubectl apply -n argocd -f "$K8S_DIR/argocd/"
    
    print_success "Waiting for ArgoCD to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment -n argocd --all
    
    # Get ArgoCD admin password
    ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
    
    print_success "ArgoCD deployed successfully!"
    echo ""
    echo "ArgoCD UI Access:"
    echo "================="
    echo "Username: admin"
    echo "Password: $ARGOCD_PASSWORD"
    echo ""
    echo "To access ArgoCD UI:"
    echo "kubectl port-forward svc/argocd-server -n argocd 8080:443"
    echo "Then visit: https://localhost:8080"
}

deploy_monitoring() {
    print_header "STEP 6: DEPLOYING MONITORING STACK"
    
    if [ ! -d "$K8S_DIR/monitoring" ]; then
        print_warning "Monitoring manifests not found at $K8S_DIR/monitoring"
        return
    fi
    
    print_success "Installing Prometheus and Grafana..."
    kubectl apply -f "$K8S_DIR/monitoring/"
    
    print_success "Monitoring stack deployed!"
}

print_summary() {
    print_header "DEPLOYMENT COMPLETE!"
    
    echo -e "${GREEN}✓ Infrastructure provisioned with Terraform${NC}"
    echo -e "${GREEN}✓ Kubernetes ($K8S_DISTRIBUTION) installed with Ansible${NC}"
    echo -e "${GREEN}✓ kubectl configured${NC}"
    echo -e "${GREEN}✓ Base manifests deployed${NC}"
    echo -e "${GREEN}✓ ArgoCD installed${NC}"
    echo -e "${GREEN}✓ Monitoring stack deployed${NC}"
    
    echo ""
    echo "============================================"
    echo "CLUSTER INFORMATION"
    echo "============================================"
    
    kubectl get nodes
    
    echo ""
    echo "============================================"
    echo "NEXT STEPS"
    echo "============================================"
    echo "1. Set kubeconfig:"
    echo "   export KUBECONFIG=$TERRAFORM_DIR/kubeconfig"
    echo ""
    echo "2. Access ArgoCD:"
    echo "   kubectl port-forward svc/argocd-server -n argocd 8080:443"
    echo ""
    echo "3. Access Grafana:"
    echo "   kubectl port-forward svc/grafana -n monitoring 3000:3000"
    echo ""
    echo "4. Deploy your applications:"
    echo "   kubectl apply -f <your-manifests>"
    echo ""
    echo "============================================"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    print_header "KUBERNETES CLUSTER DEPLOYMENT SCRIPT"
    
    echo "Configuration:"
    echo "  Kubernetes Distribution: $K8S_DISTRIBUTION"
    echo "  Terraform Directory: $TERRAFORM_DIR"
    echo "  Ansible Directory: $ANSIBLE_DIR"
    echo "  K8s Manifests: $K8S_DIR"
    echo ""
    
    read -p "Continue with deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
    
    # Execute deployment steps
    check_prerequisites
    deploy_terraform
    install_kubernetes
    configure_kubectl
    deploy_base_manifests
    deploy_argocd
    deploy_monitoring
    print_summary
    
    print_success "🎉 All done! Your Kubernetes cluster is ready!"
}

# Run main function
main "$@"
