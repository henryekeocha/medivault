'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

type ServiceStatus = {
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number | null;
  error?: string;
};

type HealthStatus = {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: number;
  environment: string;
  apiUrl: string;
  backendUrl: string;
  services: {
    api: ServiceStatus;
    backend: ServiceStatus;
  };
  responseTime: number;
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/health');
      setHealth(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch health status');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    const interval = setInterval(() => {
      fetchHealth();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">System Health Status</h1>
      
      <div className="mb-4 flex justify-between items-center">
        <div>
          {lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <select 
            className="p-2 border rounded"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value="5000">Refresh: 5s</option>
            <option value="10000">Refresh: 10s</option>
            <option value="30000">Refresh: 30s</option>
            <option value="60000">Refresh: 1m</option>
          </select>
          <button 
            onClick={fetchHealth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Now
          </button>
        </div>
      </div>
      
      {loading && !health && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Loading health status...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {health && (
        <div>
          <div className={`p-4 mb-6 rounded-lg ${
            health.status === 'healthy' 
              ? 'bg-green-100 border border-green-200' 
              : 'bg-red-100 border border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-2 ${
                health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <h2 className="text-lg font-semibold">
                Overall Status: {health.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </h2>
            </div>
            <div className="mt-2 text-sm">
              <p>Environment: <span className="font-medium">{health.environment}</span></p>
              <p>Uptime: <span className="font-medium">{formatUptime(health.uptime)}</span></p>
              <p>Response Time: <span className="font-medium">{formatDuration(health.responseTime)}</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* API Status */}
            <div className={`p-4 rounded-lg ${
              health.services.api.status === 'healthy' 
                ? 'bg-green-50 border border-green-100' 
                : health.services.api.status === 'unhealthy'
                  ? 'bg-red-50 border border-red-100'
                  : 'bg-gray-50 border border-gray-100'
            }`}>
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  health.services.api.status === 'healthy' 
                    ? 'bg-green-500' 
                    : health.services.api.status === 'unhealthy'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                }`}></div>
                <h3 className="font-semibold">API Service</h3>
              </div>
              <p className="text-sm mb-1">URL: <span className="font-mono text-xs">{health.apiUrl}</span></p>
              <p className="text-sm mb-1">Status: <span className="font-medium">{health.services.api.status}</span></p>
              {health.services.api.responseTime !== null && (
                <p className="text-sm mb-1">Response Time: <span className="font-medium">{formatDuration(health.services.api.responseTime)}</span></p>
              )}
              {health.services.api.error && (
                <p className="text-sm text-red-600 mt-2">{health.services.api.error}</p>
              )}
            </div>
            
            {/* Backend Status */}
            <div className={`p-4 rounded-lg ${
              health.services.backend.status === 'healthy' 
                ? 'bg-green-50 border border-green-100' 
                : health.services.backend.status === 'unhealthy'
                  ? 'bg-red-50 border border-red-100'
                  : 'bg-gray-50 border border-gray-100'
            }`}>
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  health.services.backend.status === 'healthy' 
                    ? 'bg-green-500' 
                    : health.services.backend.status === 'unhealthy'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                }`}></div>
                <h3 className="font-semibold">Backend Service</h3>
              </div>
              <p className="text-sm mb-1">URL: <span className="font-mono text-xs">{health.backendUrl}</span></p>
              <p className="text-sm mb-1">Status: <span className="font-medium">{health.services.backend.status}</span></p>
              {health.services.backend.responseTime !== null && (
                <p className="text-sm mb-1">Response Time: <span className="font-medium">{formatDuration(health.services.backend.responseTime)}</span></p>
              )}
              {health.services.backend.error && (
                <p className="text-sm text-red-600 mt-2">{health.services.backend.error}</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-xs text-gray-500">
            <p>Last check: {new Date(health.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
} 