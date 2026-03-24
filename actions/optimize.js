"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function optimizeBudget() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        accounts: { where: { isDefault: true } }
      }
    });

    if (!user) throw new Error("User not found");

    const defaultAccount = user.accounts[0];
    if (!defaultAccount) throw new Error("No default account found");

    // Fetch last 3 months expenses for default account
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const expenses = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: defaultAccount.id,
        type: "EXPENSE",
        date: { gte: threeMonthsAgo }
      },
      select: { amount: true, date: true, category: true }
    });

    if (expenses.length === 0) {
      return { 
        amount: 25000, 
        reason: "We don't have enough past expenses to analyze. We suggest starting with a baseline budget of 25,000 INR." 
      };
    }

    const totalExpense = expenses.reduce((acc, t) => acc + t.amount.toNumber(), 0);
    // Find how many unique months there are to get a more accurate average
    const months = new Set(expenses.map(t => new Date(t.date).getMonth()));
    const numMonths = Math.max(1, months.size);
    const monthlyAverage = totalExpense / numMonths;

    // Use Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      The user's average monthly expense over the last ${numMonths} months is ${monthlyAverage.toFixed(2)} INR.
      Recommend a slightly optimized, realistic budget amount going forward (e.g. reduce by 5-10% to encourage saving, but keep it round).
      Return the response clearly as ONLY perfectly valid JSON without backticks or markdown, in this exact format:
      {
        "amount": number,
        "reason": "string (A 1-2 sentence encouraging explanation why this amount was chosen)"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```(?:json)?\n?/g, "").trim();
    
    try {
      const data = JSON.parse(text);
      return {
        amount: data.amount,
        reason: data.reason
      };
    } catch(err) {
      return {
        amount: Math.round(monthlyAverage * 0.95),
        reason: "Based on your spending, we suggest a 5% optimization to align with saving goals."
      };
    }

  } catch (error) {
    console.error("Optimization error:", error);
    throw new Error(error.message || "Failed to optimize budget");
  }
}
