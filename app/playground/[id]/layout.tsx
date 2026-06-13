import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import React from "react";

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
        {children}
      </div>
      <Toaster />
    </SidebarProvider>
  );
}