import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Message { _id?: string; clientMessageId?: string; conversationId?: string; roomId?: string; senderId: string; text: string; createdAt: string; deliveredTo?: string[]; seenBy?: string[] }
interface MessagesState { byConversation: Record<string, Message[]> }
const initialState: MessagesState = { byConversation: {} };

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) {
      const { conversationId, messages } = action.payload;
      state.byConversation[conversationId] = [...(state.byConversation[conversationId]||[]), ...messages];
    },
    replaceMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) {
      const { conversationId, messages } = action.payload;
      state.byConversation[conversationId] = messages;
    },
    optimisticAdd(state, action: PayloadAction<{ conversationId: string; message: Message }>) {
      const { conversationId, message } = action.payload;
      state.byConversation[conversationId] = [...(state.byConversation[conversationId]||[]), message];
    },
    reconcileMessage(state, action: PayloadAction<{ conversationId: string; clientMessageId: string; serverMessage: Message }>) {
      const { conversationId, clientMessageId, serverMessage } = action.payload;
      const list = state.byConversation[conversationId];
      if (!list) return;
      const idx = list.findIndex(m => m._id === clientMessageId || m.clientMessageId === clientMessageId);
      if (idx !== -1) {
        list[idx] = serverMessage;
      } else {
        list.push(serverMessage);
      }
      state.byConversation[conversationId] = [...list];
    },
    markSeen(state, action: PayloadAction<{ conversationId: string; userId: string }>) {
      const { conversationId, userId } = action.payload;
      const list = state.byConversation[conversationId];
      if (!list) return;
      state.byConversation[conversationId] = list.map(m => m.senderId === userId ? m : { ...m, seenBy: Array.from(new Set([...(m.seenBy||[]), userId])) });
    }
  }
});

export const { addMessages, replaceMessages, optimisticAdd, markSeen, reconcileMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
