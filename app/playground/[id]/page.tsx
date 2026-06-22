"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingStep from "@/modules/playground/components/loader";
import { PlaygroundEditor } from "@/modules/playground/components/playground-editor";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { findFilePath } from "@/modules/playground/lib";
import {
  TemplateFile,
  TemplateFolder,
} from "@/modules/playground/lib/path-to-json";
import { useWebContainer } from "@/modules/webcontainers/hooks/useWebContainer";
import {
  AlertCircle,
  Bot,
  FileText,
  FolderOpen,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import ToggleAI from "@/modules/playground/components/toggle-ai";

const WebContainerPreview = dynamic(
  () => import("@/modules/webcontainers/components/webContainerPreview"),
  { ssr: false },
);

function buildFileContext(
  items: any[],
  currentPath = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of items) {
    if (item.folderName && item.items) {
      const folderPath = currentPath
        ? `${currentPath}/${item.folderName}`
        : item.folderName;
      Object.assign(result, buildFileContext(item.items, folderPath));
    } else if (item.filename) {
      const filePath = currentPath
        ? `${currentPath}/${item.filename}${item.fileExtension ? `.${item.fileExtension}` : ""}`
        : `${item.filename}${item.fileExtension ? `.${item.fileExtension}` : ""}`;
      result[filePath] = item.content || "";
    }
  }
  return result;
}

const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [saveCount, setSaveCount] = useState(0);

  // Naya simple state strictly Toggle aur Editor ko control karne ke liye
  const [isAIEnabled, setIsAIEnabled] = useState(true);

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  const {
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
    activeFileId,
    closeAllFiles,
    closeFile,
    openFile,
    openFiles,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    updateFileContent,
  } = useFileExplorer();

  const {
    serverUrl,
    isLoading: containerLoading,
    loadingStep,
    error: containerError,
    instance,
    writeFileSync,
    destroy,
  } = useWebContainer({ templateData: templateData! });

  const lastSyncedContent = useRef<Map<string, string>>(new Map());

  const fileContext = templateData
    ? buildFileContext((templateData as any).items || [])
    : {};

  // FIXED: Syncing both WebContainer FS and Monaco Editor/React State
  
