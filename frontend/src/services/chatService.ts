import { fetchWithAuth } from './api';
import type { Chat, Message } from '../types';

export const chatService = {
  async getConversations(): Promise<Chat[]> {
    const response = await fetchWithAuth('/conversations');
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  async createConversation(): Promise<Chat> {
    const response = await fetchWithAuth('/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error('Failed to create conversation');
    return response.json();
  },

  async renameConversation(id: string, title: string): Promise<Chat> {
    const response = await fetchWithAuth(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to rename conversation');
    return response.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const response = await fetchWithAuth(`/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete conversation');
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await fetchWithAuth(`/chat/${conversationId}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  }
};
