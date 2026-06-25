import { useState, useEffect } from 'react';
import { Info, Menu } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export default function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [stats, setStats] = useState({ openai_calls: 0 });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <button className="icon-btn mobile-menu-btn" onClick={onOpenMobileMenu} style={{ border: 'none', boxShadow: 'none' }}>
          <Menu size={24} />
        </button>
        AI Chat Helper
      </div>
      <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="stats-badge" onClick={fetchStats} style={{ fontSize: '0.85rem', fontWeight: 'bold', background: 'var(--accent-color, #4a90e2)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
          ⭐ API Calls: {stats.openai_calls}
        </button>
        <button 
          className="icon-btn" 
          onClick={() => setShowInfo(!showInfo)}
        >
          <Info size={20} />
        </button>
        {showInfo && (
          <div className="info-popup">
            Made by Aansh Ojha.<br/>
            Checkout my <a href="https://linkedin.com/in/aanshojha" target="_blank" rel="noreferrer">LinkedIn</a> and <a href="https://github.com/aanshojha" target="_blank" rel="noreferrer">GitHub</a>.
          </div>
        )}
      </div>
    </header>
  );
}
