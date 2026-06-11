import { useEffect, useRef } from 'react';
import type { Message as MessageType } from '../types';
import Message from './Message';
import ChatInput from './ChatInput';

interface ChatAreaProps {
  messages: MessageType[];
  onSendMessage: (content: string) => void;
}

export default function ChatArea({ messages, onSendMessage }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-area">
      <div className="messages-container">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="input-container">
        <ChatInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}
