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
  clientMessageId?: string; // for optimistic reconciliation
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
  openConversation: (conversationId: string) => Promise<void>;
  send: (text: string) => void;
  startTyping: () => void;
  isTyping: (conversationId: string) => boolean;
  getPartnerUsername: (conversationId: string) => string | undefined;
  isPartnerOnline: (conversationId: string) => boolean;
  unreadCounts: Record<string, number>;
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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
        setMessagesByConvo(prev => {
          const list = prev[convoId] || [];
          if (msg.clientMessageId) {
            const idx = list.findIndex(m => m._id === msg.clientMessageId || m.clientMessageId === msg.clientMessageId);
            if (idx !== -1) {
              const next = [...list];
              next[idx] = msg;
              return { ...prev, [convoId]: next };
            }
          }
          return { ...prev, [convoId]: [...list, msg] };
        });
        setConversations(prev => prev[convoId] ? prev : { ...prev, [convoId]: { _id: convoId, type: 'direct', memberIds: [msg.senderId] } as any });
        // Unread counts now recalculated in effect below; no incremental mutation needed.
      });
      socket.on('messages:seen', (data: { conversationId: string; userId: string }) => {
        setMessagesByConvo(prev => {
          const list = prev[data.conversationId];
          if (!list) return prev;
            return { ...prev, [data.conversationId]: list.map(m => m.senderId === data.userId ? m : { ...m, seenBy: Array.from(new Set([...(m.seenBy||[]), data.userId])) }) };
        });
        if (data.userId === me?.userId) {
          // Recalc effect will zero active convo; leave minimal immediate update for snappier UI
          setUnreadCounts(prev => data.conversationId in prev ? { ...prev, [data.conversationId]: 0 } : prev);
        }
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
                // Join all existing conversation rooms to receive new messages in background
                convos.forEach(c => socketRef.current!.emit('join', c._id));
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
                // Fetch participant usernames for offline users
                const participantIds = Array.from(new Set(convos.flatMap(c => c.memberIds.filter(id => id !== user.userId))));
                if (participantIds.length) {
                  try {
                    const ur = await fetch(`${serverUrl}/api/users?ids=${participantIds.join(',')}`);
                    if (ur.ok) {
                      const usersList: { _id: string; username: string }[] = await ur.json();
                      setUserDirectory(prev => ({ ...prev, ...Object.fromEntries(usersList.map(u => [u._id, u.username])) }));
                    }
                  } catch {/* ignore */}
                }
                // Hydrate unread counts
                try {
                  const uc = await fetch(`${serverUrl}/api/users/${user.userId}/unread-counts`);
                  if (uc.ok) {
                    const arr: { conversationId: string; count: number }[] = await uc.json();
                    setUnreadCounts(Object.fromEntries(arr.map(r => [r.conversationId, r.count])));
                  }
                } catch {/* ignore */}
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

  const loadMessages = useCallback(async (conversationId: string, force = false) => {
    // If we only have a single preview message (limit=1 prefetch) or force requested, fetch full history.
    const existing = messagesByConvo[conversationId];
    if (!force && existing && existing.length > 1) return;
    try {
      const res = await fetch(`${serverUrl}/api/rooms/${conversationId}/messages`);
      if (!res.ok) return;
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

  const openConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    if (socketRef.current) socketRef.current.emit('join', conversationId);
    await loadMessages(conversationId, true);
  setUnreadCounts(prev => conversationId in prev ? { ...prev, [conversationId]: 0 } : prev);
  }, [loadMessages]);

  const send = useCallback((text: string) => {
    if (!socketRef.current || !me || !activeConversationId || !text.trim()) return;
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const optimistic: Message = { _id: tempId, clientMessageId: tempId, conversationId: activeConversationId, senderId: me.userId, text, createdAt: new Date().toISOString(), deliveredTo: [me.userId], seenBy: [] };
    setMessagesByConvo(prev => ({ ...prev, [activeConversationId]: [...(prev[activeConversationId] || []), optimistic] }));
    socketRef.current.emit('message:send', { conversationId: activeConversationId, senderId: me.userId, text, clientMessageId: tempId });
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
  // small delay so UI can display "Unread messages" divider briefly
  const timer = setTimeout(()=> socketRef.current?.emit('messages:seen', { conversationId: activeConversationId }), 400);
  return ()=> clearTimeout(timer);
    }
  }, [activeConversationId, messagesByConvo, me]);

  // Recalculate unread counts from currently loaded messages whenever messages change or active conversation switches
  useEffect(()=>{
    if (!me) return;
    const next: Record<string, number> = { ...unreadCounts }; // start from existing to preserve unseen convos not yet loaded
    Object.entries(messagesByConvo).forEach(([cid, list]) => {
      const count = list.reduce((acc, m) => {
        if (m.senderId !== me.userId && !(m.seenBy||[]).includes(me.userId)) return acc + 1;
        return acc;
      }, 0);
      next[cid] = count;
    });
    if (activeConversationId) next[activeConversationId] = 0; // active convo unread should appear cleared
    // Only update if changed to avoid re-renders
    const changed = Object.keys(next).length !== Object.keys(unreadCounts).length || Object.entries(next).some(([k,v]) => unreadCounts[k] !== v);
    if (changed) setUnreadCounts(next);
  }, [messagesByConvo, me, activeConversationId]);

  const value: ChatContextValue = {
    me,
    online: online.filter(u => u.userId !== me?.userId),
    activeConversationId,
    conversations,
    messages: activeConversationId ? (messagesByConvo[activeConversationId] || []) : [],
  messagesMap: messagesByConvo,
    login,
    openDirect,
  openConversation,
    send,
  startTyping,
  isTyping,
  getPartnerUsername,
  isPartnerOnline,
  unreadCounts,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Recalculate unread counts based on loaded messages (received & unseen only). Active conversation forced to 0.
// This effect placed outside provider component would not have access to state; integrating within component instead.


export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
