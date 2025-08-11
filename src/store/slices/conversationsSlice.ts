import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Conversation { _id: string; type: 'direct'|'group'; memberIds: string[]; title?: string }
interface ConversationsState { activeId?: string; byId: Record<string, Conversation>; }
const initialState: ConversationsState = { byId: {} };

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    upsertConversation(state, action: PayloadAction<Conversation>) {
      const c = action.payload; state.byId[c._id] = c;
    },
    setActiveConversation(state, action: PayloadAction<string | undefined>) { state.activeId = action.payload; },
  }
});

export const { upsertConversation, setActiveConversation } = conversationsSlice.actions;
export default conversationsSlice.reducer;
