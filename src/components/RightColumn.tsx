import React from "react";
import type { RefObject } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
              <h2 className="text-md">Sujit Dwivedi</h2>
              <p className="text-xs text-muted-foreground">
                Click here for contact info.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <IconButton className="tgico tgico-search" />
            <IconButton className="tgico tgico-3dots" />
        </div>
      </div>
      <div className="w-full flex-1 relative z-[4] bg-[var(--wa-secondary)]" />
    </div>
  );
};