import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import { transformToWebContainerFormat } from "./transformer";

let globalInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let isMounted = false;

async function getOrBootInstance(): Promise<WebContainer> {
  if (globalInstance) return globalInstance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot().then((inst) => {
    globalInstance = inst;
    bootPromise = null;
    return inst;
  });

  return bootPromise;
}

interface UseWebContainerProps {
  templateData: TemplateFolder | null;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  loadingStep: string;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

export const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>("Waiting for template...");
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  useEffect(() => {
    if (!templateData || isMounted) return;
    isMounted = true;

    let mounted = true;

    async function initializeWebContainer() {
      try {
        // 1. Boot
        setLoadingStep("Booting WebContainer");
        const wc = await getOrBootInstance();
        if (!mounted) return;
        setInstance(wc);

        // 2. Transform
        setLoadingStep("Transforming template data");
        const rootTemplate = {
          folderName: "root",
          items: (templateData as any).items
        };
        const files = transformToWebContainerFormat(rootTemplate);

        // 3. Mount
        setLoadingStep("Mounting files");
        await wc.mount(files);
        if (!mounted) return;

        // ← FIX — Windows line endings sanitize karo
        try {
          const pkgRaw = await wc.fs.readFile("package.json", "utf-8");
          const pkgClean = pkgRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          await wc.fs.writeFile("package.json", pkgClean);
        } catch (e) {
          console.warn("Could not sanitize package.json:", e);
        }

        // 4. Install
        setLoadingStep("Installing dependencies");
        const installProcess = await wc.spawn("npm", ["install"]);
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            const clean = data.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trim();
            if (clean) console.log("[npm install]", clean);
          }
        }));
        const exitCode = await installProcess.exit;
        if (exitCode !== 0) throw new Error(`npm install failed: exit code ${exitCode}`);
        if (!mounted) return;

        // 5. Start server
        setLoadingStep("Starting development server");
        const packageJsonRaw = await wc.fs.readFile("package.json", "utf-8");
        const packageJson = JSON.parse(packageJsonRaw);
        const scripts = packageJson.scripts || {};

        const startCommand = scripts.dev ? "dev"
          : scripts.serve ? "serve"
          : scripts.start ? "start"
          : scripts.develop ? "develop"
          : null;

        if (!startCommand) throw new Error("No dev/start script found in package.json");

        const devProcess = await wc.spawn("npm", ["run", startCommand]);
        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            const clean = data.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trim();
            if (clean) console.log(`[npm run ${startCommand}]`, clean);
          }
        }));

        // 6. server-ready
        wc.on("server-ready", (port, url) => {
          console.log(`✅ Server ready: ${url}`);
          if (mounted) {
            setServerUrl(url);
            setLoadingStep("Ready");
            setIsLoading(false);
          }
        });

        wc.on("error", ({ message }) => {
          if (mounted) setError(message);
        });

      } catch (err) {
        console.error("WebContainer init failed:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Init failed");
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();
    return () => { mounted = false; };
  }, [templateData]);

  const writeFileSync = useCallback(async (path: string, content: string) => {
    if (!instance) throw new Error("WebContainer not available");
    const folderPath = path.split("/").slice(0, -1).join("/");
    if (folderPath) await instance.fs.mkdir(folderPath, { recursive: true });
    await instance.fs.writeFile(path, content);
  }, [instance]);

  const destroy = useCallback(() => {
    if (globalInstance) {
      globalInstance.teardown();
      globalInstance = null;
      bootPromise = null;
      isMounted = false;
    }
    setInstance(null);
    setServerUrl(null);
  }, []);

  return { serverUrl, isLoading, loadingStep, error, instance, writeFileSync, destroy };
};