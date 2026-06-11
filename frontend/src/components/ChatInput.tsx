import React, { useState } from 'react';
import { Send, FileText, RotateCcw } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
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
