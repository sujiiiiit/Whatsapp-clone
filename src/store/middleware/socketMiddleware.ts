import type { Middleware, AnyAction } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import { setPresence } from '../slices/presenceSlice';
import { upsertConversation, setActiveConversation } from '../slices/conversationsSlice';
import { addMessages, optimisticAdd, markSeen, replaceMessages, reconcileMessage } from '../slices/messagesSlice';
import { setTyping } from '../slices/typingSlice';
import { setUser } from '../slices/userSlice';

let socket: Socket | null = null;
let typingTimer: any = null;

const socketMiddleware: Middleware = store => next => (action: unknown) => {
  const anyAction = action as AnyAction;
  const result = next(anyAction);
  switch (anyAction.type) {
    case 'user/login': {
      if (!socket) {
        socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
        socket.on('presence:users', (list) => store.dispatch(setPresence(list)) );
        socket.on('message:new', (msg) => {
          const convoId = (msg.conversationId || msg.roomId);
          store.dispatch(upsertConversation({ _id: convoId, type: 'direct', memberIds: [msg.senderId], title: '' } as any));
            if (msg.clientMessageId) {
              store.dispatch(reconcileMessage({ conversationId: convoId, clientMessageId: msg.clientMessageId, serverMessage: msg }));
            } else {
              // Fallback: try to reconcile if sender is self and message matches optimistic
              const state = store.getState();
              const myId = state.user?.user?.userId;
              if (msg.senderId === myId) {
                const list = state.messages.byConversation[convoId] || [];
                // Find optimistic message by sender, text, and recent timestamp (within 10s)
                const idx = list.findIndex((m: any) =>
                  m.senderId === myId &&
                  m.text === msg.text &&
                  m._id?.startsWith('temp-') &&
                  Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000
                );
                if (idx !== -1) {
                  // Use optimistic's clientMessageId for reconciliation
                  store.dispatch(reconcileMessage({ conversationId: convoId, clientMessageId: list[idx].clientMessageId, serverMessage: msg }));
                } else {
                  store.dispatch(addMessages({ conversationId: convoId, messages: [msg] }));
                }
              } else {
                store.dispatch(addMessages({ conversationId: convoId, messages: [msg] }));
              }
            }
        });
        socket.on('messages:seen', (data) => store.dispatch(markSeen(data)) );
        socket.on('typing', (data) => store.dispatch(setTyping(data)) );
      }
      const username = (anyAction as any).payload;
      socket!.emit('user:online', { username }, (user?: { userId: string; username: string }) => {
        if (user) {
          store.dispatch(setUser(user));
          fetch((import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + `/api/users/${user.userId}/conversations`) // prefetch convos
            .then(r=>r.json()).then((convos:any[]) => {
              convos.forEach(c => {
                store.dispatch(upsertConversation(c));
                fetch((import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + `/api/rooms/${c._id}/messages?limit=1`).then(r=>r.json()).then(m=> {
                  if (Array.isArray(m) && m.length) store.dispatch(replaceMessages({ conversationId: c._id, messages: m }));
                });
              })
            })
        }
      });
      break;
    }
  case 'conversations/openDirect': {
      const otherUsername = (anyAction as any).payload;
      if (!socket) break;
      socket.emit('conversation:direct', { otherUsername }, (convo?: any) => {
        if (convo) {
          store.dispatch(upsertConversation(convo));
          socket!.emit('join', convo._id);
          store.dispatch(setActiveConversation(convo._id));
          fetch((import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + `/api/rooms/${convo._id}/messages`).then(r=>r.json()).then(m=> {
            store.dispatch(replaceMessages({ conversationId: convo._id, messages: m }));
          });
        }
      });
      break;
    }
  case 'messages/send': {
      if (!socket) break;
      const { conversationId, senderId, text } = (anyAction as any).payload;
      const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  store.dispatch(optimisticAdd({ conversationId, message: { _id: tempId, clientMessageId: tempId, conversationId, senderId, text, createdAt: new Date().toISOString(), deliveredTo:[senderId], seenBy:[] } }));
  socket.emit('message:send', { conversationId, senderId, text, clientMessageId: tempId });
      break;
    }
  case 'typing/start': {
      if (!socket) break;
      const { conversationId, userId } = (anyAction as any).payload;
      socket.emit('typing', { conversationId, userId, isTyping: true });
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(()=> socket?.emit('typing', { conversationId, userId, isTyping: false }), 2000);
      break;
    }
  case 'messages/seen': {
      if (!socket) break;
      socket.emit('messages:seen', (anyAction as any).payload);
      break;
    }
  }
  return result;
};

export default socketMiddleware;
