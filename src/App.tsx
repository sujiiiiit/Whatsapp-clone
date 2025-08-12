import React from "react";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { useToggleState } from "@/hooks/useToggleState";
import { useMediaQuery } from "@custom-react-hooks/use-media-query";

import { LeftColumn } from "@/components/LeftColumn";
import { RightColumn } from "@/components/RightColumn";
import type { IconItem } from "@/components/ui/TooltipIcon";

const iconGroups: { top: IconItem[]; bottom: IconItem[] } = {
  top: [
    { iconClass: "tgico tgico-chats", label: "Chats" },
    { iconClass: "tgico tgico-status", label: "Status" },
    { iconClass: "tgico tgico-calls", label: "Calls" },
  ],
  bottom: [
    { iconClass: "tgico tgico-setting-filled", label: "Settings" },
    {
      iconClass: "",
      label: "Profile",
      isAvatar: true,
      avatarSrc: "https://github.com/shadcn.png",
      avatarFallback: "CN",
    },
  ],
};

const App: React.FC = () => {
  const { colRightRef } = useWindowDimensions();
  const { state: dataState, toggleState: toggleDataState } = useToggleState("no");
  const inbtw = useMediaQuery("only screen and (min-width : 640px) and (max-width : 1024px)");
  const isMobile = useMediaQuery("only screen and (max-width : 640px)");

  // When a chat is clicked in the list, force dataState to 'leftOpen' on mobile only
  const handleChatItemClick = React.useCallback(() => {
    if (isMobile && dataState !== "no") {
      toggleDataState();
    }
  }, [isMobile, dataState, toggleDataState]);


  return (
    <div className="w-dvw h-[calc(var(--vh,1vh)*100)] flex overflow-hidden relative">
      <LeftColumn dataState={dataState} iconGroups={iconGroups} onChatItemClick={handleChatItemClick} />
      <RightColumn
        dataState={dataState}
        colRightRef={colRightRef}
        toggleDataState={toggleDataState}
        inbtw={inbtw}
        isMobile={isMobile}
      />
    </div>
  );
};

export default App;