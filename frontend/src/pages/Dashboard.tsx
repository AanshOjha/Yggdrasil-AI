import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import './Dashboard.css';
import { Link } from 'react-router-dom';

interface DashboardMetrics {
  average_latency_s: number;
  cache_hit_rate: number;
  average_tokens: number;
  llm_calls: number;
  requests: number;
  estimated_cost_usd: number;
  average_index_time_s: number;
  retrieval_accuracy: number | null;
  failures: number;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetchWithAuth('/api/dashboard/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>AI System Dashboard</h1>
        <Link to="/" className="back-link">Back to Chat</Link>
      </div>

      {loading ? (
        <div className="loading">Loading metrics...</div>
      ) : metrics ? (
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Average Latency</h3>
            <p className="metric-value">{metrics.average_latency_s.toFixed(2)} <span className="unit">s</span></p>
          </div>
          <div className="metric-card">
            <h3>Cache Hit Rate</h3>
            <p className="metric-value">{(metrics.cache_hit_rate * 100).toFixed(0)} <span className="unit">%</span></p>
          </div>
          <div className="metric-card">
            <h3>Average Tokens</h3>
            <p className="metric-value">{metrics.average_tokens.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h3>LLM Calls</h3>
            <p className="metric-value">{metrics.llm_calls}</p>
          </div>
          <div className="metric-card">
            <h3>Requests</h3>
            <p className="metric-value">{metrics.requests}</p>
          </div>
          <div className="metric-card">
            <h3>Estimated Cost</h3>
            <p className="metric-value"><span className="unit">$</span>{metrics.estimated_cost_usd.toFixed(4)}</p>
          </div>
          <div className="metric-card">
            <h3>Indexing Time</h3>
            <p className="metric-value">{metrics.average_index_time_s.toFixed(2)} <span className="unit">s</span></p>
          </div>
          <div className="metric-card">
            <h3>Failures</h3>
            <p className="metric-value">{metrics.failures}</p>
          </div>
          <div className="metric-card">
            <h3>Retrieval Accuracy</h3>
            <p className="metric-value">
              {metrics.retrieval_accuracy !== null 
                ? `${(metrics.retrieval_accuracy * 100).toFixed(1)}%` 
                : 'N/A'}
            </p>
          </div>
        </div>
      ) : (
        <div className="error">Failed to load metrics.</div>
      )}
    </div>
  );
};

export default Dashboard;
