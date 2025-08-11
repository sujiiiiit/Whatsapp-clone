import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PresenceUser { userId: string; username: string }
interface PresenceState { users: PresenceUser[] }
const initialState: PresenceState = { users: [] };

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setPresence(state, action: PayloadAction<PresenceUser[]>) { state.users = action.payload; },
  }
});

export const { setPresence } = presenceSlice.actions;
export default presenceSlice.reducer;
