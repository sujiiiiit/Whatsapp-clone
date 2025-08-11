import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";

export type IconItem = {
  iconClass: string;
  label: string;
  isAvatar?: boolean;
  avatarSrc?: string;
  avatarFallback?: string;
};

export const TooltipIcon: React.FC<IconItem> = ({
  iconClass,
  label,
  isAvatar,
  avatarSrc,
  avatarFallback,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {isAvatar ? (
        <Avatar>
          <AvatarImage src={avatarSrc} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
      ) : (
        <IconButton className={`w-full sm:w-auto flex-col gap-1 ${iconClass}`}>
          <span className="sm:hidden flex w-full justify-center text-xs">
            {label}
          </span>
        </IconButton>
      )}
    </TooltipTrigger>
    <TooltipContent className="hidden sm:flex" side="right">
      {label}
    </TooltipContent>
  </Tooltip>
);