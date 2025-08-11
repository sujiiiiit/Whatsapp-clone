import React, { useEffect, useState, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/lib/ChatContext";

type RightColumnProps = {
  dataState: string;
  colRightRef: RefObject<HTMLDivElement | null>;
  toggleDataState: () => void;
  inbtw: boolean;
  isMobile: boolean;
};

export const RightColumn: React.FC<RightColumnProps> = ({
  dataState,
  colRightRef,
  toggleDataState,
  inbtw,
  isMobile,
}) => {
  const { messages, send, activeConversationId, me, isTyping, isPartnerOnline, getPartnerUsername, startTyping } = useChat();
  const [draft, setDraft] = useState("");
  const [showContactHint, setShowContactHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [floatingDate, setFloatingDate] = useState<string | null>(null);

  function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate()-1);
    const sameDay = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yest)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year: d.getFullYear()!==today.getFullYear()? 'numeric': undefined });
  }

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof messages }[] = [];
    let currentLabel: string | null = null;
    messages.forEach(m => {
      const label = formatDateLabel(m.createdAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [m] });
      } else {
        groups[groups.length-1].items.push(m);
      }
    });
    return groups;
  }, [messages]);

  useEffect(()=>{
    // Update floating date on scroll
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const dateHeaders = Array.from(el.querySelectorAll('[data-date-header]')) as HTMLElement[];
      // Find last header above top
      let current: string | null = null;
      for (const hdr of dateHeaders) {
        const rect = hdr.getBoundingClientRect();
        const containerTop = el.getBoundingClientRect().top;
        if (rect.top - containerTop <= 8) current = hdr.dataset.dateLabel || null; else break;
      }
      if (!current && dateHeaders.length) current = dateHeaders[0].dataset.dateLabel || null;
      setFloatingDate(current);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return ()=> el.removeEventListener('scroll', onScroll);
  }, [grouped]);
  useEffect(() => {
    if (!activeConversationId) return;
    setShowContactHint(true);
    const t = setTimeout(()=> setShowContactHint(false), 3000);
    return () => clearTimeout(t);
  }, [activeConversationId]);
  const handleSend = () => {
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft("");
  };
  return (
    <div
      id="col-right"
      ref={colRightRef}
      className="transition-[var(--layer-transition)] w-full flex items-center flex-col row-start-1 col-start-1 bg-background overflow-hidden
        sm:data-[state=leftOpen]:translate-x-[26.5rem] sm:fixed h-[calc(var(--vh,1vh)*100)] max-sm:translate-x-0 fixed data-[state=leftOpen]:translate-x-full lg:data-[state=leftOpen]:translate-x-0 lg:relative lg:w-[calc(100vw-420px)]"
      data-state={dataState}
    >
      <div className="w-full relative h-14 bg-background3 z-[4] px-2 sm:px-4 flex items-center border-b justify-between">
        <div className="flex items-center gap-2">
          {(inbtw || isMobile) && (
            <IconButton className="tgico tgico-previous" onClick={toggleDataState} />
          )}
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center">
              <h2 className="text-md">{activeConversationId ? (getPartnerUsername(activeConversationId) || 'Chat') : 'Select Chat'}</h2>
              <p className="text-xs text-muted-foreground h-4">
                {activeConversationId && showContactHint && 'Click here for contact info.'}
                {activeConversationId && !showContactHint && (
                  isTyping(activeConversationId) ? 'typing…' : (isPartnerOnline(activeConversationId) ? 'online' : 'offline')
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <IconButton className="tgico tgico-search" />
            <IconButton className="tgico tgico-3dots" />
        </div>
      </div>
      <div className="w-full flex-1 relative z-[4] bg-[var(--wa-secondary)] flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
          {!activeConversationId && <p className="text-xs opacity-70">Select a user to start chatting.</p>}
          {grouped.map(g => (
            <div key={g.label} className="flex flex-col gap-2">
              <div data-date-header data-date-label={g.label} className="self-center text-[11px] px-3 py-1 rounded-md bg-[var(--wa-primary)] text-white shadow sticky top-0 opacity-0 pointer-events-none -mt-6"></div>
              <div className="self-center text-[11px] px-3 py-1 rounded-md bg-background3 text-foreground shadow border border-border">{g.label}</div>
              {g.items.map(m => {
                const mine = m.senderId === me?.userId;
                const isTemp = m._id?.startsWith('temp-');
                const seen = (m.seenBy||[]).length > 0 && !isTemp;
                return (
                  <div key={m._id || m.createdAt+Math.random()} className={`bg-background3 rounded-lg px-3 py-2 text-sm max-w-[70%] shadow ${mine ? 'self-end bg-[var(--wa-primary)] text-white' : 'self-start'} ${isTemp ? 'opacity-70 animate-pulse' : ''}`}>
                    <p>{m.text}</p>
                    <span className="flex items-center gap-1 text-[10px] opacity-60 mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {mine && (
                        <>
                          {isTemp && <span title="Sending" className="text-xs">…</span>}
                          {!isTemp && !seen && <span title="Sent" className="text-xs">✔</span>}
                          {seen && <span title="Seen" className="text-xs text-blue-400">✔✔</span>}
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {floatingDate && <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-10">
          <div className="text-[11px] px-3 py-1 rounded-md bg-background3/80 backdrop-blur border border-border shadow">{floatingDate}</div>
        </div>}
        <div className="p-3 flex items-center gap-2 border-t bg-background3">
          <input disabled={!activeConversationId} value={draft} onChange={e=>{ setDraft(e.target.value); startTyping(); }} onKeyDown={e=>{ if(e.key==='Enter') handleSend(); }} className="flex-1 rounded-full px-4 py-2 bg-background outline-none disabled:opacity-50" placeholder={activeConversationId ? "Type a message" : "Select a chat"} />
          <IconButton className="tgico tgico-send" onClick={handleSend} />
        </div>
      </div>
    </div>
  );
};