import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import presenceReducer from './slices/presenceSlice';
import conversationsReducer from './slices/conversationsSlice';
import messagesReducer from './slices/messagesSlice';
import typingReducer from './slices/typingSlice';
import socketMiddleware from './middleware/socketMiddleware';

export const store = configureStore({
  reducer: {
    user: userReducer,
    presence: presenceReducer,
    conversations: conversationsReducer,
    messages: messagesReducer,
    typing: typingReducer,
  },
  middleware: (getDefault) => getDefault().concat(socketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
