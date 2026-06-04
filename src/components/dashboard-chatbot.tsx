"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Account-aware assistant for signed-in customers. Calls `/api/dashboard-chat`
 * which itself uses OpenAI tool-calling against the customer's own data
 * (scoped by session). Conversation state lives in component memory; on close
 * it persists in `sessionStorage` so the user can re-open mid-session without
 * losing context, but nothing is written to disk or shared cross-device.
 */

type Message = {
  role: "user" | "assistant";
  content: string;
  degraded?: string;
};

const INITIAL: Message = {
  role: "assistant",
  content:
    "Hi 👋 I'm Routey. Ask me about your profiles, transactions, fees, or anything else on your StableRoute account.",
};

const QUICK_PROMPTS = [
  "What's the status of my latest transaction?",
  "How much have I received in total?",
  "Do I have any pending changes?",
  "How fast is settlement?",
];

const STORAGE_KEY = "stableroute-dashboard-chat";

export function DashboardChatbot() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [INITIAL];
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [INITIAL];
      const parsed = JSON.parse(raw) as Message[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL];
    } catch {
      return [INITIAL];
    }
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage can throw under quota — safe to ignore.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || pending) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          // Send only the last 12 messages to keep the payload small.
          history: next.slice(-12),
        }),
      });
      const json = (await res.json()) as {
        answer?: string;
        error?: string;
        degraded?: string;
      };
      const answer =
        json.answer ??
        json.error ??
        "Something went wrong. Please try again in a moment.";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: answer,
          degraded: json.degraded,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Network error — please try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setMessages([INITIAL]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={cn(
          "fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl ring-2 ring-background transition-transform hover:scale-105",
          open && "scale-95",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Routey</p>
                <p className="text-[11px] text-muted-foreground">
                  Powered by AI · Knows your account
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              title="Start a new conversation"
            >
              New chat
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-1",
                  m.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.degraded && (
                  <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    answered from offline knowledge ({m.degraded})
                  </span>
                )}
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {messages.length <= 1 && (
              <div className="space-y-2 pt-2">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="rounded-full border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t bg-background px-3 py-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your account…"
              disabled={pending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending || input.trim().length === 0}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
