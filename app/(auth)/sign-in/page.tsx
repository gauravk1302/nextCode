import SignInFormClient from "@/modules/auth/components/sign-in-form-client";
import Image from "next/image";
import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-8 relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8">

        {/* Left Side */}
        <div className="flex flex-1 flex-col items-start justify-center gap-5">
          <div className="space-y-1">
            <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Cloud IDE</p>
            <h1 className="text-5xl font-bold tracking-tight text-white">
              Welcome to
            </h1>
            <h2 className="text-5xl font-bold tracking-tight text-emerald-400">
              NextCode
            </h2>
          </div>

          <p className="max-w-sm text-zinc-400 leading-relaxed text-base">
            Build, deploy, and manage projects with a modern cloud workspace.
          </p>

          <div className="flex gap-2 flex-wrap">
            {["React", "Next.js", "Express", "Vue", "Hono"].map((t) => (
              <span key={t} className="px-3 py-1 text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-full">
                {t}
              </span>
            ))}
          </div>

          <Image
            src="/login.svg"
            alt="Login-Image"
            height={320}
            width={320}
            className="object-contain opacity-90"
            loading="eager"
          />
        </div>

        {/* Right Side */}
        <div className="flex flex-1 justify-center w-full md:-translate-y-6">
          <SignInFormClient />
        </div>

      </div>
    </div>
  );
};

export default Page;