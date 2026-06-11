export interface Chat {
  id: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}
