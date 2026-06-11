import { MessageSquarePlus, Edit2, Trash2, Moon, Sun, MessageCircle, LogOut } from 'lucide-react';
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
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onRenameChat,
  onDeleteChat,
  theme,
  toggleTheme
}: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    const newTitle = prompt('Enter new chat name:', chat.title);
    if (newTitle && newTitle.trim()) {
      onRenameChat(chat.id, newTitle.trim());
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteChat(id);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onCreateChat}>
          <MessageSquarePlus size={20} />
          New Chat
        </button>
      </div>

      <div className="chat-list">
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <MessageCircle size={18} className="chat-icon" />
            <span className="chat-item-title">{chat.title}</span>
            <div className="chat-item-actions">
              <button 
                className="action-btn" 
                onClick={(e) => handleRename(e, chat)}
                title="Rename"
              >
                <Edit2 size={16} />
              </button>
              <button 
                className="action-btn" 
                onClick={(e) => handleDelete(e, chat.id)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="theme-toggle">
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
