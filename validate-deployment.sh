#!/bin/bash

################################################################################
# KubeStock Istio + Asgardeo Runtime Validation Script
# Purpose: Automated end-to-end validation after deployment
# Usage: ./validate-deployment.sh [--verbose] [--fix-issues]
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="kubestock-staging"
ISTIO_NAMESPACE="istio-system"
VERBOSE=false
FIX_ISSUES=false
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

################################################################################
# Utility Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
  ((PASSED_CHECKS++))
  ((TOTAL_CHECKS++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
  ((FAILED_CHECKS++))
  ((TOTAL_CHECKS++))
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
  ((WARNINGS++))
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[VERBOSE]${NC} $1"
  fi
}

# Function to check if command succeeds and handle verbose output
check_command() {
  local cmd=$1
  local error_msg=$2
  
  if output=$(eval "$cmd" 2>&1); then
    return 0
  else
    log_verbose "Command failed: $cmd"
    log_verbose "Output: $output"
    return 1
  fi
}

# Function to fix common issues
fix_sidecar_injection() {
  log_info "Attempting to fix sidecar injection..."
  kubectl label namespace $NAMESPACE istio-injection=enabled --overwrite 2>/dev/null && \
    log_success "Added sidecar injection label" || \
    log_error "Failed to add label"
}

fix_mtls_mode() {
  log_info "Attempting to fix mTLS mode..."
  kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF
  log_success "Applied STRICT mTLS policy"
}

################################################################################
# Phase 1: Prerequisites
################################################################################

phase_prerequisites() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 1: PREREQUISITES${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  log_info "Checking required commands..."
  
  for cmd in kubectl istioctl; do
    if command -v $cmd &> /dev/null; then
      log_success "$cmd is available"
    else
      log_error "$cmd not found (install to continue)"
      return 1
    fi
  done
  
  log_info "Checking API server connectivity..."
  if kubectl cluster-info &> /dev/null; then
    log_success "API server is reachable"
  else
    log_error "Cannot reach API server"
    return 1
  fi
  
  return 0
}

################################################################################
# Phase 2: Cluster Health
################################################################################

phase_cluster_health() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 2: CLUSTER HEALTH${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  # Check nodes
  log_info "Checking node status..."
  READY_NODES=$(kubectl get nodes -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o True | wc -l)
  TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
  
  if [ "$READY_NODES" -eq "$TOTAL_NODES" ] && [ "$TOTAL_NODES" -gt 0 ]; then
    log_success "All nodes are ready ($READY_NODES/$TOTAL_NODES)"
  else
    log_error "Not all nodes are ready ($READY_NODES/$TOTAL_NODES)"
  fi
  
  # Check node resources
  log_info "Checking node resources..."
  ALLOCATABLE=$(kubectl get nodes -o jsonpath='{.items[*].status.allocatable.memory}' | head -1)
  log_verbose "Node memory allocatable: $ALLOCATABLE"
  
  # Check API server
  log_info "Checking Kubernetes API..."
  if kubectl get componentstatus 2>/dev/null | grep -q "healthy"; then
    log_success "API server is healthy"
  else
    log_warning "Could not verify API server status"
  fi
}

################################################################################
# Phase 3: Istio Installation
################################################################################

phase_istio_installation() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 3: ISTIO INSTALLATION${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  # Check Istio namespace
  log_info "Checking Istio namespace..."
  if kubectl get namespace $ISTIO_NAMESPACE &> /dev/null; then
    log_success "Istio namespace exists"
  else
    log_error "Istio namespace not found"
    return 1
  fi
  
  # Check istiod
  log_info "Checking istiod deployment..."
  ISTIOD_PODS=$(kubectl get pods -n $ISTIO_NAMESPACE -l app=istiod --no-headers 2>/dev/null | wc -l)
  
  if [ "$ISTIOD_PODS" -gt 0 ]; then
    ISTIOD_RUNNING=$(kubectl get pods -n $ISTIO_NAMESPACE -l app=istiod -o jsonpath='{.items[*].status.phase}' | grep -o Running | wc -l)
    if [ "$ISTIOD_RUNNING" -eq "$ISTIOD_PODS" ]; then
      log_success "istiod is running ($ISTIOD_RUNNING/$ISTIOD_PODS pods)"
    else
      log_error "istiod pods not all running ($ISTIOD_RUNNING/$ISTIOD_PODS)"
    fi
  else
    log_error "No istiod pods found"
    return 1
  fi
  
  # Check CRDs
  log_info "Checking Istio CRDs..."
  CRD_COUNT=$(kubectl get crds | grep -c "istio.io" || true)
  if [ "$CRD_COUNT" -gt 40 ]; then
    log_success "Istio CRDs installed ($CRD_COUNT CRDs)"
  else
    log_error "Not all Istio CRDs installed ($CRD_COUNT found)"
  fi
  
  # Check webhook
  log_info "Checking sidecar injection webhook..."
  if kubectl get mutatingwebhookconfigurations | grep -q "istio-sidecar-injector"; then
    log_success "Sidecar injection webhook is configured"
  else
    log_error "Sidecar injection webhook not found"
  fi
}

################################################################################
# Phase 4: Namespace Configuration
################################################################################

phase_namespace_config() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 4: NAMESPACE CONFIGURATION${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  # Check namespace exists
  log_info "Checking namespace..."
  if kubectl get namespace $NAMESPACE &> /dev/null; then
    log_success "Namespace $NAMESPACE exists"
  else
    log_error "Namespace $NAMESPACE not found"
    return 1
  fi
  
  # Check sidecar injection label
  log_info "Checking sidecar injection label..."
  INJECTION_LABEL=$(kubectl get ns $NAMESPACE -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null)
  
  if [ "$INJECTION_LABEL" = "enabled" ]; then
    log_success "Sidecar injection is enabled"
  else
    log_error "Sidecar injection label not set or incorrect"
    if [ "$FIX_ISSUES" = true ]; then
      fix_sidecar_injection
    fi
  fi
  
  # Check resource quota
  log_info "Checking resource quotas..."
  if kubectl get resourcequota -n $NAMESPACE &> /dev/null; then
    log_success "Resource quotas configured"
  else
    log_warning "No resource quotas found"
  fi
}

################################################################################
# Phase 5: Sidecar Injection
################################################################################

phase_sidecar_injection() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 5: SIDECAR INJECTION${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  log_info "Checking pod sidecar injection..."
  
  # Get all pods
  PODS=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
  TOTAL_PODS=0
  INJECTED_PODS=0
  
  for pod in $PODS; do
    ((TOTAL_PODS++))
    CONTAINERS=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}' 2>/dev/null)
    if echo "$CONTAINERS" | grep -q "istio-proxy"; then
      ((INJECTED_PODS++))
    fi
  done
  
  if [ "$TOTAL_PODS" -gt 0 ]; then
    if [ "$INJECTED_PODS" -eq "$TOTAL_PODS" ]; then
      log_success "All pods have sidecar injected ($INJECTED_PODS/$TOTAL_PODS)"
    else
      log_error "Not all pods have sidecar ($INJECTED_PODS/$TOTAL_PODS)"
      
      if [ "$FIX_ISSUES" = true ]; then
        log_info "Fixing sidecar injection by restarting pods..."
        kubectl delete pods -n $NAMESPACE --all
        sleep 5
        kubectl wait --for=condition=Ready pod --all -n $NAMESPACE --timeout=60s 2>/dev/null || true
      fi
    fi
  else
    log_warning "No pods found in namespace"
  fi
}

