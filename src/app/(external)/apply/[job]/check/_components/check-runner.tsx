"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "cn";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

import { sessionStore, useCopy } from "../../_components/dictionary";
import { Countdown } from "./countdown";

interface ActiveQuestion {
  index: number;
  total: number;
  kind: "safety" | "bot" | "claim";
  text: string;
  choices?: string[];
  seconds: number;
  deadline: number;
}

interface QuestionScreenProps {
  question: ActiveQuestion;
  online: boolean;
  onAnswer: (value: string, pasted: boolean) => Promise<void>;
}

function QuestionScreen({ question, online, onAnswer }: QuestionScreenProps) {
  const { t } = useCopy();
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const pasted = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const send = async () => {
    if (sending) return;
    setSending(true);
    // On expiry whatever is selected or typed so far is what gets stored (R8).
    await onAnswer(latest.current, pasted.current).catch(() => setSending(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {t.questionOf.replace("{n}", String(question.index + 1)).replace("{total}", String(question.total))}
        </CardDescription>
        <CardTitle className="text-balance text-lg leading-snug">{question.text}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Countdown
          deadline={question.deadline}
          seconds={question.seconds}
          paused={!online || sending}
          label={(n) => (online ? t.secondsLeft.replace("{n}", String(n)) : t.reconnecting)}
          onExpire={send}
        />
        {question.choices ? (
          <div role="radiogroup" aria-label={question.text} className="grid gap-2">
            {question.choices.map((choice, i) => (
              <Button
                key={choice}
                type="button"
                role="radio"
                variant="outline"
                aria-checked={value === String(i)}
                className={cn(
                  "h-auto min-h-12 justify-start whitespace-normal py-3 text-start",
                  value === String(i) && "border-primary bg-muted",
                )}
                onClick={() => setValue(String(i))}
              >
                {choice}
              </Button>
            ))}
          </div>
        ) : (
          <Textarea
            autoFocus
            rows={question.kind === "bot" ? 1 : 3}
            maxLength={300}
            value={value}
            placeholder={t.answerPlaceholder}
            aria-label={question.text}
            onChange={(event) => setValue(event.target.value)}
            onPaste={() => {
              pasted.current = true;
            }}
          />
        )}
        <Button size="lg" disabled={sending || !online || value === ""} onClick={send}>
          {sending ? <Spinner /> : t.next}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CheckRunner({ slug }: { slug: string }) {
  const router = useRouter();
  const { t } = useCopy();
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>();
  const online = useConvexConnectionState().isWebSocketConnected;
  const current = useQuery(api.check.currentQuestion, token ? { token } : "skip");
  const beginCheck = useMutation(api.check.beginCheck);
  const answerQuestion = useMutation(api.check.answerQuestion);

  useEffect(() => setToken(params.get("t") ?? sessionStore.get(slug)), [params, slug]);

  const state = token === null ? "unknown" : current?.state;
  useEffect(() => {
    if (state === "done") router.replace(`/apply/${slug}/done`);
    if (state === "unknown" || state === "form") router.replace(`/apply/${slug}`);
  }, [state, router, slug]);

  if (!token || !current) return <Skeleton className="h-72 w-full rounded-xl" />;

  if (current.state === "intro") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-balance text-lg">{t.introTitle}</CardTitle>
          <CardDescription>{t.introBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full" disabled={!online} onClick={() => void beginCheck({ token })}>
            {t.start}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (current.state !== "question") return <Skeleton className="h-72 w-full rounded-xl" />;

  return (
    <QuestionScreen
      key={current.index}
      question={current}
      online={online}
      onAnswer={async (value, pasted) => {
        await answerQuestion({ token, index: current.index, value, pasted });
      }}
    />
  );
}
