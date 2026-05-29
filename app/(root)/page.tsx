import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Code2,
  Zap,
  GitBranch,
  MessageSquare,
  Layers,
  Terminal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "Smart Editor",
    desc: "AI-powered code completion with ghost text suggestions and Tab-to-accept.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Lightning Fast",
    desc: "Instant execution with zero cold starts. Your code runs in milliseconds.",
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: "Version Control",
    desc: "Built-in Git integration. Commit, push, and collaborate seamlessly.",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "AI Chat",
    desc: "Ask questions, debug errors, and get suggestions from your AI co-pilot.",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Multi Framework",
    desc: "React, Next.js, Vue, Express, Hono, Angular — all supported out of the box.",
  },
  {
    icon: <Terminal className="w-6 h-6" />,
    title: "Integrated Terminal",
    desc: "Full-featured terminal inside the editor. No context switching needed.",
  },
];

const templates = [
  { name: "React", color: "#61DAFB", desc: "Modern UI with hooks and context" },
  { name: "Next.js", color: "#30AF5B", desc: "Full-stack with App Router" },
  { name: "Express", color: "#68A063", desc: "REST API with middleware" },
  { name: "Vue", color: "#42B883", desc: "Progressive framework" },
  { name: "Hono", color: "#E36002", desc: "Ultrafast edge runtime" },
  { name: "Angular", color: "#DD0031", desc: "Enterprise-grade apps" },
];

const steps = [
  {
    step: "01",
    title: "Choose a Template",
    desc: "Pick from 6+ production-ready templates to get started instantly.",
  },
  {
    step: "02",
    title: "Write Your Code",
    desc: "Use the AI-powered editor with smart suggestions and auto-complete.",
  },
  {
    step: "03",
    title: "Run & Preview",
    desc: "Execute your code instantly and preview results in real-time.",
  },
  {
    step: "04",
    title: "Share & Deploy",
    desc: "Share your playground or deploy to production with one click.",
  },
];

const faqs = [
  {
    q: "Is nextCode free to use?",
    a: "Yes! nextCode offers a generous free tier. You can create unlimited playgrounds and run code without any cost.",
  },
  {
    q: "Which languages are supported?",
    a: "We support JavaScript, TypeScript, and all major frameworks including React, Next.js, Vue, Express, and more.",
  },
  {
    q: "Can I collaborate with others?",
    a: "Yes! You can share your playground with a link and collaborate in real-time with your team.",
  },
  {
    q: "Is my code secure?",
    a: "Absolutely. All code runs in isolated sandboxes. Your data is encrypted and never shared with third parties.",
  },
];

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Full Stack Developer",
    msg: "nextCode completely changed how I prototype ideas. The AI suggestions are insanely good.",
  },
  {
    name: "Priya Singh",
    role: "Frontend Engineer",
    msg: "The best online code editor I've used. Fast, clean, and the AI chat is a game changer.",
  },
  {
    name: "Arjun Mehta",
    role: "Backend Developer",
    msg: "Finally an editor that understands my workflow. The template system saves me hours every week.",
  },
];

export default function Home() {
  return (
    <div className="z-20 flex flex-col items-center justify-start min-h-screen">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center py-2 mt-10 w-full">
        <div className="flex flex-col justify-center items-center my-5">
          <Image
            src={"/hero.svg"}
            alt="Hero-Section"
            height={500}
            width={500}
            loading="eager"
          />
          <h1
            className="z-20 text-6xl mt-5 font-extrabold text-center tracking-tight leading-[1.3]"
            style={{ color: "#30AF5B" }}
          >
            Vibe Code With Intelligence
          </h1>
        </div>
        <p className="mt-2 text-lg text-center text-gray-600 dark:text-gray-400 px-5 py-10 max-w-2xl">
          nextCode is a powerful and intelligent code editor that enhances your
          coding experience with advanced features and seamless integration. It
          is designed to help you write, debug, and optimize your code
          efficiently.
        </p>
        <Link href={"/dashboard"}>
          <Button
            variant={"default"}
            className="mb-4 px-8 py-6 text-lg"
            size={"lg"}
            style={{ backgroundColor: "#30AF5B", borderColor: "#30AF5B" }}
          >
            Get Started
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="w-full border-t border-gray-200 dark:border-white/10 my-4" />

      {/* Features Section */}
      <div className="w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to code faster
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 text-lg max-w-xl mx-auto">
            Built for developers who want to move fast without breaking things.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur-sm hover:border-[#30AF5B]/40 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "#30AF5B20", color: "#30AF5B" }}
              >
                {f.icon}
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full border-t border-gray-200 dark:border-white/10 my-4" />

      {/* Templates Showcase */}
      <div className="w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Start with a template
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 text-lg max-w-xl mx-auto">
            Production-ready templates to kickstart your project instantly.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {templates.map((t, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-center hover:border-gray-300 dark:hover:border-white/20 transition-colors cursor-pointer"
            >
              <div
                className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: t.color + "30", color: t.color }}
              >
                {t.name[0]}
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-1">
                {t.name}
              </h3>
              <p className="text-gray-500 dark:text-zinc-500 text-xs leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      {/* <div className="w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Loved by developers</h2>
          <p className="text-gray-600 dark:text-zinc-400 text-lg max-w-xl mx-auto">Join thousands of developers who code smarter with nextCode.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5">
              <p className="text-gray-700 dark:text-zinc-300 text-sm leading-relaxed mb-6">"{t.msg}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#30AF5B" }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}