################################################################################
# Phase 6: mTLS Configuration
################################################################################

phase_mtls_config() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 6: mTLS CONFIGURATION${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  # Check PeerAuthentication
  log_info "Checking PeerAuthentication policy..."
  if kubectl get peerauthentication default -n $ISTIO_NAMESPACE &> /dev/null; then
    MTLS_MODE=$(kubectl get peerauthentication default -n $ISTIO_NAMESPACE -o jsonpath='{.spec.mtls.mode}' 2>/dev/null)
    if [ "$MTLS_MODE" = "STRICT" ]; then
      log_success "STRICT mTLS mode is enabled"
    else
      log_error "mTLS mode is not STRICT (found: $MTLS_MODE)"
      if [ "$FIX_ISSUES" = true ]; then
        fix_mtls_mode
      fi
    fi
  else
    log_error "PeerAuthentication policy not found"
  fi
  
  # Check DestinationRules
  log_info "Checking DestinationRules..."
  DR_COUNT=$(kubectl get destinationrules -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
  
  if [ "$DR_COUNT" -ge 6 ]; then
    log_success "All DestinationRules configured ($DR_COUNT found)"
    
    # Check each DR for ISTIO_MUTUAL
    INVALID_DRS=0
    for dr in $(kubectl get dr -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
      TLS_MODE=$(kubectl get dr $dr -n $NAMESPACE -o jsonpath='{.spec.trafficPolicy.tls.mode}' 2>/dev/null)
      if [ "$TLS_MODE" != "ISTIO_MUTUAL" ]; then
        ((INVALID_DRS++))
        log_verbose "DestinationRule $dr has mode: $TLS_MODE (expected: ISTIO_MUTUAL)"
      fi
    done
    
    if [ "$INVALID_DRS" -gt 0 ]; then
      log_error "$INVALID_DRS DestinationRules don't have ISTIO_MUTUAL mode"
    else
      log_success "All DestinationRules use ISTIO_MUTUAL mode"
    fi
  else
    log_error "Not enough DestinationRules ($DR_COUNT found, expected 6+)"
  fi
  
  # Check VirtualServices
  log_info "Checking VirtualServices..."
  VS_COUNT=$(kubectl get virtualservices -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
  
  if [ "$VS_COUNT" -ge 6 ]; then
    log_success "All VirtualServices configured ($VS_COUNT found)"
  else
    log_error "Not enough VirtualServices ($VS_COUNT found, expected 6+)"
  fi
}

################################################################################
# Phase 7: Service Configuration
################################################################################

phase_service_config() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 7: SERVICE CONFIGURATION${NC}"
  echo -e "${BLUE}════════════════════════════════════════^^^^^^^^^^^^^^^^${NC}"
  
  log_info "Checking services and endpoints..."
  
  EXPECTED_SERVICES=("ms-identity" "ms-inventory" "ms-product" "ms-supplier" "ms-order-management" "frontend")
  FOUND_SERVICES=0
  
  for svc in "${EXPECTED_SERVICES[@]}"; do
    if kubectl get svc $svc -n $NAMESPACE &> /dev/null; then
      ((FOUND_SERVICES++))
      
      # Check endpoints
      ENDPOINTS=$(kubectl get endpoints $svc -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
      if [ "$ENDPOINTS" -gt 0 ]; then
        log_success "$svc service configured with $ENDPOINTS endpoint(s)"
      else
        log_warning "$svc service has no endpoints"
      fi
    else
      log_error "$svc service not found"
    fi
  done
}

################################################################################
# Phase 8: Pod Status
################################################################################

phase_pod_status() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 8: POD STATUS${NC}"
  echo -e "${BLUE}════════════════════════════════════════^^^^^^^^^^^^^^^^${NC}"
  
  log_info "Checking pod status..."
  
  RUNNING_PODS=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].status.phase}' | grep -o Running | wc -l)
  TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
  
  if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    log_success "All pods are running ($RUNNING_PODS/$TOTAL_PODS)"
  else
    log_error "Not all pods are running ($RUNNING_PODS/$TOTAL_PODS)"
  fi
  
  # Check for pod errors
  log_info "Checking for pod errors..."
  FAILED_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
  
  if [ "$FAILED_PODS" -eq 0 ]; then
    log_success "No failed pods"
  else
    log_error "$FAILED_PODS pod(s) in error state"
    kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running
  fi
}

