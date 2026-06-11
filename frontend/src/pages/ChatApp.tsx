import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import TopBar from '../components/TopBar';
import type { Chat, Message as MessageType } from '../types';
import { chatService } from '../services/chatService';
import { fetchWithAuth } from '../services/api';
import '../App.css';

function ChatApp() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, MessageType[]>>({});

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch conversations on mount
  useEffect(() => {
    chatService.getConversations().then((data) => {
      setChats(data);
      if (data.length > 0) {
        setCurrentChatId(data[0].id);
      }
    }).catch(err => console.error("Failed to fetch conversations", err));
  }, []);

  // Fetch messages when currentChatId changes
  useEffect(() => {
    if (!currentChatId) return;
    if (messages[currentChatId]) return; // already fetched

    chatService.getMessages(currentChatId).then(data => {
      // Backend returns 'assistant', map it to 'ai' for the UI
      const formattedMsgs = data.map((m: any) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'ai' : m.role,
        content: m.content
      }));
      setMessages(prev => ({ ...prev, [currentChatId]: formattedMsgs }));
    }).catch(err => console.error("Failed to fetch messages", err));
  }, [currentChatId]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCreateChat = async () => {
    try {
      const newChat = await chatService.createConversation();
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessages(prev => ({ ...prev, [newChat.id]: [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    try {
      const updatedChat = await chatService.renameConversation(id, newTitle);
      setChats(chats.map(chat => chat.id === id ? updatedChat : chat));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      setChats(chats.filter(chat => chat.id !== id));
      if (currentChatId === id) {
        const remaining = chats.filter(chat => chat.id !== id);
        setCurrentChatId(remaining.length > 0 ? remaining[0].id : '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentChatId) return;
    
    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    setMessages(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), userMessage]
    }));

    // Start AI stream
    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: MessageType = {
      id: aiMessageId,
      role: 'ai',
      content: ''
    };

    setMessages(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), initialAiMessage]
    }));

    try {
      const response = await fetchWithAuth('/chat', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: currentChatId,
          message: content
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let aiContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;

        // Update the AI message chunk by chunk
        setMessages(prev => {
          const chatMsgs = prev[currentChatId] || [];
          return {
            ...prev,
            [currentChatId]: chatMsgs.map(msg => 
              msg.id === aiMessageId ? { ...msg, content: aiContent } : msg
            )
          };
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const currentMessages = currentChatId ? (messages[currentChatId] || []) : [];

  return (
    <div className="app-container">
      <Sidebar 
        chats={chats} 
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onCreateChat={handleCreateChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="main-content">
        <TopBar title="YGGDRASIL AI" />
        {currentChatId ? (
          <ChatArea 
            messages={currentMessages} 
            onSendMessage={handleSendMessage} 
          />
        ) : (
          <div className="empty-state glass">
            <h2>Select or create a chat to begin</h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatApp;
