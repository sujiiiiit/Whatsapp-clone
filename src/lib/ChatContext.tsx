import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface Message {
  _id?: string;
  conversationId?: string;
  roomId?: string; // legacy
  senderId: string;
  text: string;
  createdAt: string;
  deliveredTo?: string[];
  seenBy?: string[];
}

export interface PresenceUser { userId: string; username: string }
export interface Conversation { _id: string; type: 'direct' | 'group'; memberIds: string[] }

interface ChatContextValue {
  me?: { userId: string; username: string };
  online: PresenceUser[];
  activeConversationId?: string;
  conversations: Record<string, Conversation>;
  messages: Message[]; // messages for active conversation
  messagesMap: { [id: string]: Message[] }; // all loaded messages per convo
  login: (username: string) => Promise<boolean>;
  openDirect: (username: string) => Promise<void>;
  send: (text: string) => void;
  startTyping: () => void;
  isTyping: (conversationId: string) => boolean;
  getPartnerUsername: (conversationId: string) => string | undefined;
  isPartnerOnline: (conversationId: string) => boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface MessagesState { [convoId: string]: Message[] }

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [me, setMe] = useState<{ userId: string; username: string }>();
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [messagesByConvo, setMessagesByConvo] = useState<MessagesState>({});
  const [typingByConvo, setTypingByConvo] = useState<Record<string, Set<string>>>({});
  const [userDirectory, setUserDirectory] = useState<Record<string,string>>({});
  const socketRef = useRef<Socket | null>(null);
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { io } = await import('socket.io-client');
      const socket = io(serverUrl);
      socketRef.current = socket;
      socket.on('presence:users', (list: PresenceUser[]) => setOnline(list));
      socket.on('presence:users', (list: PresenceUser[]) => {
        setUserDirectory(prev => ({ ...prev, ...Object.fromEntries(list.map(u => [u.userId, u.username])) }));
      });
      socket.on('message:new', (msg: Message) => {
        const convoId = (msg.conversationId || msg.roomId)!;
        setMessagesByConvo(prev => ({ ...prev, [convoId]: [...(prev[convoId] || []), msg] }));
        // If we don't have this conversation in state yet, keep it minimal (direct conversations only for now)
        setConversations(prev => prev[convoId] ? prev : { ...prev, [convoId]: { _id: convoId, type: 'direct', memberIds: [msg.senderId] } as any });
        // If I'm part of it but not viewing, could mark delivered; when I open, we'll mark seen.
      });
      socket.on('messages:seen', (data: { conversationId: string; userId: string }) => {
        setMessagesByConvo(prev => {
          const list = prev[data.conversationId];
          if (!list) return prev;
            return { ...prev, [data.conversationId]: list.map(m => m.senderId === data.userId ? m : { ...m, seenBy: Array.from(new Set([...(m.seenBy||[]), data.userId])) }) };
        });
      });
      socket.on('typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
        setTypingByConvo(prev => {
          const set = new Set(prev[data.conversationId] ? Array.from(prev[data.conversationId]) : []);
            if (data.isTyping) set.add(data.userId); else set.delete(data.userId);
          return { ...prev, [data.conversationId]: set };
        });
      });
    })();
    return () => { socketRef.current?.disconnect(); };
  }, [serverUrl]);

  const login = useCallback(async (username: string) => {
    if (!socketRef.current) return false;
    return new Promise<boolean>((resolve) => {
      socketRef.current!.emit('user:online', { username }, (user?: { userId: string; username: string }) => {
        if (user) {
          setMe(user);
          // After login, prefetch existing conversations & their last message
          (async () => {
            try {
              const res = await fetch(`${serverUrl}/api/users/${user.userId}/conversations`);
              if (res.ok) {
                const convos: Conversation[] = await res.json();
                setConversations(prev => ({ ...prev, ...Object.fromEntries(convos.map(c => [c._id, c])) }));
                // Fetch last message for each conversation (limit=1)
                await Promise.all(convos.map(async c => {
                  try {
                    const mr = await fetch(`${serverUrl}/api/rooms/${c._id}/messages?limit=1`);
                    if (mr.ok) {
                      const one: Message[] = await mr.json();
                      if (one.length) {
                        setMessagesByConvo(prev => ({ ...prev, [c._id]: one }));
                      }
                    }
                  } catch {}
                }));
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Failed to prefetch conversations', e);
            }
          })();
          resolve(true);
        } else resolve(false);
      });
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (messagesByConvo[conversationId]) return; // already loaded
    try {
      const res = await fetch(`${serverUrl}/api/rooms/${conversationId}/messages`);
      const data: Message[] = await res.json();
      setMessagesByConvo(prev => ({ ...prev, [conversationId]: data }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load messages', e);
    }
  }, [messagesByConvo, serverUrl]);

  const openDirect = useCallback(async (otherUsername: string) => {
    if (!socketRef.current) return;
    await new Promise<void>((resolve) => {
      socketRef.current!.emit('conversation:direct', { otherUsername }, (convo?: Conversation) => {
        if (convo) {
          setConversations(prev => ({ ...prev, [convo._id]: convo }));
          socketRef.current!.emit('join', convo._id);
          setActiveConversationId(convo._id);
          // store other username mapping
          const otherId = convo.memberIds.find(id => id !== me?.userId);
          if (otherId) setUserDirectory(prev => ({ ...prev, [otherId]: otherUsername }));
          loadMessages(convo._id).then(()=>resolve());
        } else resolve();
      });
    });
  }, [loadMessages]);

  const send = useCallback((text: string) => {
    if (!socketRef.current || !me || !activeConversationId || !text.trim()) return;
  // optimistic placeholder
  const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const optimistic: Message = { _id: tempId, conversationId: activeConversationId, senderId: me.userId, text, createdAt: new Date().toISOString(), deliveredTo: [me.userId], seenBy: [] };
  setMessagesByConvo(prev => ({ ...prev, [activeConversationId]: [...(prev[activeConversationId] || []), optimistic] }));
  socketRef.current.emit('message:send', { conversationId: activeConversationId, senderId: me.userId, text });
  }, [activeConversationId, me]);

  const startTyping = useCallback(() => {
    if (!socketRef.current || !me || !activeConversationId) return;
    socketRef.current.emit('typing', { conversationId: activeConversationId, userId: me.userId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { conversationId: activeConversationId, userId: me.userId, isTyping: false });
    }, 2000);
  }, [activeConversationId, me]);

  const isTyping = useCallback((conversationId: string) => {
    const set = typingByConvo[conversationId];
    if (!set || !me) return false;
    // someone else typing
    return Array.from(set).some(uid => uid !== me.userId);
  }, [typingByConvo, me]);

  const getPartnerUsername = useCallback((conversationId: string) => {
    const convo = conversations[conversationId];
    if (!convo || !me) return undefined;
    const partnerId = convo.memberIds.find(id => id !== me.userId);
    if (!partnerId) return undefined;
    return userDirectory[partnerId];
  }, [conversations, me, userDirectory]);

  const isPartnerOnline = useCallback((conversationId: string) => {
    const convo = conversations[conversationId];
    if (!convo || !me) return false;
    const partnerId = convo.memberIds.find(id => id !== me.userId);
    if (!partnerId) return false;
    return online.some(u => u.userId === partnerId);
  }, [conversations, me, online]);

  // Mark messages seen when switching or messages update
  useEffect(() => {
    if (!socketRef.current || !me || !activeConversationId) return;
    const msgs = messagesByConvo[activeConversationId];
    if (!msgs || !msgs.length) return;
    const unseen = msgs.some(m => m.senderId !== me.userId && !(m.seenBy||[]).includes(me.userId));
    if (unseen) {
      socketRef.current.emit('messages:seen', { conversationId: activeConversationId });
    }
  }, [activeConversationId, messagesByConvo, me]);

  const value: ChatContextValue = {
    me,
    online: online.filter(u => u.userId !== me?.userId),
    activeConversationId,
    conversations,
    messages: activeConversationId ? (messagesByConvo[activeConversationId] || []) : [],
  messagesMap: messagesByConvo,
    login,
    openDirect,
    send,
  startTyping,
  isTyping,
  getPartnerUsername,
  isPartnerOnline,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
