import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { healthService } from '../../services/healthService';

const HealthMonitoring = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const results = await healthService.checkAllServices();
      setServices(results);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && services.length === 0) {
    return <LoadingSpinner text="Checking services..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Health Monitoring</h1>
          <p className="text-dark-600 mt-2">Monitor the health status of all microservices</p>
        </div>
        <Button variant="primary" onClick={checkHealth} loading={loading}>
          <RefreshCw size={20} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Last Checked */}
      {lastChecked && (
        <div className="mb-6">
          <p className="text-sm text-dark-500">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <Card key={index} className={service.status === 'healthy' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-900">{service.service}</h3>
              {service.status === 'healthy' ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <XCircle size={24} className="text-red-500" />
              )}
            </div>
            
            <Badge variant={service.status === 'healthy' ? 'success' : 'danger'} className="mb-4">
              {service.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
            </Badge>

            {service.status === 'healthy' && service.data && (
              <div className="text-sm text-dark-600">
                <p>Status: {service.data.status}</p>
                {service.data.uptime && <p>Uptime: {Math.floor(service.data.uptime / 60)} minutes</p>}
              </div>
            )}

            {service.status === 'unhealthy' && (
              <div className="text-sm text-red-600">
                <p>Error: {service.error}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* System Overview */}
      <Card className="mt-8">
        <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center">
          <Activity size={20} className="mr-2 text-primary" />
          System Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-dark-600">Total Services</p>
            <p className="text-2xl font-bold text-dark-900">{services.length}</p>
          </div>
          <div>
            <p className="text-sm text-dark-600">Healthy Services</p>
            <p className="text-2xl font-bold text-green-600">
              {services.filter(s => s.status === 'healthy').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-dark-600">Unhealthy Services</p>
            <p className="text-2xl font-bold text-red-600">
              {services.filter(s => s.status === 'unhealthy').length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HealthMonitoring;
