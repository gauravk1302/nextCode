"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Send,
  User,
  Copy,
  X,
  Code,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Settings,
  Zap,
  Brain,
  Search,
  Filter,
  Download,
  CheckCheck,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import "katex/dist/katex.min.css";
import Image from "next/image";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
  timestamp: Date;
  type?: "chat" | "code_review" | "suggestion" | "error_fix" | "optimization";
  tokens?: number;
  model?: string;
  fileChanges?: Record<string, string>; // ← ADD
}

interface AIChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  fileContext?: Record<string, string>;           // ← ADD
  onApplyFileChanges?: (changes: Record<string, string>) => Promise<void>; // ← ADD
}

const MessageTypeIndicator: React.FC<{
  type?: string;
  model?: string;
  tokens?: number;
}> = ({ type, model, tokens }) => {
  const getTypeConfig = (type?: string) => {
    switch (type) {
      case "code_review":
        return { icon: Code, color: "text-blue-400", label: "Code Review" };
      case "suggestion":
        return { icon: Sparkles, color: "text-purple-400", label: "Suggestion" };
      case "error_fix":
        return { icon: RefreshCw, color: "text-red-400", label: "Error Fix" };
      case "optimization":
        return { icon: Zap, color: "text-yellow-400", label: "Optimization" };
      default:
        return { icon: MessageSquare, color: "text-zinc-400", label: "Chat" };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", config.color)} />
        <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {model && <span>{model}</span>}
        {tokens && <span>{tokens} tokens</span>}
      </div>
    </div>
  );
};

// ← ADD — File Changes Card component
const FileChangesCard: React.FC<{
  fileChanges: Record<string, string>;
  onApply: () => void;
  applied: boolean;
}> = ({ fileChanges, onApply, applied }) => {
  const fileCount = Object.keys(fileChanges).length;

  return (
    <div className="mt-3 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="bg-zinc-800/80 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium text-zinc-300">
            {fileCount} file{fileCount > 1 ? "s" : ""} changed
          </span>
        </div>
        <Button
          size="sm"
          onClick={onApply}
          disabled={applied}
          className={cn(
            "h-7 px-3 text-xs gap-1.5",
            applied
              ? "bg-green-700 hover:bg-green-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          {applied ? (
            <>
              <CheckCheck className="h-3 w-3" />
              Applied
            </>
          ) : (
            <>
              <CheckCheck className="h-3 w-3" />
              Apply Changes
            </>
          )}
        </Button>
      </div>
      <div className="divide-y divide-zinc-800">
        {Object.keys(fileChanges).map((filePath) => (
          <div key={filePath} className="px-3 py-1.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-xs text-zinc-400 font-mono">{filePath}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  onClose,
  fileContext = {},
  onApplyFileChanges,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"chat" | "review" | "fix" | "optimize">("chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [autoSave, setAutoSave] = useState(true);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set()); // ← ADD

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const getChatModePrompt = (mode: string, content: string) => {
    switch (mode) {
      case "review":
        return `Please review this code and provide detailed suggestions:\n\n**Request:** ${content}`;
      case "fix":
        return `Please help fix issues in this code:\n\n**Problem:** ${content}`;
      case "optimize":
        return `Please analyze this code for optimizations:\n\n**Code:** ${content}`;
      default:
        return content;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageType =
      chatMode === "chat" ? "chat"
      : chatMode === "review" ? "code_review"
      : chatMode === "fix" ? "error_fix"
      : "optimization";

    const newMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      id: Date.now().toString(),
      type: messageType,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const contextualMessage = getChatModePrompt(chatMode, input.trim());

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextualMessage,
          history: messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          files: fileContext, // ← file context pass karo
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            id: Date.now().toString(),
            type: messageType,
            tokens: data.tokens,
            model: data.model || "Claude",
            fileChanges: data.fileChanges && Object.keys(data.fileChanges).length > 0
              ? data.fileChanges
              : undefined, // ← file changes store karo
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
            id: Date.now().toString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting. Please try again.",
          timestamp: new Date(),
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ← ADD — Apply changes handler
  const handleApplyChanges = async (messageId: string, fileChanges: Record<string, string>) => {
    if (!onApplyFileChanges) {
      toast.error("Cannot apply changes — editor not connected");
      return;
    }
    try {
      await onApplyFileChanges(fileChanges);
      setAppliedChanges((prev) => new Set([...prev, messageId]));
    } catch (err) {
      toast.error("Failed to apply changes");
    }
  };

  const exportChat = () => {
    const chatData = { messages, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages
    .filter((msg) => filterType === "all" || msg.type === filterType)
    .filter((msg) => !searchTerm || msg.content.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <TooltipProvider>
      <>
        <div
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={onClose}
        />

        <div
          className={cn(
            "fixed right-0 top-0 h-full w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-out shadow-2xl",
            isOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border rounded-full flex items-center justify-center">
                  <Image src="/logo.svg" alt="Logo" width={24} height={24} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">AI Assistant</h2>
                  <p className="text-xs text-zinc-400">{messages.length} messages • {Object.keys(fileContext).length} files in context</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem checked={autoSave} onCheckedChange={setAutoSave}>
                      Auto-save conversations
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportChat}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMessages([])}>
                      Clear All Messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs + Search */}
            <div className="px-4 pb-3 flex items-center gap-3">
              <Tabs value={chatMode} onValueChange={(v) => setChatMode(v as any)}>
                <TabsList className="h-8 bg-zinc-800/50">
                  <TabsTrigger value="chat" className="h-7 text-xs gap-1">
                    <MessageSquare className="h-3 w-3" /> Chat
                  </TabsTrigger>
                  <TabsTrigger value="review" className="h-7 text-xs gap-1">
                    <Code className="h-3 w-3" /> Review
                  </TabsTrigger>
                  <TabsTrigger value="fix" className="h-7 text-xs gap-1">
                    <RefreshCw className="h-3 w-3" /> Fix
                  </TabsTrigger>
                  <TabsTrigger value="optimize" className="h-7 text-xs gap-1">
                    <Zap className="h-3 w-3" /> Optimize
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 bg-zinc-800/50 border-zinc-700/50 text-xs"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Filter className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterType("all")}>All Messages</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("chat")}>Chat Only</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("code_review")}>Code Reviews</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("error_fix")}>Error Fixes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("optimization")}>Optimizations</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="p-4 space-y-4">
              {filteredMessages.length === 0 && !isLoading && (
                <div className="text-center text-zinc-500 py-16">
                  <Brain className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold mb-2 text-zinc-300">AI Assistant</h3>
                  <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-6">
                    Ask me to modify your code, fix bugs, or add features.
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto">
                    {[
                      "Add a button to index.js",
                      "Fix TypeScript errors",
                      "Add error handling",
                      "Optimize this component",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredMessages.map((msg) => (
                <div key={msg.id}>
                  <div className={cn(
                    "flex items-start gap-3 group",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 border rounded-full flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}

                    <div className={cn(
                      "max-w-[85%] rounded-xl shadow-sm",
                      msg.role === "user"
                        ? "bg-zinc-800 text-white p-3 rounded-br-sm"
                        : "bg-zinc-900 text-zinc-100 p-4 rounded-bl-sm border border-zinc-800",
                    )}>
                      {msg.role === "assistant" && (
                        <MessageTypeIndicator type={msg.type} model={msg.model} tokens={msg.tokens} />
                      )}

                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            code: ({ children, className }) => {
                              if (!className) {
                                return (
                                  <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <div className="bg-zinc-800 rounded-lg p-3 my-3">
                                  <pre className="text-xs text-zinc-100 overflow-x-auto">
                                    <code className={className}>{children}</code>
                                  </pre>
                                </div>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* ← File Changes Card */}
                      {msg.role === "assistant" && msg.fileChanges && (
                        <FileChangesCard
                          fileChanges={msg.fileChanges}
                          onApply={() => handleApplyChanges(msg.id, msg.fileChanges!)}
                          applied={appliedChanges.has(msg.id)}
                        />
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/30">
                        <div className="text-xs text-zinc-500">{msg.timestamp.toLocaleTimeString()}</div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 border border-zinc-700 bg-zinc-800 shrink-0">
                        <AvatarFallback className="bg-zinc-700 text-zinc-300">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 border rounded-full flex items-center justify-center shrink-0">
                    <Brain className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-zinc-300">
                      {chatMode === "review" ? "Analyzing code..."
                        : chatMode === "fix" ? "Finding fixes..."
                        : chatMode === "optimize" ? "Optimizing..."
                        : "Thinking..."}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder={
                    chatMode === "chat" ? "Ask me to modify your code..."
                    : chatMode === "review" ? "What should I review?"
                    : chatMode === "fix" ? "Describe the issue..."
                    : "What should I optimize?"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendMessage(e as any);
                    }
                  }}
                  disabled={isLoading}
                  className="min-h-[44px] max-h-32 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder-zinc-500 resize-none text-sm"
                  rows={1}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">⌘+Enter to send • {Object.keys(fileContext).length} files in context</p>
          </form>
        </div>
      </>
    </TooltipProvider>
  );
};