"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TELEGRAM_URL = "https://t.me/stableroute";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.495 8.218-1.834 8.654c-.139.611-.5.762-1.014.475l-2.802-2.067-1.353 1.302c-.15.15-.276.276-.566.276l.201-2.853 5.183-4.683c.226-.2-.05-.313-.351-.113l-6.41 4.034-2.762-.864c-.6-.187-.611-.6.126-.888l10.788-4.158c.5-.187.937.113.794.885Z" />
    </svg>
  );
}

type Message = {
  role: "bot" | "user";
  text: string;
  suggestions?: string[];
};

const INITIAL_BOT: Message = {
  role: "bot",
  text:
    "Hi 👋 I'm Routey, the StableRoute assistant. Ask me anything about how USD-to-USDC settlement works, fees, or getting started.",
  suggestions: [
    "What is StableRoute?",
    "How fast is settlement?",
    "How much does it cost?",
    "Is StableRoute a bank?",
  ],
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_BOT]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as {
        answer: string;
        suggestions: string[];
      };
      setMessages((m) => [
        ...m,
        { role: "bot", text: data.answer, suggestions: data.suggestions },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Sorry — I'm having trouble responding right now. Try again in a moment, or email hello@stableroute.io.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat assistant"
        className={cn(
          "fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-xl ring-2 ring-white/20 transition-transform hover:scale-105 active:scale-95 dark:ring-black/20",
          open && "scale-0 opacity-0 pointer-events-none",
        )}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-success" />
        </span>
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5 transition-all duration-200 dark:ring-white/10",
          "h-[560px] max-h-[calc(100vh-2.5rem)]",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
        role="dialog"
        aria-label="StableRoute chat assistant"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-amber-500 via-amber-500 to-yellow-600 px-4 py-3 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-none">Routey</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/85">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              Online · usually replies instantly
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live-chat (Telegram) CTA — always visible at top */}
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 border-b border-border bg-gradient-to-r from-[#229ED9]/10 via-[#229ED9]/5 to-transparent px-4 py-2.5 transition-colors hover:from-[#229ED9]/15 hover:via-[#229ED9]/10"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#229ED9] text-white shadow-sm">
            <TelegramIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Talk to a human on Telegram</p>
            <p className="text-[11px] text-muted-foreground">
              Live agent · usually replies within minutes
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </a>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4"
        >
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              <div
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border bg-card text-foreground shadow-sm",
                  )}
                >
                  {m.text}
                </div>
              </div>
              {m.suggestions && m.suggestions.length > 0 && !pending && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border bg-background p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Routey…"
            disabled={pending}
            className="h-10 flex-1"
            aria-label="Type a message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || input.trim().length === 0}
            aria-label="Send"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Footer hint */}
        <p className="border-t border-border bg-muted/30 px-4 py-2 text-center text-[11px] text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Powered by StableRoute · responses are informational
        </p>
      </div>
    </>
  );
}
