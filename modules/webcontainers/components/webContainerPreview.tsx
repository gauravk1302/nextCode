"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle, Loader2, XCircle, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Globe } from "lucide-react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import TerminalComponent from "./terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string | null;
  isLoading: boolean;
  loadingStep: string;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  saveCount: number;
}

const STEPS = [
  "Transforming template data",
  "Mounting files",
  "Installing dependencies",
  "Starting development server",
];

// ← Scalable: URL bar alag component
const PreviewToolbar: React.FC<{
  serverUrl: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}> = ({
  serverUrl,
  currentPath,
  onNavigate,
  onRefresh,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
}) => {
  const [inputValue, setInputValue] = useState(currentPath);

  useEffect(() => {
    setInputValue(currentPath);
  }, [currentPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const path = inputValue.startsWith("/") ? inputValue : `/${inputValue}`;
    onNavigate(path);
  };

  const displayUrl = `localhost${currentPath}`;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-zinc-900/80 backdrop-blur-sm">
      {/* Nav buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={!canGoBack}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onForward}
        disabled={!canGoForward}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
      >
        <RotateCw className="h-3.5 w-3.5" />
      </Button>

      {/* URL Bar */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center">
        <div className="flex-1 flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-md px-2 py-1 h-7">
          <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="flex-1 bg-transparent text-xs text-zinc-300 outline-none placeholder-zinc-500 font-mono"
            placeholder="/"
            spellCheck={false}
          />
        </div>
      </form>

      {/* Open external */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(serverUrl + currentPath, "_blank")}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
        title="Open in new tab"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// ← Scalable: Loading steps alag component
const LoadingSteps: React.FC<{
  loadingStep: string;
  instance: WebContainer | null;
}> = ({ loadingStep, instance }) => {
  const terminalRef = useRef<any>(null);
  const currentStepIndex = STEPS.indexOf(loadingStep);

  return (
    <div className="h-full flex flex-col">
      <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
        <h3 className="text-lg font-semibold mb-6 text-center">Setting up environment</h3>
        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isComplete = currentStepIndex > index;
            const isActive = currentStepIndex === index;
            return (
              <div key={step} className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className={`text-sm font-medium ${
                  isComplete ? "text-green-600" :
                  isActive ? "text-blue-600" :
                  "text-gray-400"
                }`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 p-4">
        <TerminalComponent
          ref={terminalRef}
          webContainerInstance={instance}
          theme="dark"
          className="h-full"
        />
      </div>
    </div>
  );
};

// ← Main component
const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  error,
  instance,
  isLoading,
  loadingStep,
  serverUrl,
  saveCount,
}) => {
  const terminalRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Navigation state
  const [currentPath, setCurrentPath] = useState("/");
  const [history, setHistory] = useState<string[]>(["/"]); // ← scalable history stack
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  // Navigate to path
  const navigateTo = useCallback((path: string) => {
  if (!iframeRef.current || !serverUrl) return;

  // Path ko clean karo (ensure it starts with /)
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Base URL ko clean karo (ensure it DOES NOT end with /)
  const baseUrl = serverUrl.replace(/\/$/, "");
  
  const fullUrl = `${baseUrl}${cleanPath}`;

  // History update
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(cleanPath);
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
  setCurrentPath(cleanPath);

  // Directly set src
  iframeRef.current.src = fullUrl;
}, [serverUrl, history, historyIndex]);

  // Back
  const goBack = useCallback(() => {
    if (!canGoBack || !iframeRef.current || !serverUrl) return;
    const newIndex = historyIndex - 1;
    const path = history[newIndex];
    setHistoryIndex(newIndex);
    setCurrentPath(path);
    iframeRef.current.src = serverUrl + path;
  }, [canGoBack, historyIndex, history, serverUrl]);

  // Forward
  const goForward = useCallback(() => {
    if (!canGoForward || !iframeRef.current || !serverUrl) return;
    const newIndex = historyIndex + 1;
    const path = history[newIndex];
    setHistoryIndex(newIndex);
    setCurrentPath(path);
    iframeRef.current.src = serverUrl + path;
  }, [canGoForward, historyIndex, history, serverUrl]);

  // Refresh
  const refresh = useCallback(() => {
    if (!iframeRef.current || !serverUrl) return;
    iframeRef.current.src = serverUrl + currentPath;
  }, [serverUrl, currentPath]);

  // saveCount change pe refresh
  useEffect(() => {
    if (iframeRef.current && serverUrl) {
      iframeRef.current.src = serverUrl + currentPath;
    }
  }, [saveCount]);

  // serverUrl set hone pe initialize
  useEffect(() => {
    if (serverUrl && iframeRef.current) {
      setCurrentPath("/");
      setHistory(["/"]);
      setHistoryIndex(0);
      iframeRef.current.src = serverUrl;
    }
  }, [serverUrl]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !serverUrl) {
    return <LoadingSteps loadingStep={loadingStep} instance={instance} />;
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <PreviewToolbar
        serverUrl={serverUrl}
        currentPath={currentPath}
        onNavigate={navigateTo}
        onRefresh={refresh}
        onBack={goBack}
        onForward={goForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />

      {/* iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={serverUrl}
          className="w-full h-full border-none"
          title="WebContainer Preview"
        />
      </div>

      {/* Terminal — collapsible */}
      <div className={cn(
        "border-t border-zinc-800 transition-all duration-200",
        isTerminalOpen ? "h-48" : "h-8"
      )}>
        <div
          className="h-8 flex items-center justify-between px-3 bg-zinc-900/80 cursor-pointer select-none"
          onClick={() => setIsTerminalOpen(prev => !prev)}
        >
          <span className="text-xs text-zinc-400 font-mono">Terminal</span>
          <span className="text-xs text-zinc-500">{isTerminalOpen ? "▼" : "▲"}</span>
        </div>
        {isTerminalOpen && (
          <div className="h-[calc(100%-2rem)]">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WebContainerPreview;