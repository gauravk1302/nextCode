import SignInFormClient from "@/modules/auth/components/sign-in-form-client";
import Image from "next/image";
import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-8">
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Side */}
        <div className="flex flex-1 flex-col items-start justify-center gap-5">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome to
            </h1>

            <h2 className="text-4xl font-bold tracking-tight text-emerald-400">
              NextCode
            </h2>
          </div>

          <p className="max-w-sm text-zinc-400 leading-relaxed text-base">
            Build, deploy, and manage projects with a modern cloud workspace.
          </p>

          <Image
            src="/login.svg"
            alt="Login-Image"
            height={340}
            width={340}
            className="object-contain opacity-95"
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