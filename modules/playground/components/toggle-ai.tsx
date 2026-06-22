"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  FileText,
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { AIChatSidePanel } from "@/modules/ai-chat/components/ai-chat-sidebarpanel";

interface ToggleAIProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  suggestionLoading: boolean;
  loadingProgress?: number;
  activeFeature?: string;
  fileContext?: Record<string, string>;
  onApplyFileChanges?: (changes: Record<string, string>) => Promise<void>;
}

const ToggleAI: React.FC<ToggleAIProps> = ({
  isEnabled,
  onToggle,
  suggestionLoading,
  loadingProgress = 0,
  activeFeature,
  fileContext = {},
  onApplyFileChanges,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant={isEnabled ? "default" : "outline"}
            className={cn(
              "relative gap-2 h-8 px-3 text-sm font-medium transition-all duration-200",
              isEnabled
                ? "bg-zinc-950 hover:bg-zinc-800 text-zinc-50 border-zinc-800"
                : "bg-background hover:bg-accent text-foreground border-border",
              suggestionLoading && "opacity-75",
            )}
            onClick={(e) => e.preventDefault()}
          >
            {suggestionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            <span>AI</span>
            {isEnabled ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        {/* Strictly dark theme enforced for the dropdown content */}
        <DropdownMenuContent align="end" className="w-72 bg-zinc-950 text-zinc-50 border-zinc-800">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isEnabled
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700",
                )}
              >
                {isEnabled ? "Active" : "Inactive"}
              </Badge>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          {suggestionLoading && activeFeature && (
            <div className="px-3 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{activeFeature}</span>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>
                <Progress value={loadingProgress} className="h-1.5 bg-zinc-800 [&>div]:bg-zinc-50" />
              </div>
            </div>
          )}
          
          <DropdownMenuSeparator className="bg-zinc-800" />
          
          <DropdownMenuItem
            onClick={() => onToggle(!isEnabled)}
            className="py-2.5 cursor-pointer focus:bg-zinc-800 focus:text-zinc-50"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {isEnabled ? (
                  <Power className="h-4 w-4 text-zinc-400" />
                ) : (
                  <PowerOff className="h-4 w-4 text-zinc-400" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {isEnabled ? "Disable" : "Enable"} AI
                  </div>
                  <div className="text-xs text-zinc-400">
                    Toggle AI assistance
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "w-8 h-4 rounded-full border transition-all duration-200 relative",
                  isEnabled
                    ? "bg-green-500 border-green-500"
                    : "bg-zinc-800 border-zinc-700",
                )}
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full bg-white transition-all duration-200 absolute top-[1px]",
                    isEnabled ? "left-[17px]" : "left-[1px]",
                  )}
                />
              </div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-zinc-800" />
          
          <DropdownMenuItem
            onClick={() => setIsChatOpen(true)}
            className="py-2.5 cursor-pointer focus:bg-zinc-800 focus:text-zinc-50"
          >
            <div className="flex items-center gap-3 w-full">
              <FileText className="h-4 w-4 text-zinc-400" />
              <div>
                <div className="text-sm font-medium">Open Chat</div>
                <div className="text-xs text-zinc-400">
                  Chat with AI assistant
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AIChatSidePanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        fileContext={fileContext}
        onApplyFileChanges={onApplyFileChanges}
      />
    </>
  );
};

export default ToggleAI;