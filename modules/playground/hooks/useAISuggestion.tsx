import { useState, useEffect, useRef, useCallback } from "react";

// Hum purana interface maintain kar rahe hain taaki tere editor page par errors na aayein
interface UseAISuggestionsReturn {
  isEnabled: boolean;
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
}

export const useAISuggestions = (monaco: any, editor: any, isAIEnabled: boolean): UseAISuggestionsReturn => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const providerRef = useRef<any>(null);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    // Agar monaco, editor ready nahi hain ya AI toggle off hai, toh provider hata do
    if (!monaco || !editor || !isEnabled) {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      return;
    }

    // Monaco ka native Ghost Text Provider (Tab-to-accept)
    providerRef.current = monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        // 1. Debounce (Rate limiting prevent karne ke liye)
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (token.isCancellationRequested) return { items: [] };

        // 2. Sliding Window Context (Puri file ki jagah sirf aas-paas ka code)
        const startLine = Math.max(1, position.lineNumber - 50);
        const endLine = Math.min(model.getLineCount(), position.lineNumber + 20);

        const prefix = model.getValueInRange({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suffix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: endLine,
          endColumn: model.getLineMaxColumn(endLine),
        });

        try {
          // 3. Optimized API hit
          const response = await fetch("/api/code-completion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prefix, 
              suffix, 
              language: model.getLanguageId() 
            }),
          });

          if (!response.ok) throw new Error("API failed");

          const data = await response.json();

          // 4. Ghost text return karna
          if (data.suggestion && !token.isCancellationRequested) {
            return {
              items: [
                {
                  insertText: data.suggestion,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                },
              ],
            };
          }
        } catch (error) {
          console.error("AI Auto-completion error:", error);
        }

        return { items: [] };
      },
      // ✅ FIX: Added both required cleanup methods to prevent Monaco crash
      freeInlineCompletions: () => {}, 
      disposeInlineCompletions: () => {}, 
    });

    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
      }
    };
  }, [monaco, editor, isEnabled]);

  // Purane manual functions ab empty rahenge kyunki Monaco native API sab sambhal rahi hai
  const noOp = useCallback(() => {}, []);
  const fetchSuggestion = useCallback(async () => {}, []);

  return {
    isEnabled,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion: noOp,
    rejectSuggestion: noOp,
    clearSuggestion: noOp,
  };
};