import { type NextRequest, NextResponse } from "next/server";

interface CodeSuggestionRequest {
  prefix: string;
  suffix: string;
  language?: string;
  fileName?: string;
}

interface CodeContext {
  language: string;
  framework: string;
  currentLine: string;
  isInFunction: boolean;
  isInClass: boolean;
  isAfterComment: boolean;
  incompletePatterns: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();
    const { prefix, suffix, language, fileName } = body;

    if (!prefix && !suffix) {
      return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 });
    }

    const context = analyzeCodeContext(prefix, suffix, language, fileName);
    const prompt = buildPrompt(prefix, suffix, context);
    const suggestion = await generateSuggestion(prompt);

    return NextResponse.json({
      suggestion,
      context,
      metadata: {
        language: context.language,
        framework: context.framework,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Context analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

function analyzeCodeContext(
  prefix: string,
  suffix: string,
  passedLanguage?: string,
  fileName?: string
): CodeContext {
  const prefixLines = prefix.split("\n");
  const suffixLines = suffix.split("\n");
  
  // The current line is the last line of prefix + first line of suffix
  const currentLineBeforeCursor = prefixLines[prefixLines.length - 1] || "";
  const currentLineAfterCursor = suffixLines[0] || "";
  const currentLine = currentLineBeforeCursor + currentLineAfterCursor;

  const language = passedLanguage || detectLanguage(prefix + suffix, fileName);
  const framework = detectFramework(prefix + suffix);

  const isInFunction = detectInFunction(prefixLines);
  const isInClass = detectInClass(prefixLines);
  const isAfterComment = detectAfterComment(currentLineBeforeCursor);
  const incompletePatterns = detectIncompletePatterns(currentLineBeforeCursor);

  return {
    language,
    framework,
    currentLine,
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  };
}

function buildPrompt(prefix: string, suffix: string, context: CodeContext): string {
  // Keep prompt extremely concise to save tokens and speed up generation
  return `You are an expert code completion assistant. Generate the missing code at the cursor.

Language: ${context.language}
Framework: ${context.framework}

Context:
${prefix}|CURSOR|${suffix}

Analysis:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Incomplete Patterns: ${context.incompletePatterns.join(", ") || "None"}

Instructions:
1. Provide ONLY the raw code that should replace the |CURSOR|.
2. DO NOT wrap the response in markdown blocks (\`\`\`).
3. NO explanations, NO greetings. Just the exact string to insert.
4. Maintain proper indentation based on the prefix.`;
}

async function generateSuggestion(prompt: string): Promise<string> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are an expert code completion engine. Return only the raw code to insert. No markdown, no chat.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 150, // Keep it short for instant autocomplete feel
        temperature: 0.2, // Low temp for predictable code
      }),
    });

    if (!response.ok) {
        throw new Error(`Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    let suggestion = data.choices?.[0]?.message?.content || "";

    // Fallback markdown cleanup just in case LLM disobeys instructions
    if (suggestion.includes("```")) {
      const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/);
      suggestion = codeMatch ? codeMatch[1].trim() : suggestion.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    }

    return suggestion;
  } catch (error) {
    console.error("AI generation error:", error);
    return ""; // Return empty string so frontend doesn't show "// AI suggestion unavailable" as ghost text
  }
}

// === Helper Functions ===

function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
      py: "Python", java: "Java", go: "Go", rs: "Rust", php: "PHP", vue: "Vue",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }
  if (content.includes("interface ") || content.includes(": string")) return "TypeScript";
  return "JavaScript";
}

function detectFramework(content: string): string {
  if (content.includes("import React") || content.includes("useState")) return "React";
  if (content.includes("import Vue") || content.includes("<template>")) return "Vue";
  if (content.includes("@angular/") || content.includes("@Component")) return "Angular";
  if (content.includes("next/") || content.includes("getServerSideProps")) return "Next.js";
  return "None";
}

function detectInFunction(prefixLines: string[]): boolean {
  for (let i = prefixLines.length - 1; i >= Math.max(0, prefixLines.length - 20); i--) {
    const line = prefixLines[i];
    if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/)) return true;
    if (line?.match(/^\s*}/)) break;
  }
  return false;
}

function detectInClass(prefixLines: string[]): boolean {
  for (let i = prefixLines.length - 1; i >= Math.max(0, prefixLines.length - 20); i--) {
    const line = prefixLines[i];
    if (line?.match(/^\s*(class|interface)\s+/)) return true;
  }
  return false;
}

function detectAfterComment(lineBeforeCursor: string): boolean {
  return /\/\/.*$/.test(lineBeforeCursor) || /#.*$/.test(lineBeforeCursor);
}

function detectIncompletePatterns(lineBeforeCursor: string): string[] {
  const patterns: string[] = [];
  if (/^\s*(if|while|for)\s*\($/.test(lineBeforeCursor.trim())) patterns.push("conditional");
  if (/^\s*(function|def)\s*$/.test(lineBeforeCursor.trim())) patterns.push("function");
  if (/\{\s*$/.test(lineBeforeCursor)) patterns.push("object");
  if (/\[\s*$/.test(lineBeforeCursor)) patterns.push("array");
  if (/=\s*$/.test(lineBeforeCursor)) patterns.push("assignment");
  if (/\.\s*$/.test(lineBeforeCursor)) patterns.push("method-call");
  return patterns;
}