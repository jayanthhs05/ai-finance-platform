"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";
import { askAssistant } from "@/actions/chat";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI financial assistant. Ask me anything about your transactions!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Pass previous context (excluding the very first greeting if helpful, but we'll pass all for simplicity)
      const res = await askAssistant(userMessage, newMessages.slice(1));
      
      if (res.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.text }]);
      } else {
        toast.error(res.error);
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error answering your question." }]);
      }
    } catch (error) {
      toast.error("Failed to communicate with assistant.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full h-14 w-14 shadow-xl bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar ChatBot */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-background z-50 shadow-2xl transition-transform duration-300 ease-in-out transform border-l",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Budgetly AI Assistant</h3>
                <p className="text-[10px] text-blue-100 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
                  Online
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-blue-700 rounded-full h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                      msg.role === "user" 
                        ? "bg-blue-600 text-white" 
                        : "bg-muted text-blue-600 border border-blue-100"
                    )}
                  >
                    {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-2xl text-sm max-w-[85%]",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                        : "bg-muted rounded-tl-none text-foreground border border-blue-50"
                    )}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted border border-blue-100 text-blue-600 flex items-center justify-center">
                    <Bot size={14} />
                  </div>
                  <div className="p-3 bg-muted border border-blue-50 rounded-2xl rounded-tl-none text-sm text-muted-foreground shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-muted/30">
            <form onSubmit={handleSend} className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your assistant..."
                className="pr-12 py-6 rounded-xl focus-visible:ring-blue-600 border-blue-100 shadow-sm"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 rounded-lg h-8 w-8 transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-wider font-semibold">
              Powered by Google Gemini
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
