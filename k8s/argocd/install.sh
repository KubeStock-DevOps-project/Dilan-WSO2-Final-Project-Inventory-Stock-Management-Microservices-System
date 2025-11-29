#!/bin/bash

################################################################################
# ArgoCD Installation Script
# Installs ArgoCD and configures GitOps for the Inventory Management System
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
ARGOCD_VERSION="stable"
NAMESPACE="argocd"
DOMAIN="${ARGOCD_DOMAIN:-argocd.yourdomain.com}"

################################################################################
# Pre-flight checks
################################################################################
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

################################################################################
# Install ArgoCD
################################################################################
install_argocd() {
    log_info "Installing ArgoCD..."
    
    # Create namespace
    kubectl apply -f k8s/argocd/namespace.yaml
    
    # Install ArgoCD
    log_info "Downloading ArgoCD manifests..."
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml
    
    # Wait for ArgoCD to be ready
    log_info "Waiting for ArgoCD to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/argocd-server \
        deployment/argocd-repo-server \
        deployment/argocd-applicationset-controller \
        -n argocd
    
    log_info "ArgoCD installation completed ✓"
}

################################################################################
# Configure ArgoCD
################################################################################
configure_argocd() {
    log_info "Configuring ArgoCD..."
    
    # Apply custom configurations
    kubectl apply -f k8s/argocd/argocd-cm.yaml
    kubectl apply -f k8s/argocd/argocd-rbac-cm.yaml
    kubectl apply -f k8s/argocd/argocd-notifications-cm.yaml
    
    # Restart ArgoCD server to apply changes
    kubectl rollout restart deployment/argocd-server -n argocd
    kubectl rollout status deployment/argocd-server -n argocd
    
    log_info "ArgoCD configuration completed ✓"
}

################################################################################
# Setup Ingress
################################################################################
setup_ingress() {
    log_info "Setting up ArgoCD ingress..."
    
    # Update domain in ingress
    sed -i "s/argocd.yourdomain.com/${DOMAIN}/g" k8s/argocd/argocd-server-ingress.yaml
    
    # Apply ingress
    kubectl apply -f k8s/argocd/argocd-server-ingress.yaml
    
    log_info "Ingress configured for: ${DOMAIN}"
}

################################################################################
# Create Projects
################################################################################
create_projects() {
    log_info "Creating ArgoCD projects..."
    
    kubectl apply -f k8s/argocd/projects/staging-project.yaml
    kubectl apply -f k8s/argocd/projects/production-project.yaml
    
    log_info "Projects created ✓"
}

################################################################################
# Create Applications
################################################################################
create_applications() {
    log_info "Creating ArgoCD applications..."
    
    # Staging applications
    kubectl apply -f k8s/argocd/applications/staging/
    
    # Production applications (optional)
    read -p "Deploy production applications? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl apply -f k8s/argocd/applications/production/
        log_info "Production applications created ✓"
    else
        log_warn "Skipping production applications"
    fi
    
    log_info "Applications created ✓"
}

################################################################################
# Get admin password
################################################################################
get_admin_password() {
    log_info "Retrieving ArgoCD admin password..."
    
    # Wait for secret to be created
    sleep 5
    
    PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
    
    echo ""
    echo "========================================"
    echo "ArgoCD Admin Credentials"
    echo "========================================"
    echo "Username: admin"
    echo "Password: ${PASSWORD}"
    echo "========================================"
    echo ""
    
    # Save to file
    echo "admin:${PASSWORD}" > argocd-credentials.txt
    chmod 600 argocd-credentials.txt
    log_info "Credentials saved to argocd-credentials.txt"
}

################################################################################
# Setup ArgoCD CLI
################################################################################
setup_cli() {
    log_info "Setting up ArgoCD CLI..."
    
    if ! command -v argocd &> /dev/null; then
        log_warn "ArgoCD CLI not found. Installing..."
        
        # Detect OS
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        
        if [[ "$ARCH" == "x86_64" ]]; then
            ARCH="amd64"
        elif [[ "$ARCH" == "aarch64" ]]; then
            ARCH="arm64"
        fi
        
        # Download
        curl -sSL -o argocd-${OS}-${ARCH} https://github.com/argoproj/argo-cd/releases/latest/download/argocd-${OS}-${ARCH}
        sudo install -m 555 argocd-${OS}-${ARCH} /usr/local/bin/argocd
        rm argocd-${OS}-${ARCH}
        
        log_info "ArgoCD CLI installed ✓"
    else
        log_info "ArgoCD CLI already installed ✓"
    fi
}

################################################################################
# Port forward for local access
################################################################################
port_forward() {
    log_info "Starting port-forward for local access..."
    echo ""
    echo "Access ArgoCD at: https://localhost:8080"
    echo "Press Ctrl+C to stop port forwarding"
    echo ""
    
    kubectl port-forward svc/argocd-server -n argocd 8080:443
}

################################################################################
# Display summary
################################################################################
display_summary() {
    echo ""
    echo "========================================"
    echo "ArgoCD Installation Summary"
    echo "========================================"
    echo "✓ ArgoCD installed in namespace: ${NAMESPACE}"
    echo "✓ Projects created: staging, production"
    echo "✓ Applications deployed"
    echo ""
    echo "Access methods:"
    echo "  1. Port-forward: kubectl port-forward svc/argocd-server -n argocd 8080:443"
    echo "  2. Ingress: https://${DOMAIN}"
    echo ""
    echo "Login with:"
    echo "  Username: admin"
    echo "  Password: (see argocd-credentials.txt)"
    echo ""
    echo "Next steps:"
    echo "  1. Update argocd-cm.yaml with your repository URL"
    echo "  2. Configure notifications (Slack/Email)"
    echo "  3. Update ingress domain in argocd-server-ingress.yaml"
    echo "  4. Review RBAC policies in argocd-rbac-cm.yaml"
    echo "========================================"
    echo ""
}

################################################################################
# Main installation flow
################################################################################
main() {
    log_info "Starting ArgoCD installation..."
    
    check_prerequisites
    install_argocd
    configure_argocd
    create_projects
    create_applications
    get_admin_password
    setup_cli
    
    display_summary
    
    # Ask if user wants to start port-forward
    read -p "Start port-forward for local access? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        port_forward
    fi
}

# Run installation
main "$@"
