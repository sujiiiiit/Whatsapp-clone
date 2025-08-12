import React from "react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSearch, useClearSearch, useSearchInput } from "@/hooks/useSearch";
import { TooltipIcon, type IconItem } from "./ui/TooltipIcon";
import Checkbox from "@/components/ui/checkbox";
import ChatList from "./chatList";
type LeftColumnProps = {
  dataState: string;
  iconGroups: { top: IconItem[]; bottom: IconItem[] };
  onChatItemClick?: () => void;
};

export const LeftColumn: React.FC<LeftColumnProps> = ({
  dataState,
  iconGroups,
  onChatItemClick,
}) => {
  const { searchContent, handleSearchChange } = useSearchInput();
  const { openSearch } = useSearch();
  const { inputRef } = useClearSearch();

  return (
    <div
      className="h-dvh  flex flex-col-reverse sm:flex-row layer-transition sm:flex-2 w-full max-w-full sm:border-r dark:border-background bg-background2 overflow-hidden
        data-[state=leftOpen]:-translate-x-0 -translate-x-20 lg:data-[state=leftOpen]:translate-x-0 sm:data-[state=leftOpen]:translate-x-0 sm:fixed sm:left-0 sm:top-0 sm:w-[26.5rem] sm:-translate-x-20 fixed lg:relative lg:w/full lg:max-w-[420px]"
      data-state={dataState}
    >
      <header className="bg-[var(--wa-secondary)] min-w-16 sm:max-w-16 p-1 sm:p-3 flex flex-row sm:flex-col items-center justify-between border-t sm:border-r">
        <div className="w-full flex sm:flex-col gap-2 items-center justify-evenly">
          {iconGroups.top.map((item, i) => (
            <TooltipIcon key={i} {...item} />
          ))}
        </div>
        <div className="sm:flex hidden sm:flex-col gap-2 items-center">
          {iconGroups.bottom.map((item, i) => (
            <TooltipIcon key={i} {...item} />
          ))}
        </div>
      </header>

      <div className=" overflow-hidden p-3 w-full flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--wa-primary)] ">
            WhatsApp
          </h2>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton className="tgico tgico-3dots" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem>
                  <span className="tgico flex items-center justify-center tgico-new-group" />
                  <span>New Group</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="tgico flex items-center justify-center tgico-star" />
                  <span>Stared Messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="tgico flex items-center justify-center tgico-box" />
                  <span>Select Message</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400 focus:bg-red-50 focus:text-red-400">
                  <span className="tgico flex items-center justify-center tgico-logout" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative outline-0 w-full border-2 border-transparent h-[42px] rounded-full flex items-center transition-all duration-200 ease-in-out group focus-within:border-[var(--wa-primary)] focus-within:border-2 box-border bg-[var(--wa-secondary)] focus-within:bg-transparent">
          <input
            type="text"
            className="w-full bg-transparent z-[2] h-full rounded-full px-[calc(42px_+_3px_+_1px)] border-0 outline-0 transition-all duration-100 ease-in-out placeholder:text-text2 placeholder:font-medium"
            onFocus={openSearch}
            ref={inputRef}
            onChange={handleSearchChange}
          />
          <span
            className="text-black font-extralight block pointer-events-none absolute opacity-0 max-w-full pr-[0.5rem] left-[calc(42px_+_3px_+_1px)] z-1 whitespace-nowrap overflow-ellipsis overflow-hidden transition-all data-[state=empty]:opacity-100 duration-150 ease-in-out transform data-[state=empty]:translate-x-0 data-[state=empty]:translate-y-0  translate-x-[calc(1rem_*_1)] translate-y-0"
            data-state={searchContent ? "full" : "empty"}
          >
            Search or start new chat
          </span>
          <span className="group-focus-within:text-primaryColor tgico tgico-search absolute group left-3 top-2 transition-all duration-200 ease-in-out" />
        </div>
        <Checkbox />
  <ChatList onItemClick={onChatItemClick} />
      </div>
    </div>
  );
};
