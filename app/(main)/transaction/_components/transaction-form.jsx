"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn, formatCurrency } from "@/lib/utils";
import {
  createTransaction,
  updateTransaction,
  parseNLTransaction,
  getCategoryRecommendation,
} from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";
import { Sparkles, Trash2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
          },
  });

  const {
    loading: transactionLoading,
    fn: transactionFn,
    data: transactionResult,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  const {
    loading: parseNLLoading,
    fn: parseNLFn,
    data: parsedTransactions,
  } = useFetch(parseNLTransaction);

  const {
    loading: categoryLoading,
    fn: categoryFn,
    data: recommendedCategory,
  } = useFetch(getCategoryRecommendation);

  const [isSmartEntry, setIsSmartEntry] = useState(true);
  const [smartInput, setSmartInput] = useState("");

  const description = watch("description");
  const category = watch("category");

  const onSubmit = (data) => {
    const selectedAccount = accounts.find((a) => a.id === data.accountId);
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
      description: data.description ? data.description.charAt(0).toUpperCase() + data.description.slice(1) : data.description,
      currency: selectedAccount?.currency || "INR",
    };

    const promise = editMode ? transactionFn(editId, formData) : transactionFn(formData);
    
    toast.promise(promise, {
      loading: editMode ? "Updating transaction..." : "Creating transaction...",
      success: editMode ? "Transaction updated successfully" : "Transaction created successfully",
      error: editMode ? "Failed to update transaction" : "Failed to create transaction",
    });

    promise.then((res) => {
      reset();
      router.push(`/account/${res.data.accountId}`);
    }).catch(() => {});
  };

  const handleSmartSubmit = (e) => {
    if (e) e.preventDefault();
    if (!smartInput.trim() || parseNLLoading) return;
    
    toast.promise(parseNLFn(smartInput), {
      loading: "Processing AI entry...",
      success: "AI entry processed successfully",
      error: "Failed to process AI entry",
    });
  };

  // Clear smart input after successful parsing
  useEffect(() => {
    if (parsedTransactions && parsedTransactions.length > 0 && !parseNLLoading) {
      setSmartInput("");
    }
  }, [parsedTransactions, parseNLLoading]);

  const handleScanComplete = (scannedData) => {
    if (scannedData) {
      setValue("type", scannedData.type || "EXPENSE");
      setValue("amount", scannedData.amount.toString());
      setValue("date", new Date(scannedData.date));
      if (scannedData.merchantName) {
        setValue("description", `Scan: ${scannedData.merchantName}`);
      } else if (scannedData.description) {
        setValue("description", scannedData.description);
      }
      if (scannedData.category) {
        setValue("category", scannedData.category);
      }
      setIsSmartEntry(false);
      toast.success("Receipt scanned successfully! Please review and save.");
    }
  };

  // Handle Multi-Transaction Entry
  useEffect(() => {
    if (parsedTransactions && parsedTransactions.length > 0 && !parseNLLoading) {
        const createMulti = async () => {
          const promise = (async () => {
            for (const t of parsedTransactions) {
              const selectedAccount = accounts.find((a) => a.id === getValues("accountId"));
              const capitalizedDescription = t.description ? t.description.charAt(0).toUpperCase() + t.description.slice(1) : t.description;
              await transactionFn({
                ...t,
                description: capitalizedDescription,
                amount: parseFloat(t.amount),
                date: new Date(t.date),
                accountId: getValues("accountId"),
                currency: selectedAccount?.currency || "INR",
              });
            }
          })();

          toast.promise(promise, {
            loading: `Creating ${parsedTransactions.length} transaction${parsedTransactions.length > 1 ? 's' : ''}...`,
            success: `${parsedTransactions.length} transaction${parsedTransactions.length > 1 ? 's' : ''} created!`,
            error: "Failed to create some transactions"
          });

          promise.then(() => {
            router.push(`/account/${getValues("accountId")}`);
          }).catch(() => {});
        };

        createMulti();
    }
  }, [parsedTransactions, parseNLLoading]);

  // Auto-categorization
  useEffect(() => {
    if (description?.length > 3 && !editMode && !category) {
      const timer = setTimeout(() => {
        categoryFn(description);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [description, category]);

  useEffect(() => {
    if (recommendedCategory && !categoryLoading) {
      setValue("category", recommendedCategory);
    }
  }, [recommendedCategory, categoryLoading]);


  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!editMode && (
        <div className="flex bg-muted p-1 rounded-lg w-fit mx-auto shadow-sm border border-border">
          <button
            type="button"
            onClick={() => setIsSmartEntry(true)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              isSmartEntry
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Smart AI Entry
          </button>
          <button
            type="button"
            onClick={() => setIsSmartEntry(false)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              !isSmartEntry
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manual Entry
          </button>
        </div>
      )}

      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Smart AI Entry */}
            {!editMode && isSmartEntry && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Smart AI Entry</label>
                  <div className="flex flex-col gap-2">
                    <div className="relative flex-1">
                      <Textarea
                        placeholder='e.g., "I spent 500 yesterday on groceries and 200 on fuel"'
                        className="h-32 text-lg border-2 focus-visible:ring-primary/20 bg-background/50 resize-none p-4"
                        value={smartInput}
                        onChange={(e) => setSmartInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            handleSmartSubmit(e);
                          }
                        }}
                        disabled={parseNLLoading}
                      />
                      <div className="absolute right-3 bottom-3">
                        {parseNLLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSmartSubmit}
                      disabled={!smartInput.trim() || parseNLLoading}
                      className="w-full h-12 gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                      {parseNLLoading ? "Processing..." : "Process with AI"}
                      {!parseNLLoading && <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type a sentence and press Enter to automatically add multiple transactions.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-dashed" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or Scan Receipt</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex bg-muted p-1 rounded-lg shadow-sm border border-border w-full">
                    <button
                      type="button"
                      onClick={() => setValue("type", "EXPENSE")}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        type === "EXPENSE"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Expense Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("type", "INCOME")}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        type === "INCOME"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Income Receipt
                    </button>
                  </div>
                </div>

                <ReceiptScanner onScanComplete={handleScanComplete} />
              </div>
            )}

            {/* Form Fields - Show if manual or after AI pre-fill */}
            {(!isSmartEntry || editMode) && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    onValueChange={(value) => setValue("type", value)}
                    defaultValue={type}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="INCOME">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-500">{errors.type.message}</p>
                  )}
                </div>

                {/* Amount and Account */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="bg-background"
                      {...register("amount")}
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account</label>
                    <Select
                      onValueChange={(value) => setValue("accountId", value)}
                      defaultValue={getValues("accountId")}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({formatCurrency(parseFloat(account.balance), account.currency || "INR")})
                          </SelectItem>
                        ))}
                        <CreateAccountDrawer>
                          <Button
                            variant="ghost"
                            className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          >
                            Create Account
                          </Button>
                        </CreateAccountDrawer>
                      </SelectContent>
                    </Select>
                    {errors.accountId && (
                      <p className="text-sm text-red-500">{errors.accountId.message}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    onValueChange={(value) => setValue("category", value)}
                    value={watch("category")}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category.message}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal bg-background",
                          !date && "text-muted-foreground"
                        )}
                      >
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(date) => setValue("date", date)}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    placeholder="Enter description" 
                    className="bg-background"
                    {...register("description")} 
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Recurring Toggle */}
                <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium">Recurring Transaction</label>
                    <div className="text-sm text-muted-foreground">
                      Set up a recurring schedule for this transaction
                    </div>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={(checked) => setValue("isRecurring", checked)}
                  />
                </div>

                {/* Recurring Interval */}
                {isRecurring && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-medium">Recurring Interval</label>
                    <Select
                      onValueChange={(value) => setValue("recurringInterval", value)}
                      defaultValue={getValues("recurringInterval")}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.recurringInterval && (
                      <p className="text-sm text-red-500">
                        {errors.recurringInterval.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full h-11" disabled={transactionLoading}>
                    {transactionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editMode ? "Updating..." : "Creating..."}
                      </>
                    ) : editMode ? (
                      "Update Transaction"
                    ) : (
                      "Create Transaction"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
