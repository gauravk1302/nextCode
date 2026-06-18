import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  sessionId?: string;
}

async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  const systemPrompt = `You are a helpful AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice  
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. Use proper code formatting when showing examples.`;

  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const prompt = fullMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "codellama:latest",
      prompt,
      stream: false,
      options: { temperature: 0.7, max_tokens: 1000, top_p: 0.9 },
    }),
  });

  const data = await response.json();
  if (!data.response) throw new Error("No response from AI model");
  return data.response.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [], sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg) =>
            msg &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            ["user", "assistant"].includes(msg.role)
        )
      : [];

    const messages: ChatMessage[] = [
      ...validHistory.slice(-10),
      { role: "user", content: message },
    ];

    const aiResponse = await generateAIResponse(messages);

    // Optional: Save to Neon DB (chat history store karna ho toh)
    if (sessionId) {
      try {
        const sql = neon(process.env.DATABASE_URL!);
        await sql`
          INSERT INTO chat_messages (session_id, role, content, created_at)
          VALUES (${sessionId}, 'user', ${message}, NOW()),
                 (${sessionId}, 'assistant', ${aiResponse}, NOW())
        `;
      } catch (dbErr) {
        // DB error pe chat fail mat karo — silently log karo
        console.error("[CHAT_DB_SAVE]", dbErr);
      }
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[CHAT_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}