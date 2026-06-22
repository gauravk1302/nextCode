"use client";

import { useRef, useEffect, useState } from "react";
import Editor, { type Monaco, useMonaco } from "@monaco-editor/react";
import { TemplateFile } from "../lib/path-to-json";
import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "../lib/editor-config";
import { useAISuggestions } from "../hooks/useAISuggestion";

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined;
  content: string;
  onContentChange: (value: string) => void;
  isAIEnabled?: boolean; // Toggle state passed from MainPlaygroundPage
}

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  isAIEnabled = true,
}: PlaygroundEditorProps) => {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Initialize our highly optimized native Monaco AI Hook
  useAISuggestions(monaco, editorInstance, isAIEnabled);

  const handleEditorDidMount = (editor: any, monacoInstance: Monaco) => {
    editorRef.current = editor;
    setEditorInstance(editor); // Save instance for the AI hook

    editor.updateOptions({
      ...defaultEditorOptions,
      // Enable Monaco's native inline suggestion behavior
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        suppressSuggestions: false,
      },
      suggest: {
        preview: false, // Prevent standard autocomplete from clashing with AI ghost text
        showInlineDetails: false,
        insertMode: "replace",
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      cursorSmoothCaretAnimation: "on",
    });

    configureMonaco(monacoInstance);
    updateEditorLanguage();
  };

  const updateEditorLanguage = () => {
    if (!activeFile || !monaco || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const language = getEditorLanguage(activeFile.fileExtension || "");
    try {
      monaco.editor.setModelLanguage(model, language);
    } catch (error) {
      console.warn("Failed to set editor language:", error);
    }
  };

  // Update language dynamically if the active file changes
  useEffect(() => {
    updateEditorLanguage();
  }, [activeFile]);

  return (
    <div className="h-full relative bg-zinc-950">
      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        options={defaultEditorOptions as any}
        theme="vs-dark" // Keeping it strictly dark for the Copilot feel
      />
    </div>
  );
};