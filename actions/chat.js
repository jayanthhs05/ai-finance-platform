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

    // Fetch all user accounts with names, types, and balances
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        isDefault: true,
      },
    });

    // Fetch user's budget and calculate current month's expenses
    const budget = await db.budget.findFirst({
      where: { userId: user.id },
    });

    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const monthlyExpenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    // Fetch recent transactions with full details including account name
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
        isRecurring: true,
        recurringInterval: true,
        nextRecurringDate: true,
        status: true,
        account: {
          select: { name: true },
        },
      },
    });

    // --- Build structured context for the AI ---

    // Accounts overview
    const accountsStr = accounts.length
      ? accounts
          .map(
            (a) =>
              `- ${a.name} (${a.type}): Balance ₹${a.balance}${a.isDefault ? " [DEFAULT]" : ""}`
          )
          .join("\n")
      : "No accounts found.";

    // Budget overview
    const currentSpending = monthlyExpenses._sum.amount
      ? Number(monthlyExpenses._sum.amount)
      : 0;
    const budgetStr = budget
      ? `Monthly Budget: ₹${budget.amount} | Spent this month: ₹${currentSpending} | Remaining: ₹${Number(budget.amount) - currentSpending}`
      : "No budget has been set.";

    // Transactions with full context
    const transactionsStr = transactions.length
      ? transactions
          .map((t) => {
            let line = `[${t.date.toISOString().split("T")[0]}] ${t.type}: ₹${t.amount} - ${t.category} (${t.description || "No description"}) | Account: ${t.account.name}`;
            if (t.isRecurring) {
              line += ` | Recurring: ${t.recurringInterval}`;
              if (t.nextRecurringDate) {
                line += `, next: ${t.nextRecurringDate.toISOString().split("T")[0]}`;
              }
            }
            if (t.status !== "COMPLETED") {
              line += ` | Status: ${t.status}`;
            }
            return line;
          })
          .join("\n")
      : "No recent transactions found.";

    const systemPrompt = `
You are a helpful, professional, and friendly AI financial assistant for the "Budgetly" finance platform.
You have full access to the user's financial data including their accounts, budget, and recent transactions.

=== USER'S ACCOUNTS ===
${accountsStr}

=== BUDGET STATUS ===
${budgetStr}

=== RECENT TRANSACTIONS (up to 100 latest) ===
${transactionsStr}

=== USER QUERY ===
"${prompt}"

=== INSTRUCTIONS ===
- Answer the user's query based on ALL the provided financial data and general financial knowledge.
- **IMPORTANT**: All currency amounts are in **Indian Rupees (INR/₹)**. Always use the ₹ symbol in your responses.
- Use the **Indian Numbering System** (e.g., 1,00,000 for 1 Lakh, 1,00,00,000 for 1 Crore) when discussing large amounts.
- You can answer questions about specific accounts by name, budget status, recurring expenses, and transaction history.
- If the user refers to an account by name, match it to the accounts listed above.
- Keep your responses concise, clear, and actionable. Format your response in plain text or simple markdown.
- If the user asks about data you truly don't have, let them know what information IS available to you.

Previous conversation context:
${messageHistory.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;

    return { success: true, text: response.text() };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return {
      success: false,
      error: "Failed to generate response. Please try again.",
    };
  }
}

