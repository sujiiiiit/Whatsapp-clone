import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/lib/ChatContext";
import React, { useState } from 'react';

const ChatList: React.FC = () => {
  const { me, login, online, openDirect, activeConversationId, conversations, messagesMap, isTyping, isPartnerOnline } = useChat();
  const [username, setUsername] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoggingIn(true);
    await login(username.trim());
    setLoggingIn(false);
  };

  if (!me) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-3 p-4">
        <h3 className="text-lg font-semibold">Enter a username</h3>
        <input autoFocus className="rounded-md px-3 py-2 bg-background3 outline-none" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Unique username" />
        <button disabled={loggingIn} className="bg-[var(--wa-primary)] text-white rounded-md py-2 font-medium disabled:opacity-60">{loggingIn? 'Joining...' : 'Join Chat'}</button>
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {online.length === 0 && <p className="text-xs text-center text-muted-foreground mt-2">No other users online</p>}
      {online.map(u => {
        const convo = Object.values(conversations).find(c => c.type==='direct' && c.memberIds.includes(u.userId) && c.memberIds.includes(me.userId));
        const isActive = convo && convo._id === activeConversationId;
        const lastMsg = convo ? (messagesMap[convo._id]?.slice(-1)[0]) : undefined;
  const typingNow = convo && isTyping(convo._id);
  const lastText = typingNow ? 'typing…' : (lastMsg ? lastMsg.text : 'Start chatting');
        const time = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div key={u.userId} onClick={()=>openDirect(u.username)} className={`w-full flex items-center p-3 cursor-pointer hover:bg-[var(--wa-secondary)] rounded-2xl transition ${isActive ? 'bg-[var(--wa-secondary)]' : ''}`}>
            <Avatar className="size-11">
              <AvatarImage src={""} />
              <AvatarFallback>{u.username.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 ml-4 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900 truncate">{u.username}</h4>
                <span className="text-[10px] text-gray-500">{time || (convo && isPartnerOnline(convo._id) ? 'online' : '')}</span>
              </div>
              <div className="flex items-center text-xs text-gray-500 truncate">
                <span className="truncate">{lastText}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