// FIXED: Bulletproof State Sync for Monaco Editor & WebContainer
  const handleApplyFileChanges = useCallback(
    async (fileChanges: Record<string, string>) => {
      if (!instance?.fs) {
        toast.error("WebContainer not ready");
        return;
      }
      try {
        const { 
          templateData: latestTemplateData, 
          openFiles: currentOpenFiles, 
          setTemplateData: setStoreTemplateData, 
          setOpenFiles: setStoreOpenFiles 
        } = useFileExplorer.getState();
        
        if (!latestTemplateData) return;

        let updatedTemplateData = JSON.parse(JSON.stringify(latestTemplateData));
        let updatedOpenFiles = [...currentOpenFiles];

        for (const [rawFilePath, content] of Object.entries(fileChanges)) {
          // 1. Path cleaning
          let cleanPath = rawFilePath.trim();
          if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
          if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);

          const pathParts = cleanPath.split("/");
          const filenameWithExt = pathParts.pop() || "";
          const folderPath = pathParts.join("/");

          // 2. Auto-mkdir in WebContainer (Prevents ENOENT crashes)
          if (folderPath) {
            try {
              await instance.fs.mkdir(folderPath, { recursive: true });
            } catch (e) {
              // Ignore directory exists error
            }
          }

          // 3. Write new code to WebContainer FS (Updates Preview)
          await instance.fs.writeFile(cleanPath, content);

          // 4. Extract filename and extension
          const lastDotIndex = filenameWithExt.lastIndexOf(".");
          const filename = lastDotIndex !== -1 ? filenameWithExt.substring(0, lastDotIndex) : filenameWithExt;
          const fileExtension = lastDotIndex !== -1 ? filenameWithExt.substring(lastDotIndex + 1) : "";

          // 5. 🔥 INDEPENDENT OPEN FILES SYNC (The Fix for Editor Reverting) 🔥
          // Pehle hum exact path se match karenge
          let openFileIndex = updatedOpenFiles.findIndex((f) => {
            const p = findFilePath(f, latestTemplateData);
            return p === cleanPath || p === `/${cleanPath}`;
          });

          // Fallback: Agar exact path nahi mila, toh filename se dhoondhenge
          if (openFileIndex === -1) {
            openFileIndex = updatedOpenFiles.findIndex(
              (f) => f.filename === filename && f.fileExtension === fileExtension
            );
          }

          // Agar file open hai, toh forcefully uska content update karo Monaco ke liye
          if (openFileIndex !== -1) {
            updatedOpenFiles[openFileIndex] = {
              ...updatedOpenFiles[openFileIndex],
              content: content,
              originalContent: content, 
              hasUnsavedChanges: false,
            };
          }

          // 6. Update File Explorer Tree state
          const updateItemInTree = (items: any[], parts: string[]): any[] => {
            if (parts.length === 0) {
              return items.map((item) => {
                if (item.filename === filename && item.fileExtension === fileExtension) {
                  return { ...item, content };
                }
                return item;
              });
            }
            const currentFolder = parts[0];
            return items.map((item) => {
              if (item.folderName === currentFolder) {
                return { ...item, items: updateItemInTree(item.items, parts.slice(1)) };
              }
              return item;
            });
          };

          updatedTemplateData.items = updateItemInTree(updatedTemplateData.items, pathParts);
        }

        // 7. Apply to Zustand store and trigger re-renders
        setStoreTemplateData(updatedTemplateData);
        setStoreOpenFiles(updatedOpenFiles);
        await saveTemplateData(updatedTemplateData);

        setSaveCount((prev) => prev + 1);
        toast.success(`Applied ${Object.keys(fileChanges).length} file change(s)`);
      } catch (err) {
        console.error("Apply changes error:", err);
        toast.error("Failed to apply changes");
      }
    },
    [instance, saveTemplateData],
  );

  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  useEffect(() => {
    if (templateData && !openFiles.length) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  const wrappedHandleAddFile = useCallback(
    (newFile: TemplateFile, parentPath: string) => {
      return handleAddFile(
        newFile,
        parentPath,
        writeFileSync!,
        instance,
        saveTemplateData,
      );
    },
    [handleAddFile, writeFileSync, instance, saveTemplateData],
  );

  const wrappedHandleAddFolder = useCallback(
    (newFolder: TemplateFolder, parentPath: string) => {
      return handleAddFolder(newFolder, parentPath, instance, saveTemplateData);
    },
    [handleAddFolder, instance, saveTemplateData],
  );

  const wrappedHandleDeleteFile = useCallback(
    (file: TemplateFile, parentPath: string) => {
      return handleDeleteFile(file, parentPath, saveTemplateData);
    },
    [handleDeleteFile, saveTemplateData],
  );

  const wrappedHandleDeleteFolder = useCallback(
    (folder: TemplateFolder, parentPath: string) => {
      return handleDeleteFolder(folder, parentPath, saveTemplateData);
    },
    [handleDeleteFolder, saveTemplateData],
  );

  const wrappedHandleRenameFile = useCallback(
    (
      file: TemplateFile,
      newFilename: string,
      newExtension: string,
      parentPath: string,
    ) => {
      return handleRenameFile(
        file,
        newFilename,
        newExtension,
        parentPath,
        saveTemplateData,
      );
    },
    [handleRenameFile, saveTemplateData],
  );

  const wrappedHandleRenameFolder = useCallback(
    (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
      return handleRenameFolder(
        folder,
        newFolderName,
        parentPath,
        saveTemplateData,
      );
    },
    [handleRenameFolder, saveTemplateData],
  );

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const debouncedWriteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback(
    (value: string) => {
      if (!activeFileId) return;
      updateFileContent(activeFileId, value);

      if (debouncedWriteRef.current) clearTimeout(debouncedWriteRef.current);
      debouncedWriteRef.current = setTimeout(async () => {
        if (!instance?.fs || !activeFile) return;
        const latestTemplateData = useFileExplorer.getState().templateData;
        if (!latestTemplateData) return;
        const filePath = findFilePath(activeFile, latestTemplateData);
        if (!filePath) return;
        await instance.fs.writeFile(filePath, value);
        setSaveCount((prev) => prev + 1);
      }, 300);
    },
    [activeFileId, activeFile, instance, updateFileContent],
  );

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetFileId = fileId || activeFileId;
      if (!targetFileId) return;

      const fileToSave = openFiles.find((f) => f.id === targetFileId);
      if (!fileToSave) return;

      const latestTemplateData = useFileExplorer.getState().templateData;
      if (!latestTemplateData) return;

      try {
        const filePath = findFilePath(fileToSave, latestTemplateData);
        if (!filePath) {
          toast.error(
            `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`,
          );
          return;
        }

        const updatedTemplateData = JSON.parse(
          JSON.stringify(latestTemplateData),
        );

        // @ts-ignore
        const recursivelyUpdateItems = (items: any[]) =>
          // @ts-ignore
          items.map((item) => {
            if ("folderName" in item) {
              return { ...item, items: recursivelyUpdateItems(item.items) };
            } else if (
              item.filename === fileToSave.filename &&
              item.fileExtension === fileToSave.fileExtension
            ) {
              return { ...item, content: fileToSave.content };
            }
            return item;
          });

        updatedTemplateData.items = recursivelyUpdateItems(
          updatedTemplateData.items,
        );

        if (instance && instance.fs) {
          await instance.fs.writeFile(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
        }

        await saveTemplateData(updatedTemplateData);
        setTemplateData(updatedTemplateData);
        setSaveCount((prev) => prev + 1);

        const updatedOpenFiles = openFiles.map((f) =>
          f.id === targetFileId
            ? {
                ...f,
                content: fileToSave.content,
                originalContent: fileToSave.content,
                hasUnsavedChanges: false,
              }
            : f,
        );
        setOpenFiles(updatedOpenFiles);

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`,
        );
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`,
        );
        throw error;
      }
    },
    [
      activeFileId,
      openFiles,
      instance,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ],
  );

  const handleSaveAll = async () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges);
    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes");
      return;
    }
    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      toast.error("Failed to save some files");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep
              currentStep={1}
              step={1}
              label="Loading playground data"
            />
            <LoadingStep
              currentStep={2}
              step={2}
              label="Setting up environment"
            />
            <LoadingStep currentStep={3} step={3} label="Ready to code" />
          </div>
        </div>
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">
          No template data available
        </h2>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Template
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={wrappedHandleAddFile}
          onAddFolder={wrappedHandleAddFolder}
          onDeleteFile={wrappedHandleDeleteFile}
          onDeleteFolder={wrappedHandleDeleteFolder}
          onRenameFile={wrappedHandleRenameFile}
          onRenameFolder={wrappedHandleRenameFolder}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1">
                <h1 className="text-sm font-medium">
                  {playgroundData?.title || "Code Playground"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {openFiles.length} File(s) Open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave()}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save (Ctrl+S)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" /> All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save All</TooltipContent>
                </Tooltip>
                <ToggleAI
                  isEnabled={isAIEnabled}
                  onToggle={setIsAIEnabled}
                  suggestionLoading={false}
                  fileContext={fileContext}
                  onApplyFileChanges={handleApplyFileChanges}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>
                              {file.hasUnsavedChanges && (
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                              )}
                              <span
                                className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>
                <div className="flex-1">
                  <ResizablePanelGroup className="h-full">
                    <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                      {/* FIXED: Passing isAIEnabled properly to PlaygroundEditor */}
                      <PlaygroundEditor
                        activeFile={activeFile}
                        content={activeFile?.content || ""}
                        onContentChange={handleContentChange}
                        isAIEnabled={isAIEnabled}
                      />
                    </ResizablePanel>
                    {isPreviewVisible && (
                      <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={50}>
                          <WebContainerPreview
                            templateData={templateData}
                            instance={instance}
                            writeFileSync={writeFileSync}
                            isLoading={containerLoading}
                            loadingStep={loadingStep}
                            error={containerError}
                            serverUrl={serverUrl}
                            saveCount={saveCount}
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
                <FileText className="h-16 w-16 text-gray-300" />
                <div className="text-center">
                  <p className="text-lg font-medium">No files open</p>
                  <p className="text-sm text-gray-500">
                    Select a file from the sidebar to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
