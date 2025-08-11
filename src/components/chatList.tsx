import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/lib/ChatContext";
import React, { useState, useMemo } from 'react';

const ChatList: React.FC = () => {
  const { me, login, online, openDirect, openConversation, activeConversationId, conversations, messagesMap, isTyping, isPartnerOnline, getPartnerUsername, unreadCounts } = useChat();
  const [username, setUsername] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoggingIn(true);
    await login(username.trim());
    setLoggingIn(false);
  };

  const sortedConversations = useMemo(() => {
    if (!me) return [] as any[];
    const list = Object.values(conversations).filter((c: any) => c.type === 'direct' && c.memberIds.includes(me.userId));
    return list.sort((a: any,b: any)=>{
      const aLast = messagesMap[a._id]?.slice(-1)[0]?.createdAt;
      const bLast = messagesMap[b._id]?.slice(-1)[0]?.createdAt;
      return new Date(bLast || 0).getTime() - new Date(aLast || 0).getTime();
    });
  }, [conversations, messagesMap, me]);

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
      {sortedConversations.length === 0 && <p className="text-xs text-center text-muted-foreground mt-2">No chats yet</p>}
      {sortedConversations.map((convo: any) => {
        const lastMsg = messagesMap[convo._id]?.slice(-1)[0];
        const partnerId = convo.memberIds.find((id: string) => id !== me.userId);
        const partnerUsername = (partnerId && getPartnerUsername(convo._id)) || partnerId?.slice(0,6) || 'User';
        const onlineStatus = isPartnerOnline(convo._id);
        const isActive = convo._id === activeConversationId;
        const typingNow = isTyping(convo._id);
        const lastText = typingNow ? 'typing…' : (lastMsg ? lastMsg.text : 'Start chatting');
        const time = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const unreadCount = unreadCounts?.[convo._id] ?? 0;
        return (
          <div key={convo._id} onClick={()=> openConversation(convo._id)} className={`w-full flex items-center p-3 cursor-pointer hover:bg-[var(--wa-secondary)] rounded-2xl transition ${isActive ? 'bg-[var(--wa-secondary)]' : ''}`}>
            <Avatar className="size-11">
              <AvatarImage src={""} />
              <AvatarFallback>{partnerUsername.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 ml-4 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900 truncate">{partnerUsername}{!onlineStatus && <span className="text-[10px] ml-1 opacity-60">(offline)</span>}</h4>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{time || (onlineStatus ? 'online' : '')}</span>
                  {unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[var(--wa-primary)] text-white text-[10px] flex items-center justify-center font-medium">{unreadCount>99?'99+':unreadCount}</span>}
                </span>
              </div>
              <div className="flex items-center text-xs text-gray-500 truncate">
                <span className="truncate">{lastText}</span>
              </div>
            </div>
          </div>
        );
      })}
      {/* New / unseen contacts currently online (no existing direct conversation) */}
  {online.filter(u => !sortedConversations.some((c: any) => c.memberIds.includes(u.userId))).map(u => {
        return (
          <div key={u.userId} onClick={()=> openDirect(u.username)} className={`w-full flex items-center p-3 cursor-pointer hover:bg-[var(--wa-secondary)] rounded-2xl transition`}>
            <Avatar className="size-11">
              <AvatarImage src={""} />
              <AvatarFallback>{u.username.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 ml-4 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900 truncate">{u.username}</h4>
                <span className="text-[10px] text-gray-500">online</span>
              </div>
              <div className="flex items-center text-xs text-gray-500 truncate">
                <span className="truncate">Start chatting</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
