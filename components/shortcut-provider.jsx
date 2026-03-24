"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export function ShortcutProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isInput =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable;

      if (isInput) return;

      // Cmd+K or Ctrl+K for chat (Wait, our chat-bot handles this perhaps? Let's check or just dispatch a custom event)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Dispatch custom event for ChatBot to listen to
        window.dispatchEvent(new CustomEvent("open-chat-bot"));
      }

      // 't' or 'T' for Add Transaction (assuming the drawer is opened via URL param or similar, or dispatch event)
      if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        router.push("/transaction/create");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  return <>{children}</>;
}
