import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const handleSend = () => {
    if (content.trim()) {
      onSendMessage(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-glass">
      <textarea
        ref={textareaRef}
        className="chat-textarea"
        placeholder="Type a message... (Shift+Enter for new line)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button 
        className="send-btn" 
        onClick={handleSend}
        disabled={!content.trim()}
      >
        <Send size={18} />
      </button>
    </div>
  );
}
