"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostActionsMenuProps {
  onDeleteClick: () => void;
}

export function PostActionsMenu({ onDeleteClick }: PostActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="メニュー"
        >
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={onDeleteClick}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>削除</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
