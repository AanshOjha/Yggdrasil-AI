import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import TopBar from '../components/TopBar';
import type { Chat, Message as MessageType } from '../types';
import { chatService } from '../services/chatService';
import { fetchWithAuth } from '../services/api';
import '../App.css';

function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messagesDict, setMessagesDict] = useState<Record<string, MessageType[]>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Initialize useChat
  const { messages: aiMessages, setMessages: setAiMessages, append } = useChat({
    id: currentChatId,
    api: '/chat',
    fetch: async (_input, init) => {
      const parsedBody = JSON.parse(init?.body as string);
      const lastMsg = parsedBody.messages[parsedBody.messages.length - 1];
      const customData = parsedBody.data || {};
      
      const payload = {
        conversation_id: customData.conversation_id || currentChatId,
        message: lastMsg.content,
        options: customData.options || [],
      };
      
      return fetchWithAuth('/chat', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).then(response => {
        if (!response.ok || !response.body) return response;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              if (text) {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
              }
            }
            controller.close();
          }
        });

        return new Response(stream, { headers: response.headers });
      });
    }
  });

  // Fetch conversations on mount
  useEffect(() => {
    chatService.getConversations().then((data) => {
      setChats(data);
      if (data.length > 0) {
        setCurrentChatId(data[0].id);
      }
    }).catch(err => console.error("Failed to fetch conversations", err));
  }, []);

  // Sync aiMessages to our dictionary for caching
  useEffect(() => {
    if (currentChatId && aiMessages.length > 0) {
      setMessagesDict(prev => ({ ...prev, [currentChatId]: aiMessages as any }));
    }
  }, [aiMessages, currentChatId]);

  // Fetch messages when currentChatId changes, or load from cache
  useEffect(() => {
    if (!currentChatId) return;

    if (messagesDict[currentChatId] && messagesDict[currentChatId].length > 0) {
      // Load from cache to avoid flicker/refetch
      setAiMessages(messagesDict[currentChatId] as any);
    } else {
      chatService.getMessages(currentChatId).then(data => {
        const formattedMsgs = data.map((m: any) => ({
          id: m.id,
          role: m.role === 'assistant' ? 'assistant' : (m.role === 'ai' ? 'assistant' : m.role),
          content: m.content
        }));
        setMessagesDict(prev => ({ ...prev, [currentChatId]: formattedMsgs }));
        setAiMessages(formattedMsgs as any);
      }).catch(err => console.error("Failed to fetch messages", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId]); // We intentionally omit messagesDict to prevent re-fetching loops

  const handleCreateChat = async () => {
    try {
      const newChat = await chatService.createConversation();
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessagesDict(prev => ({ ...prev, [newChat.id]: [] }));
      setAiMessages([]);
      if (window.innerWidth <= 768) setIsMobileOpen(false);
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

  const handleSendMessage = async (content: string, options: string[]) => {
    let chatId = currentChatId;
    
    if (!chatId) {
      try {
        const newChat = await chatService.createConversation();
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        chatId = newChat.id;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    // append from Vercel AI SDK handles the state update and fetch call seamlessly
    append(
      { role: 'user', content },
      { data: { conversation_id: chatId, options: options } }
    );
  };

  const currentMessages = currentChatId ? (messagesDict[currentChatId] || []) : [];

  return (
    <div className="app-container">
      <Sidebar 
        chats={chats} 
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onCreateChat={handleCreateChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <main className="main-content">
        <TopBar onOpenMobileMenu={() => setIsMobileOpen(true)} />
        <ChatArea 
          messages={currentMessages} 
          onSendMessage={handleSendMessage} 
        />
      </main>
    </div>
  );
}

export default ChatApp;
