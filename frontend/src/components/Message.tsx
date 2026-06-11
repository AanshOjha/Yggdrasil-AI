import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User } from 'lucide-react';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="avatar ai">
          <Bot size={24} />
        </div>
      )}
      
      <div 
        className={`message-bubble ${!isUser ? 'animate-flow-out' : 'animate-slide-in'}`}
        style={!isUser ? { transformOrigin: 'top left' } : {}}
      >
        {isUser ? (
          <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className, node, ref, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      {...(rest as any)}
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      style={vscDarkPlus}
                    />
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="avatar user">
          <User size={24} />
        </div>
      )}
    </div>
  );
}
