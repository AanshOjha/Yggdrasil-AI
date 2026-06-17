import { useState } from 'react';
import { Info, Menu } from 'lucide-react';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export default function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <button className="icon-btn mobile-menu-btn" onClick={onOpenMobileMenu} style={{ border: 'none', boxShadow: 'none' }}>
          <Menu size={24} />
        </button>
        AI Chat Helper
      </div>
      <div className="top-bar-actions">
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