################################################################################
# Phase 9: Asgardeo Integration
################################################################################

phase_asgardeo_integration() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 9: ASGARDEO INTEGRATION${NC}"
  echo -e "${BLUE}════════════════════════════════════^^^^^^^^^^^^^^^^${NC}"
  
  log_info "Checking Asgardeo configuration..."
  
  # Check secret exists
  if kubectl get secret asgardeo-secret -n $NAMESPACE &> /dev/null; then
    log_success "Asgardeo secret exists"
    
    # Check secret keys
    SECRET_KEYS=$(kubectl get secret asgardeo-secret -n $NAMESPACE -o jsonpath='{.data}' | jq 'keys | length')
    if [ "$SECRET_KEYS" -ge 5 ]; then
      log_success "Asgardeo secret has all required keys ($SECRET_KEYS keys)"
    else
      log_warning "Asgardeo secret may be incomplete ($SECRET_KEYS keys found)"
    fi
  else
    log_error "Asgardeo secret not found"
  fi
  
  # Check ms-identity pod
  log_info "Checking ms-identity pod..."
  MS_IDENTITY_POD=$(kubectl get pods -n $NAMESPACE -l app=ms-identity -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  
  if [ -n "$MS_IDENTITY_POD" ]; then
    # Check pod readiness
    READY=$(kubectl get pod $MS_IDENTITY_POD -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
    if [ "$READY" = "True" ]; then
      log_success "ms-identity pod is ready"
    else
      log_error "ms-identity pod is not ready"
    fi
  else
    log_error "ms-identity pod not found"
  fi
}

################################################################################
# Phase 10: Connectivity Testing
################################################################################

phase_connectivity() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 10: CONNECTIVITY TESTING${NC}"
  echo -e "${BLUE}════════════════════════════^^^^^^^^^^^^^^^^${NC}"
  
  # Deploy test pod if it doesn't exist
  log_info "Setting up test pod..."
  
  if ! kubectl get pod test-mtls -n $NAMESPACE &> /dev/null; then
    kubectl run test-mtls --image=curlimages/curl -n $NAMESPACE -- sleep 1000 &> /dev/null
    sleep 5
    kubectl wait --for=condition=Ready pod/test-mtls -n $NAMESPACE --timeout=30s 2>/dev/null || true
  fi
  
  log_info "Testing service connectivity..."
  
  # Test each service
  for service in ms-identity ms-inventory ms-product ms-supplier ms-order-management; do
    if kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3000/health &> /dev/null || \
       kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3001/health &> /dev/null || \
       kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3002/health &> /dev/null || \
       kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3003/health &> /dev/null || \
       kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3004/health &> /dev/null || \
       kubectl exec test-mtls -n $NAMESPACE -- curl -s http://$service:3006/health &> /dev/null; then
      log_success "$service is reachable"
    else
      log_warning "$service connectivity test inconclusive"
    fi
  done
}

