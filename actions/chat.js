"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function askAssistant(prompt, messageHistory = []) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Fetch user's recent transactions to provide context
    // We limit to 100 to avoid exceeding token limits, and only fetch necessary fields
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 100,
      select: {
        amount: true,
        date: true,
        description: true,
        category: true,
        type: true,
      },
    });

    // Format transactions for the prompt
    const contextStr = transactions
      .map(
        (t) =>
          `[${t.date.toISOString().split("T")[0]}] ${t.type}: $${t.amount} - ${
            t.category
          } (${t.description || "No description"})`
      )
      .join("\n");

    const systemPrompt = `
      You are a helpful, professional, and friendly AI financial assistant for the "Welth" finance platform.
      You have access to the user's recent financial transactions.
      
      Here is the user's recent transaction history (up to 100 latest transactions):
      ${contextStr || "No recent transactions found."}

      User Query: "${prompt}"

      Answer the user's query based ONLY on the provided transaction history and general financial knowledge.
      If the user asks about something not in the transaction history, kindly inform them you don't have that specific data, but you can see their recent transactions.
      Keep your responses concise, clear, and actionable. Format your response in plain text or simple markdown.
      
      Previous conversation context:
      ${messageHistory.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    
    return { success: true, text: response.text() };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return { success: false, error: "Failed to generate response. Please try again." };
  }
}
