import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import './Dashboard.css';
import { Link } from 'react-router-dom';

interface DashboardMetrics {  
  average_latency_s: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  llm_calls: number;
  requests: number;
  estimated_cost_usd: number;
  model_name: string;
  average_ttft_ms: number;
  average_generation_time_ms: number;
  average_redis_lookup_ms: number;
  average_bm25_latency_ms: number;
  average_cache_store_ms: number;
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
        <h1>Yggdrasil Dashboard</h1>
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
            <div className="sub-metrics">
              <small>Hits: {metrics.cache_hits} | Misses: {metrics.cache_misses}</small>
            </div>
          </div>

          <div className="metric-card">
            <h3>Cache Timings</h3>
            <div className="sub-metrics">
              <small>Lookup: {metrics.average_redis_lookup_ms.toFixed(1)} ms</small><br />
              <small>BM25: {metrics.average_bm25_latency_ms.toFixed(1)} ms</small><br />
              <small>Store: {metrics.average_cache_store_ms.toFixed(1)} ms</small>
            </div>
          </div>

          <div className="metric-card">
            <h3>Model info</h3>
            <p className="metric-value" style={{ fontSize: '1.5rem', marginTop: '10px' }}>{metrics.model_name}</p>
          </div>

          <div className="metric-card">
            <h3>LLM Calls</h3>
            <p className="metric-value">{metrics.llm_calls}</p>
            <div className="sub-metrics">
              <small>Requests: {metrics.requests}</small>
            </div>
          </div>

          <div className="metric-card">
            <h3>Total Tokens</h3>
            <p className="metric-value">{metrics.total_tokens.toLocaleString()}</p>
            <div className="sub-metrics">
              <small>In: {metrics.input_tokens.toLocaleString()} | Out: {metrics.output_tokens.toLocaleString()}</small>
            </div>
          </div>

          <div className="metric-card">
            <h3>LLM Timings</h3>
            <div className="sub-metrics" style={{ marginTop: '5px' }}>
              <small>TTFT: {metrics.average_ttft_ms.toFixed(1)} ms</small><br />
              <small>Gen Time: {metrics.average_generation_time_ms.toFixed(1)} ms</small>
            </div>
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
