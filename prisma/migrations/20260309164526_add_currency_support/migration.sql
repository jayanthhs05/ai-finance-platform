-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';
