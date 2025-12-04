#!/bin/bash

################################################################################
# Monitoring Stack Installation Script
# Installs Prometheus, Grafana, Alertmanager, and kube-state-metrics
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
    
    log_success "Prerequisites check passed"
}

################################################################################
# Install monitoring stack
################################################################################
install_monitoring() {
    log_info "Installing monitoring stack..."
    
    # Create namespace
    log_info "Creating monitoring namespace..."
    kubectl apply -f "${SCRIPT_DIR}/namespace.yaml"
    
    # Install Prometheus CRDs
    log_info "Installing Prometheus CRDs..."
    kubectl apply -f "${SCRIPT_DIR}/prometheus/crds.yaml"
    
    # Wait for CRDs to be established
    log_info "Waiting for CRDs to be established..."
    sleep 5
    
    # Install Prometheus Operator
    log_info "Installing Prometheus Operator..."
    kubectl apply -f "${SCRIPT_DIR}/prometheus/operator.yaml"
    
    # Wait for operator to be ready
    log_info "Waiting for Prometheus Operator to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/prometheus-operator -n monitoring || true
    
    # Install kube-state-metrics
    log_info "Installing kube-state-metrics..."
    kubectl apply -f "${SCRIPT_DIR}/prometheus/kube-state-metrics.yaml"
    
    # Install Prometheus instance
    log_info "Installing Prometheus instance..."
    kubectl apply -f "${SCRIPT_DIR}/prometheus/prometheus.yaml"
    
    # Install alert rules
    log_info "Installing alert rules..."
    kubectl apply -f "${SCRIPT_DIR}/prometheus/rules/alerts.yaml"
    
    # Install Alertmanager
    log_info "Installing Alertmanager..."
    kubectl apply -f "${SCRIPT_DIR}/alertmanager/deployment.yaml"
    
    # Install ServiceMonitors
    log_info "Installing ServiceMonitors..."
    kubectl apply -f "${SCRIPT_DIR}/servicemonitors.yaml"
    
    # Install Grafana
    log_info "Installing Grafana..."
    kubectl apply -f "${SCRIPT_DIR}/grafana/deployment.yaml"
    
    log_success "Monitoring stack installation completed"
}

################################################################################
# Wait for components to be ready
################################################################################
wait_for_ready() {
    log_info "Waiting for components to be ready..."
    
    # Wait for Prometheus
    log_info "Waiting for Prometheus..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus \
        -n monitoring --timeout=300s || log_warn "Prometheus may not be ready yet"
    
    # Wait for Grafana
    log_info "Waiting for Grafana..."
    kubectl wait --for=condition=ready pod -l app=grafana \
        -n monitoring --timeout=300s || log_warn "Grafana may not be ready yet"
    
    log_success "All components are ready"
}

################################################################################
# Display access information
################################################################################
display_info() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║          Monitoring Stack Installation Complete                     ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 PROMETHEUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Access: kubectl port-forward svc/prometheus -n monitoring 9090:9090"
    echo "URL: http://localhost:9090"
    echo ""
    echo "📈 GRAFANA"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Access: kubectl port-forward svc/grafana -n monitoring 3000:3000"
    echo "URL: http://localhost:3000"
    echo "Username: admin"
    echo "Password: admin123"
    echo ""
    echo "🔔 ALERTMANAGER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Access: kubectl port-forward svc/alertmanager -n monitoring 9093:9093"
    echo "URL: http://localhost:9093"
    echo ""
    echo "✅ NEXT STEPS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Access Grafana and explore pre-configured Prometheus datasource"
    echo "2. Import dashboards for Kubernetes monitoring"
    echo "3. Configure Slack/Email notifications in Alertmanager"
    echo "4. Review alert rules in Prometheus"
    echo ""
}

################################################################################
# Main installation flow
################################################################################
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║          Installing Monitoring Stack                                 ║"
    echo "║          Prometheus + Grafana + Alertmanager                         ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    install_monitoring
    wait_for_ready
    display_info
}

main "$@"
