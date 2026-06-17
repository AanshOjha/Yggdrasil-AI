import { useRef, useEffect } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import type { Message as MessageType } from '../types';

interface ChatAreaProps {
  messages: MessageType[];
  onSendMessage: (content: string, options: string[]) => void;
}

export default function ChatArea({ messages, onSendMessage }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-area">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>How can I help you today?</h3>
          </div>
        ) : (
          messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
}
