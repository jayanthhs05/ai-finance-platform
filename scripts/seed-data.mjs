import { PrismaClient } from "@prisma/client";
import { subDays, startOfMonth, endOfMonth, format } from "date-fns";

const prisma = new PrismaClient();

const USER_ID = "62cd4665-43a4-4487-afa2-7ad8df17ccaf";
const ACCOUNTS = {
  SBI: "f6816574-4c70-4632-84a6-422837150834",
  CANARA: "cd395107-05d8-408a-bff2-1974ef408d32",
  HDFC: "8f9d42be-d7d9-4b2b-a961-ec659b1c8855",
};

const CATEGORIES = {
  INCOME: [
    { id: "salary", name: "Salary", baseAmount: 75000, variance: 0, account: ACCOUNTS.SBI },
    { id: "freelance", name: "Freelance", baseAmount: 15000, variance: 5000, account: ACCOUNTS.CANARA },
  ],
  EXPENSE: [
    { id: "housing", name: "Rent", baseAmount: 12000, variance: 0, account: ACCOUNTS.SBI, dayOfMonth: 1 },
    { id: "utilities", name: "Electricity Bill", baseAmount: 2500, variance: 500, account: ACCOUNTS.SBI, dayOfMonth: 5 },
    { id: "utilities", name: "Internet Bill", baseAmount: 1000, variance: 0, account: ACCOUNTS.SBI, dayOfMonth: 10 },
    { id: "groceries", name: "Monthly Groceries", baseAmount: 5000, variance: 1000, account: ACCOUNTS.CANARA, frequency: 4 }, // Weekly
    { id: "food", name: "Dining Out", baseAmount: 800, variance: 400, account: ACCOUNTS.HDFC, frequency: 6 },
    { id: "transportation", name: "Fuel/Uber", baseAmount: 600, variance: 200, account: ACCOUNTS.SBI, frequency: 8 },
    { id: "entertainment", name: "Streaming Services", baseAmount: 499, variance: 0, account: ACCOUNTS.HDFC, dayOfMonth: 15 },
    { id: "shopping", name: "Shopping", baseAmount: 2000, variance: 1500, account: ACCOUNTS.HDFC, frequency: 2 },
  ],
};

async function main() {
  console.log("Starting seeding...");

  // 1. Update Budget
  console.log("Updating budget to ₹30,000...");
  await prisma.budget.updateMany({
    where: { userId: USER_ID },
    data: { amount: 30000 },
  });

  // 2. Clear existing transactions for this user to avoid duplicates (optional but better for demo)
  // console.log("Clearing old transactions...");
  // await prisma.transaction.deleteMany({ where: { userId: USER_ID } });

  const transactions = [];
  const now = new Date();

  // Generate for last 3 months
  for (let i = 0; i < 3; i++) {
    const monthDate = subDays(startOfMonth(now), i * 30);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    console.log(`Generating transactions for ${format(monthDate, "MMMM yyyy")}...`);

    // Incomes
    for (const income of CATEGORIES.INCOME) {
      const amount = income.baseAmount + (Math.random() * income.variance * 2 - income.variance);
      transactions.push({
        type: "INCOME",
        amount: parseFloat(amount.toFixed(2)),
        description: `${income.name} - ${format(monthDate, "MMM")}`,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
        category: income.id,
        userId: USER_ID,
        accountId: income.account,
        status: "COMPLETED",
      });
    }

    // Expenses - Fixed Day
    for (const expense of CATEGORIES.EXPENSE) {
      if (expense.dayOfMonth) {
        const amount = expense.baseAmount + (Math.random() * expense.variance * 2 - expense.variance);
        transactions.push({
          type: "EXPENSE",
          amount: parseFloat(amount.toFixed(2)),
          description: expense.name,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), expense.dayOfMonth),
          category: expense.id,
          userId: USER_ID,
          accountId: expense.account,
          status: "COMPLETED",
        });
      } else if (expense.frequency) {
        // Random days
        for (let f = 0; f < expense.frequency; f++) {
          const day = Math.floor(Math.random() * 28) + 1;
          const amount = expense.baseAmount + (Math.random() * expense.variance * 2 - expense.variance);
          transactions.push({
            type: "EXPENSE",
            amount: parseFloat(amount.toFixed(2)),
            description: expense.name,
            date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day),
            category: expense.id,
            userId: USER_ID,
            accountId: expense.account,
            status: "COMPLETED",
          });
        }
      }
    }
  }

  console.log(`Inserting ${transactions.length} transactions...`);
  
  // Batch insert
  await prisma.transaction.createMany({
    data: transactions,
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
