"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getAccountSummary } from "@/actions/summary";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const EXPENSE_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9FA8DA",
];

const INCOME_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

export function DashboardOverview({ accounts, transactions }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );
  const [dateRange, setDateRange] = useState("this-month");

  // Helper to get date range
  const getDateRange = (range) => {
    const now = new Date();
    if (range === "this-month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    if (range === "last-3-months") {
      return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
    }
    if (range === "last-6-months") {
      return { start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) };
    }
    if (range === "this-year") {
      return { start: startOfYear(now), end: endOfMonth(now) };
    }
    return { start: new Date(0), end: now }; // All time
  };

  const { start: startDate, end: endDate } = getDateRange(dateRange);

  // Filter transactions for selected account and date range
  const accountTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return (
      t.accountId === selectedAccountId &&
      transactionDate >= startDate &&
      transactionDate <= endDate
    );
  });
  
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const currency = selectedAccount?.currency || "INR";

  // Get recent transactions (last 5)
  const recentTransactions = accountTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Group expenses by category
  const expensesByCategory = accountTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, transaction) => {
      const category = transaction.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += transaction.amount;
      return acc;
    }, {});

  // Group income by category
  const incomeByCategory = accountTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, transaction) => {
      const category = transaction.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += transaction.amount;
      return acc;
    }, {});

  // Format data for pie charts
  const expensePieData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  const incomePieData = Object.entries(incomeByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Recent Transactions Card */}
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <CardTitle className="text-base font-semibold">
            Account Overview
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SummaryDrawer
              accountId={selectedAccountId}
              startDate={startDate}
              endDate={endDate}
              accountName={selectedAccount?.name}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent transactions
              </p>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description || "Untitled Transaction"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), "PP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center",
                        transaction.type === "EXPENSE"
                          ? "text-red-500"
                          : "text-green-500"
                      )}
                    >
                      {transaction.type === "EXPENSE" ? (
                        <ArrowDownRight className="mr-1 h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="mr-1 h-4 w-4" />
                      )}
                      {formatCurrency(transaction.amount, transaction.currency || currency)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-5">
          {expensePieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No expenses this month
            </p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value, currency)}`}
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value, currency)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Income Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-5">
          {incomePieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No income this month
            </p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value, currency)}`}
                  >
                    {incomePieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={INCOME_COLORS[index % INCOME_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value, currency)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryDrawer({ accountId, startDate, endDate, accountName }) {
  const {
    loading,
    fn: generateSummary,
    data: summary,
    error,
  } = useFetch(getAccountSummary);

  const handleGenerate = () => {
    toast.promise(generateSummary(accountId, startDate, endDate), {
      loading: "Generating AI summary...",
      success: "Summary generated successfully",
      error: "Failed to generate summary",
    });
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
          AI summary
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl text-left">
          <DrawerHeader>
            <DrawerTitle>AI Financial Summary</DrawerTitle>
            <DrawerDescription>
              Insights for {accountName || "all accounts"} from{" "}
              {format(new Date(startDate), "PP")} to{" "}
              {format(new Date(endDate), "PP")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-10 overflow-y-auto max-h-[70vh]">
            {!summary && !loading && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Sparkles className="h-12 w-12 text-blue-500 animate-pulse" />
                <p className="text-muted-foreground text-center">
                  Ready to analyze your data for this period?
                </p>
                <Button onClick={handleGenerate}>Generate Summary</Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <BarLoader width={"100%"} color="#3b82f6" />
                <p className="text-muted-foreground italic">
                  Analyzing transactions and spotting patterns...
                </p>
              </div>
            )}

            {error && (
              <div className="text-destructive p-4 text-center">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}

            {summary && (
              <div className="prose prose-sm dark:prose-invert max-w-none pb-6">
                <ReactMarkdown>{summary.summary}</ReactMarkdown>
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

