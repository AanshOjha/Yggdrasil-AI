import React from 'react';
import { MessageSquarePlus, Edit2, Trash2, LogOut, PanelLeftClose, PanelLeftOpen, MessageCircle } from 'lucide-react';
import kratosLogo from '../assets/kratos.png';
import type { Chat } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onRenameChat,
  onDeleteChat,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    const newTitle = prompt('Enter new chat name:', chat.title);
    if (newTitle && newTitle.trim()) {
      onRenameChat(chat.id, newTitle.trim());
    }
  };

  const playEasterEggAudio = () => {
    try {
      const audio = new Audio('/easter-egg.mp3');
      audio.play();
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'show' : ''}`} 
        onClick={onCloseMobile}
      />
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header-top">
          <div className="sidebar-brand" onClick={playEasterEggAudio}>
            <div className="brand-icon">
              <img src={kratosLogo} alt="Kratos Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
            </div>
            <span className="brand-name">YGGDRASIL AI</span>
          </div>
          <button className="toggle-sidebar-btn" onClick={onToggleCollapse}>
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <div className="sidebar-section-title">
          <span>History</span>
        </div>

        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => {
                onSelectChat(chat.id);
                if (window.innerWidth <= 768) onCloseMobile();
              }}
            >
              {isCollapsed ? (
                <MessageCircle size={20} style={{ color: 'var(--sidebar-text-muted)' }} />
              ) : null}
              <div className="chat-item-content">
                <span className="chat-item-title">{chat.title || "New Chat"}</span>
              </div>
              {chat.id === currentChatId && !isCollapsed && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    className="icon-btn" 
                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'inherit' }}
                    onClick={(e) => handleRename(e, chat)}
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className="icon-btn" 
                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'inherit' }}
                    onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {chats.length === 0 && !isCollapsed && (
            <div style={{ padding: '1rem', color: 'var(--sidebar-text-muted)', fontSize: '0.85rem' }}>
              No history yet. Start a conversation!
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="clear-history-btn" onClick={onCreateChat}>
            <MessageSquarePlus size={18} />
            <span>New Chat</span>
          </button>

          <div className="user-card" title={user?.email || 'user@example.com'}>
            <span className="user-card-email">{user?.email || 'user@example.com'}</span>
            <button className="logout-btn-small" onClick={handleLogout}>
              <LogOut size={14} />
              {!isCollapsed && <span>Log out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
