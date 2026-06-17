import React, { useState } from 'react';
import { Send, FileText, Check } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, options: string[]) => void;
}

const AVAILABLE_OPTIONS = [
  { id: 'web_search', label: 'Web Search' },
  { id: 'use_documents', label: 'Use Documents' }
];

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim(), selectedOptions);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="input-container">
      <div className="chat-options" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {AVAILABLE_OPTIONS.map(opt => {
          const isSelected = selectedOptions.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleOption(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.8rem',
                borderRadius: '999px', fontSize: '0.85rem', cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--primary-color, #4f46e5)' : 'transparent',
                color: isSelected ? 'white' : 'var(--text-secondary, #9ca3af)',
                border: isSelected ? '1px solid var(--primary-color, #4f46e5)' : '1px solid var(--border-color, #374151)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              {isSelected && <Check size={14} />}
              {opt.label}
            </button>
          )
        })}
      </div>
      <form onSubmit={handleSubmit} className="input-glass">
        <button type="button" className="input-action-btn" title="Attach file">
          <FileText size={20} />
        </button>
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing..."
          rows={1}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Created by Aansh Ojha with Kratos & Atreus.
      </div>
    </div>
  );
}
