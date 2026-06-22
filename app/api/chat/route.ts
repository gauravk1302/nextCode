import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], files = {} } = body;

    // Limit to top 2 files to save huge context usage.
    const fileEntries = Object.entries(files).slice(0, 2);
    const fileContext = fileEntries
      .map(([path, content]) => {
        // Safe soft-limit of 4000 characters per file to avoid 6000 TPM limit
        const safeContent = (content as string).length > 4000 
          ? (content as string).substring(0, 4000) + "\n\n// ... (rest of the file truncated due to AI token limits)"
          : content;
        return `File: ${path}\n\`\`\`\n${safeContent}\n\`\`\``;
      })
      .join("\n\n");

    const systemPrompt = `You are an expert AI coding assistant.
You have access to the following project files:

${fileContext ? `## Project Files:\n\n${fileContext}` : "No files provided."}

CRITICAL RULES:
1. You MUST return your response in valid JSON format exactly like this:
{
  "response": "Your conversational reply here.",
  "fileChanges": {
    "path/to/file.ext": "THE ENTIRE, COMPLETE UPDATED CODE FOR THIS FILE"
  }
}
2. NEVER return partial code. You MUST return the FULL updated file content in 'fileChanges' based on the file content provided.
3. If no files need changing, return an empty object {} for 'fileChanges'.
4. Output RAW VALID JSON ONLY. Do not use markdown \`\`\` formatting.`;

    // Limit history to last 4 messages to save tokens
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map((msg: any) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        // CRITICAL FIX: Reduced max_tokens to 2500 so Prompt + Max Tokens stays under 6000 TPM
        max_tokens: 2500,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let responseText = data.choices?.[0]?.message?.content || "{}";

    // Robust JSON Cleanup (Just in case LLM adds markdown)
    responseText = responseText.trim();
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON Parse Error. Raw text from AI:", responseText);
      throw new Error("AI returned invalid JSON structure.");
    }

    return NextResponse.json({
      response: parsedData.response || "Done.",
      fileChanges: parsedData.fileChanges || {},
      model: "llama-3.1-8b-instant",
    });

  } catch (error: any) {
    console.error("[CHAT_API_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate response", message: error.message }, 
      { status: 500 }
    );
  }
}