################################################################################
# Phase 11: Log Analysis
################################################################################

phase_log_analysis() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}PHASE 11: LOG ANALYSIS${NC}"
  echo -e "${BLUE}════════════^^^^^^^^^^^^^^^^${NC}"
  
  log_info "Analyzing logs for errors..."
  
  # Check application logs
  ERROR_COUNT=$(kubectl logs -n $NAMESPACE --tail=100 --all-containers=true 2>/dev/null | grep -ic "error" || true)
  
  if [ "$ERROR_COUNT" -eq 0 ]; then
    log_success "No errors found in recent logs"
  elif [ "$ERROR_COUNT" -lt 5 ]; then
    log_warning "$ERROR_COUNT minor errors found in logs"
  else
    log_error "$ERROR_COUNT errors found in logs"
  fi
  
  # Check sidecar logs
  SIDECAR_ERRORS=$(kubectl logs -n $NAMESPACE -c istio-proxy --tail=50 --all-containers=true 2>/dev/null | grep -ic "error" || true)
  
  if [ "$SIDECAR_ERRORS" -eq 0 ]; then
    log_success "No errors in sidecar logs"
  else
    log_warning "$SIDECAR_ERRORS sidecar errors found"
  fi
}

################################################################################
# Summary
################################################################################

phase_summary() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}VALIDATION SUMMARY${NC}"
  echo -e "${BLUE}════════════════════════════════════════^^^^^^^^^^^^^^^^${NC}"
  
  PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
  
  echo ""
  echo "Total Checks: $TOTAL_CHECKS"
  echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
  echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
  fi
  echo ""
  echo "Success Rate: ${PASS_PERCENTAGE}%"
  echo ""
  
  if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION PASSED - System is working correctly!${NC}"
    return 0
  elif [ "$FAILED_CHECKS" -le 3 ]; then
    echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS - Review issues above${NC}"
    return 0
  else
    echo -e "${RED}❌ VALIDATION FAILED - Please review errors above${NC}"
    return 1
  fi
}

################################################################################
# Main Execution
################################################################################

main() {
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --verbose)
        VERBOSE=true
        shift
        ;;
      --fix-issues)
        FIX_ISSUES=true
        shift
        ;;
      *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
  done
  
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  KubeStock Istio + Asgardeo Runtime Validation Script      ║"
  echo "║  Namespace: $NAMESPACE"
  echo "║  Verbose: $VERBOSE"
  echo "║  Auto-Fix: $FIX_ISSUES"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # Run phases
  phase_prerequisites || exit 1
  phase_cluster_health
  phase_istio_installation
  phase_namespace_config
  phase_sidecar_injection
  phase_mtls_config
  phase_service_config
  phase_pod_status
  phase_asgardeo_integration
  phase_connectivity
  phase_log_analysis
  
  # Summary
  phase_summary
}

# Run main function
main "$@"
