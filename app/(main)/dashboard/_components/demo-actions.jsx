"use client";

import { useState } from "react";
import { Mail, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { triggerBudgetAlertDemo, triggerMonthlyReportDemo } from "@/actions/demo-email";

export function DemoActions() {
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const handleBudgetDemo = async () => {
    setIsBudgetLoading(true);
    try {
      await triggerBudgetAlertDemo();
      toast.success("Demo Budget Alert sent to your email!");
    } catch (error) {
      toast.error(error.message || "Failed to send demo budget alert");
    } finally {
      setIsBudgetLoading(false);
    }
  };

  const handleReportDemo = async () => {
    setIsReportLoading(true);
    try {
      await triggerMonthlyReportDemo();
      toast.success("Demo Monthly Report sent to your email!");
    } catch (error) {
      toast.error(error.message || "Failed to send demo monthly report");
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 bg-slate-50/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BellRing className="h-4 w-4 text-blue-600" />
          Demo Mode: Email Alerts
        </CardTitle>
        <CardDescription>
          Trigger demo emails to see how the alert features look in your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={handleBudgetDemo}
          disabled={isBudgetLoading}
          className="flex-1 min-w-[200px] bg-white hover:bg-blue-50 hover:text-blue-700 transition-all border-blue-100"
        >
          {isBudgetLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <BellRing className="h-4 w-4 mr-2" />
          )}
          Send Budget Alert Demo
        </Button>

        <Button
          variant="outline"
          onClick={handleReportDemo}
          disabled={isReportLoading}
          className="flex-1 min-w-[200px] bg-white hover:bg-green-50 hover:text-green-700 transition-all border-green-100"
        >
          {isReportLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Send Monthly Report Demo
        </Button>
      </CardContent>
    </Card>
  );
}
