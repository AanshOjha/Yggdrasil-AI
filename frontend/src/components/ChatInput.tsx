import React, { useState } from 'react';
import { Send, FileText, Check, Link, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, options: string[]) => void;
}

const AVAILABLE_OPTIONS = [
  { id: 'web_search', label: 'Web Search' },
  { id: 'file_search', label: 'File Search' },
  { id: 'use_documents', label: 'Use Documents' },
  { id: 'github', label: 'GitHub' }
];

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ id?: string, file_id?: string, url?: string, filename: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [userFiles, setUserFiles] = useState<{ id: string, file_id: string, filename: string }[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleUseDocuments = async () => {
    setShowDocsModal(true);
    setIsLoadingDocs(true);
    try {
      const { chatService } = await import('../services/chatService');
      const files = await chatService.getFiles();
      setUserFiles(files);
    } catch (err) {
      console.error('Failed to load documents:', err);
      alert('Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      const { chatService } = await import('../services/chatService');
      const uploadedInfo = await chatService.uploadFile(file);
      setAttachedFile(uploadedInfo);
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachedFile) {
      if (attachedFile) {
        // Build JSON array for multimodal
        const contentArray = [];
        const isImage = attachedFile.filename?.toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
        
        if (input.trim()) {
          contentArray.push({ type: "input_text", text: input.trim() });
        }
        if (attachedFile.url) {
          contentArray.push({ type: isImage ? "input_image" : "input_file", [isImage ? "image_url" : "file_url"]: attachedFile.url });
        } else if (attachedFile.file_id) {
          contentArray.push({ type: isImage ? "input_image" : "input_file", file_id: attachedFile.file_id });
        }
        
        onSendMessage(JSON.stringify(contentArray), selectedOptions);
        setAttachedFile(null);
      } else {
        onSendMessage(input.trim(), selectedOptions);
      }
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
    <div className="input-container" style={{ position: 'relative' }}>
      {showDocsModal && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '0', right: '0', marginBottom: '1rem',
          background: 'var(--bg-secondary, #1f2937)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '1rem', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Your Documents</h3>
            <button onClick={() => setShowDocsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          {isLoadingDocs ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Loading documents...</div>
          ) : userFiles.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No documents uploaded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {userFiles.map(file => (
                <div 
                  key={file.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                >
                  <span style={{ color: 'white', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {file.filename}
                  </span>
                  <button 
                    onClick={() => {
                      setAttachedFile(file);
                      setShowDocsModal(false);
                    }}
                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chat-options" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {AVAILABLE_OPTIONS.map(opt => {
          const isSelected = selectedOptions.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (opt.id === 'use_documents') {
                  handleUseDocuments();
                } else {
                  toggleOption(opt.id);
                }
              }}
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
      {attachedFile && (
        <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-color)' }}>
          📎 Attached: {attachedFile.filename}
          <button type="button" onClick={() => setAttachedFile(null)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>✖</button>
        </div>
      )}
      {showUrlInput && !attachedFile && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Enter file URL..." 
            value={fileUrl} 
            onChange={(e) => setFileUrl(e.target.value)}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }}
          />
          <button 
            type="button" 
            onClick={() => {
              if (fileUrl.trim()) {
                setAttachedFile({ url: fileUrl.trim(), filename: fileUrl.trim().split('/').pop() || 'URL' });
                setFileUrl('');
                setShowUrlInput(false);
              }
            }}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Attach
          </button>
          <button 
            type="button" 
            onClick={() => setShowUrlInput(false)}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Cancel
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="input-glass">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".art,.bat,.brf,.c,.cls,.css,.csv,.diff,.doc,.docx,.dot,.eml,.es,.h,.hs,.htm,.html,.hwp,.hwpx,.ics,.ifb,.java,.js,.json,.keynote,.ksh,.ltx,.mail,.markdown,.md,.mht,.mhtml,.mjs,.nws,.odt,.pages,.patch,.pdf,.pl,.pm,.pot,.ppa,.pps,.ppt,.pptx,.pwz,.py,.rst,.rtf,.scala,.sh,.shtml,.srt,.sty,.svg,.svgz,.tex,.text,.txt,.tsv,.vcf,.vtt,.wiz,.xla,.xlb,.xlc,.xlm,.xls,.xlsx,.xlt,.xlw,.xml,.yaml,.yml,.png,.jpeg,.jpg,.webp,.gif"
          onChange={handleFileChange}
        />
        <button 
          type="button" 
          className="input-action-btn" 
          title="Attach URL"
          onClick={() => { setShowUrlInput(!showUrlInput); }}
          disabled={isUploading || attachedFile !== null}
        >
          <Link size={20} color={(isUploading || attachedFile !== null) ? 'gray' : 'var(--text-primary)'} />
        </button>
        <button 
          type="button" 
          className="input-action-btn"           
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || attachedFile !== null}
        >
          <FileText size={20} color={(isUploading || attachedFile !== null) ? 'gray' : 'var(--text-primary)'} />
        </button>
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? "Uploading..." : "Start typing..."}
          rows={1}
          disabled={isUploading}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={(!input.trim() && !attachedFile) || isUploading}
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
