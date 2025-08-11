import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface TypingState { byConversation: Record<string, Set<string>> }
const initialState: TypingState = { byConversation: {} };

const typingSlice = createSlice({
  name: 'typing',
  initialState,
  reducers: {
    setTyping(state, action: PayloadAction<{ conversationId: string; userId: string; isTyping: boolean }>) {
      const { conversationId, userId, isTyping } = action.payload;
      const set = new Set(state.byConversation[conversationId] ? Array.from(state.byConversation[conversationId]) : []);
      if (isTyping) set.add(userId); else set.delete(userId);
      state.byConversation[conversationId] = set;
    },
    clearTyping(state, action: PayloadAction<{ conversationId: string; userId: string }>) {
      const { conversationId, userId } = action.payload;
      const set = new Set(state.byConversation[conversationId] ? Array.from(state.byConversation[conversationId]) : []);
      set.delete(userId);
      state.byConversation[conversationId] = set;
    }
  }
});

export const { setTyping, clearTyping } = typingSlice.actions;
export default typingSlice.reducer;
