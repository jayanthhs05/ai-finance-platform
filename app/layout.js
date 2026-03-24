import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ChatBot } from "@/components/chat-bot";
import { ThemeProvider } from "@/components/theme-provider";
import { ShortcutProvider } from "@/components/shortcut-provider";
import { OnboardingDialog } from "@/components/onboarding-dialog";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Budgetly",
  description: "One stop Finance Platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/logo-sm.png" sizes="any" />
        </head>
        <body className={`${inter.className}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ShortcutProvider>
              <Header />
              <main className="min-h-screen">{children}</main>
              <Toaster richColors />
              <OnboardingDialog />
              <ChatBot />
            </ShortcutProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
