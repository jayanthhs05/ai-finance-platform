"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";

export function OnboardingDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setIsOpen(false);
  };

  const steps = [
    {
      title: "Welcome to Budgetly! 🎉",
      description: "Let's take a quick tour to get you started on your financial journey.",
    },
    {
      title: "Track & Categorize 📊",
      description: "Easily add transactions or let our AI scan your receipts to auto-categorize expenses.",
    },
    {
      title: "Smart AI Assistant 🤖",
      description: "Need help? Press Cmd+K or click the chat bubble to ask our AI about your spending.",
    },
    {
      title: "Power User Shortcuts ⚡",
      description: "Press 'T' anywhere to instantly pull up the new transaction form. You're ready to go!",
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        <CardHeader>
          <CardTitle>{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center flex-wrap gap-2 my-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                  i === step ? "w-8 bg-blue-600" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleClose}>
            Skip
          </Button>
          <Button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(s => s + 1);
              } else {
                handleClose();
              }
            }}
          >
            {step < steps.length - 1 ? "Next" : "Get Started"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
