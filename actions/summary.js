"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getAccountSummary(accountId, startDate, endDate) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Fetch transactions for the specific account and date range
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: "desc" },
    });

    if (transactions.length === 0) {
      return {
        success: true,
        summary: "No transactions found for the selected period.",
      };
    }

    // Calculate stats for the prompt
    const stats = transactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount);
        if (t.type === "EXPENSE") {
          acc.totalExpenses += amount;
          acc.byCategory[t.category] = (acc.byCategory[t.category] || 0) + amount;
        } else {
          acc.totalIncome += amount;
        }
        return acc;
      },
      { totalExpenses: 0, totalIncome: 0, byCategory: {} }
    );

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a professional financial advisor. Analyze the following financial data for the period ${startDate} to ${endDate} and provide a concise, actionable summary in markdown format.

      Data Summary:
      - Total Income: ₹${stats.totalIncome.toFixed(2)}
      - Total Expenses: ₹${stats.totalExpenses.toFixed(2)}
      - Net Cash Flow: ₹${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
      - Top Expense Categories: ${Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, amt]) => `${cat} (₹${amt.toFixed(2)})`)
        .join(", ")}

      Your summary should include:
      1. A high-level overview of the financial health for this period.
      2. 2-3 specific observations about spending or income patterns.
      3. 1 actionable tip to improve financial health.

      Keep the tone professional yet encouraging. Use ₹ for currency.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return { success: true, summary };
  } catch (error) {
    console.error("Error generating account summary:", error);
    return {
      success: false,
      error: "Failed to generate summary. Please try again.",
    };
  }
}
