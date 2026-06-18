import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User } from 'lucide-react';
import kratosLogo from '../assets/kratos.png';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  const renderUserContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((part, index) => {
          if (part.type === 'input_text') {
            return <span key={index}>{part.text}</span>;
          }
          if (part.type === 'input_file') {
            return (
              <div key={index} style={{ marginTop: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'inline-block' }}>
                📎 Attached: {part.file_url ? (
                  <a href={part.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {part.file_url.split('/').pop() || 'URL'}
                  </a>
                ) : 'File'}
              </div>
            );
          }
          return null;
        });
      }
    } catch (e) {
      // Not JSON, just return string
    }
    return content;
  };

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="avatar ai">
          <img src={kratosLogo} alt="Kratos Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} />
        </div>
      )}
      
      <div 
        className={`message-bubble ${!isUser ? 'animate-flow-out' : 'animate-slide-in'}`}
        style={!isUser ? { transformOrigin: 'top left' } : {}}
      >
        {isUser ? (
          <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
            {renderUserContent(message.content)}
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              components={{
                code(props: any) {
                  const { children, className, node, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      {...(rest as any)}
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...rest}>
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
