"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { sendEmail } from "./send-email";
import EmailTemplate from "@/emails/template";
import {
  generateFinancialInsights,
  getMonthlyStats,
} from "@/lib/inngest/function";

export async function triggerBudgetAlertDemo() {
  console.log("Triggering Budget Alert Demo...");
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      accounts: {
        where: { isDefault: true },
      },
    },
  });

  if (!user) throw new Error("User not found");

  const defaultAccount = user.accounts[0];
  if (!defaultAccount) {
    throw new Error("Please set a default account first");
  }

  const budget = await db.budget.findUnique({
    where: { userId: user.id },
  });

  if (!budget) {
    throw new Error("Please set a budget first");
  }

  const startDate = new Date();
  startDate.setDate(1);

  const expenses = await db.transaction.aggregate({
    where: {
      userId: user.id,
      accountId: defaultAccount.id,
      type: "EXPENSE",
      date: { gte: startDate },
    },
    _sum: { amount: true },
  });

  const totalExpenses = expenses._sum.amount?.toNumber() || 0;
  const budgetAmount = budget.amount.toNumber();
  const percentageUsed = (totalExpenses / budgetAmount) * 100;

  await sendEmail({
    to: user.email,
    subject: `[DEMO] Budget Alert for ${defaultAccount.name}`,
    react: EmailTemplate({
      userName: user.name,
      type: "budget-alert",
      data: {
        percentageUsed,
        budgetAmount: budgetAmount.toFixed(1),
        totalExpenses: totalExpenses.toFixed(1),
        accountName: defaultAccount.name,
      },
    }),
  });

  return { success: true };
}

export async function triggerMonthlyReportDemo() {
  console.log("Triggering Monthly Report Demo...");
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Get stats for the current month for demo purposes
  const now = new Date();
  const stats = await getMonthlyStats(user.id, now);
  const monthName = now.toLocaleString("default", { month: "long" });

  // Generate AI insights
  const insights = await generateFinancialInsights(stats, monthName);

  await sendEmail({
    to: user.email,
    subject: `[DEMO] Your Monthly Financial Report - ${monthName}`,
    react: EmailTemplate({
      userName: user.name,
      type: "monthly-report",
      data: {
        stats,
        month: monthName,
        insights,
      },
    }),
  });

  return { success: true };
}
