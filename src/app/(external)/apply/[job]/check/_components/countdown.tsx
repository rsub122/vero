"use client";

import { useEffect, useRef, useState } from "react";

import { Progress } from "@/components/ui/progress";

interface CountdownProps {
  deadline: number;
  seconds: number;
  paused: boolean;
  label: (secondsLeft: number) => string;
  onExpire: () => void;
}

// ponytail: trusts the phone clock (NTP-synced) against the server deadline; the server keeps a 2s grace
// and stays the authority. Add a clock-offset handshake if skew ever shows up.
export function Countdown({ deadline, seconds, paused, label, onExpire }: CountdownProps) {
  const [left, setLeft] = useState(() => Math.max(0, deadline - Date.now()));
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const next = Math.max(0, deadline - Date.now());
      setLeft(next);
      if (next === 0) {
        clearInterval(timer);
        expire.current();
      }
    };
    const timer = setInterval(tick, 200);
    tick();
    return () => clearInterval(timer);
  }, [deadline, paused]);

  const secondsLeft = Math.ceil(left / 1000);
  return (
    <div className="flex flex-col gap-1.5" role="timer" aria-label={label(secondsLeft)}>
      <Progress value={(left / (seconds * 1000)) * 100} className={secondsLeft <= 5 ? "*:bg-amber-500" : undefined} />
      <span className="text-muted-foreground text-xs tabular-nums">{label(secondsLeft)}</span>
    </div>
  );
}
