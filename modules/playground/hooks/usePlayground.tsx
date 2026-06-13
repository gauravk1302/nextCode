//here we are managing the template files and template folder side bar of the playground  

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import type { TemplateFolder } from "../lib/path-to-json";
import { getPlaygroundById, saveUpdatedCode } from "../actions";

interface PlaygroundData {
  id: string;
  title?: string;
  [key: string]: any;
}

interface UsePlaygroundReturn {
  playgroundData: PlaygroundData | null;
  templateData: TemplateFolder | null;
  isLoading: boolean;
  error: string | null;
  loadPlayground: () => Promise<void>;
  //Here we are basically going to pass the id and this ID should going to call our backend and get the data for us
  saveTemplateData: (data: TemplateFolder) => Promise<void>;
}
// Here we are basically going to pass the id and this ID should going to call our backend and get the data 

export const usePlayground = (id: string): UsePlaygroundReturn => {
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(
    null,
  );
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 const loadPlayground = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await getPlaygroundById(id);
      setPlaygroundData(data);
      const rawContent = data?.content;

      if (rawContent) {
        const parsedContent =
          typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
        setTemplateData(parsedContent);
        toast.success("Playground Loaded Successfully");
        return;
      }

      // load the template from the api if not in saved content on the database
      const res = await fetch(`/api/template/${id}`);
      if (!res.ok) throw new Error(`Failed to load template: ${res.status}`);

      const templateRes = await res.json();
      setTemplateData(
        Array.isArray(templateRes.templateJson)
          ? { folderName: "Root", items: templateRes.templateJson }
          : templateRes.templateJson || { folderName: "Root", items: [] },
      );
      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Error loading playground:", error);
      setError("Failed to load playground data");
      toast.error("Failed to load playground data");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const saveTemplateData = useCallback(
    async (data: TemplateFolder) => {
      try {
        await saveUpdatedCode(id, data);
        setTemplateData(data);
        toast.success("Changes saved successfully");
      } catch (error) {
        console.error("Error saving template data:", error);
        toast.error("Failed to save changes");
        throw error;
      }
    },
    [id],
  );

  useEffect(() => {
    loadPlayground();
  }, [loadPlayground]);

  return {
    playgroundData,
    templateData,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,
  };
};
