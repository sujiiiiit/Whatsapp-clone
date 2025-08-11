import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UserState { userId?: string; username?: string; }
const initialState: UserState = {};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ userId: string; username: string }>) {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
    },
  }
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;
