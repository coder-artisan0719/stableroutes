"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Total inactivity allowed before auto sign-out.
const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
// How long before the limit to show the "still there?" warning.
const WARN_BEFORE_MS = 60 * 1000; // 60 seconds

/**
 * Logs the user out after IDLE_LIMIT_MS of no interaction. Tracks activity via
 * a lastActivity timestamp + 1s interval (more reliable than a single
 * setTimeout, which browsers throttle in background tabs).
 */
export function IdleTimeout() {
  const lastActivity = useRef<number>(Date.now());
  const warningRef = useRef(false);
  const loggingOutRef = useRef(false);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const doLogout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    void signOut({ redirectTo: "/login?expired=1" });
  }, []);

  const stayActive = useCallback(() => {
    lastActivity.current = Date.now();
    warningRef.current = false;
    setWarning(false);
    // Touch the session endpoint so the server-side JWT also refreshes.
    void fetch("/api/auth/session").catch(() => {});
  }, []);

  // Track user activity. Once the warning is up, ignore passive activity —
  // the user must explicitly choose "Stay signed in".
  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ] as const;
    let throttled = false;
    const onActivity = () => {
      if (warningRef.current) return;
      if (throttled) return;
      throttled = true;
      window.setTimeout(() => {
        throttled = false;
      }, 1000);
      lastActivity.current = Date.now();
    };
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

  // 1-second tick: evaluate idle time, show warning, or log out.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const remaining = IDLE_LIMIT_MS - idle;

      if (remaining <= 0) {
        doLogout();
      } else if (remaining <= WARN_BEFORE_MS) {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [doLogout]);

  return (
    <Dialog open={warning} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-warning">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Still there?</DialogTitle>
          <DialogDescription className="text-center">
            For your security, you&apos;ll be signed out in{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {secondsLeft}s
            </span>{" "}
            due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={doLogout}>
            Log out now
          </Button>
          <Button onClick={stayActive}>Stay signed in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
