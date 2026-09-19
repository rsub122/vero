"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Controller, type ControllerFieldState, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { type Copy, sessionStore, useCopy } from "./dictionary";
import { OTHER_PROVIDER, ProviderPicker } from "./provider-picker";
import { useFieldTiming } from "./use-field-timing";

const today = () => new Date().toISOString().slice(0, 10);

function makeSchema(t: Copy) {
  const text = z.string().trim().min(1, t.required).max(120);
  return z
    .object({
      name: text,
      phone: z.string().regex(/^[0-9+()\-.\s]{7,20}$/, t.phoneInvalid),
      yearsInTrade: z.string().regex(/^([0-9]|[1-6][0-9]|70)$/, t.yearsInvalid),
      lastEmployer: text,
      lastSite: text,
      hasCard: z.boolean({ error: t.required }),
      provider: z.string(),
      providerOther: z.string().max(120),
      cardId: z.string().max(120),
      cardIssueDate: z.string(),
      startDate: z.string().min(1, t.required),
      hasTransport: z.boolean({ error: t.required }),
    })
    .superRefine((v, ctx) => {
      if (!v.hasCard) return;
      const need = (path: string, ok: boolean, message = t.required) => {
        if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
      };
      need("provider", v.provider !== "");
      need("providerOther", v.provider !== OTHER_PROVIDER || v.providerOther.trim() !== "");
      need("cardId", v.cardId.trim() !== "");
      need("cardIssueDate", v.cardIssueDate !== "");
      need("cardIssueDate", v.cardIssueDate <= today(), t.dateFuture);
    });
}

type FormInput = z.input<ReturnType<typeof makeSchema>>;
type FormValues = z.output<ReturnType<typeof makeSchema>>;

interface YesNoProps {
  id: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  t: Copy;
}

function YesNo({ id, value, onChange, t }: YesNoProps) {
  return (
    <div id={id} className="grid grid-cols-2 gap-2">
      {[true, false].map((option) => (
        <Button
          key={String(option)}
          type="button"
          variant={value === option ? "default" : "outline"}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option ? t.yes : t.no}
        </Button>
      ))}
    </div>
  );
}

/** Starts (or resumes) the server session for this phone and hands back its token. */
function useApplySession(slug: string, jobExists: boolean) {
  const router = useRouter();
  const { lang } = useCopy();
  const [stored, setStored] = useState<string | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const starting = useRef(false);
  const start = useMutation(api.applicants.startApplication);
  const status = useQuery(api.applicants.sessionStatus, stored ? { token: stored } : "skip");

  useEffect(() => setStored(sessionStore.get(slug)), [slug]);

  useEffect(() => {
    if (!jobExists || token || stored === undefined || starting.current) return;
    if (stored && status === undefined) return;
    if (stored && status === "form") return setToken(stored);
    if (stored && status === "check") return router.replace(`/apply/${slug}/check?t=${stored}`);
    // No session, a finished one, or one that was purged: start fresh.
    starting.current = true;
    start({ slug, language: lang })
      .then((fresh) => {
        sessionStore.set(slug, fresh);
        setToken(fresh);
      })
      .catch(() => toast.error("Could not start the application. Refresh to try again."));
  }, [jobExists, token, stored, status, slug, lang, start, router]);

  return token;
}

export function ApplyForm({ slug }: { slug: string }) {
  const router = useRouter();
  const { lang, t } = useCopy();
  const job = useQuery(api.applicants.job, { slug });
  const token = useApplySession(slug, Boolean(job));
  const submitForm = useMutation(api.applicants.submitForm);
  const timing = useFieldTiming();

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      yearsInTrade: "",
      lastEmployer: "",
      lastSite: "",
      provider: "",
      providerOther: "",
      cardId: "",
      cardIssueDate: "",
      startDate: "",
    },
  });
  const hasCard = form.watch("hasCard");
  const provider = form.watch("provider");

  if (job === undefined) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (job === null) return <p className="py-16 text-center text-muted-foreground">{t.jobNotFound}</p>;

  const onSubmit = async (v: FormValues) => {
    if (!token) return;
    const listed = v.hasCard && v.provider !== OTHER_PROVIDER;
    try {
      await submitForm({
        token,
        language: lang,
        clientTiming: timing.snapshot(),
        form: {
          name: v.name,
          phone: v.phone.trim(),
          yearsInTrade: Number(v.yearsInTrade),
          lastEmployer: v.lastEmployer,
          lastSite: v.lastSite,
          hasCard: v.hasCard,
          providerId: listed ? (v.provider as Id<"providers">) : undefined,
          providerOther: v.hasCard && !listed ? v.providerOther.trim() : undefined,
          cardId: v.hasCard ? v.cardId.trim() : undefined,
          cardIssueDate: v.hasCard ? v.cardIssueDate : undefined,
          startDate: v.startDate,
          hasTransport: v.hasTransport,
        },
      });
      router.push(`/apply/${slug}/check?t=${token}`);
    } catch {
      toast.error(t.submitFailed);
    }
  };

  const textField = (
    name: "name" | "phone" | "yearsInTrade" | "lastEmployer" | "lastSite" | "providerOther" | "cardId",
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid} {...timing.track(name)}>
          <FieldLabel htmlFor={`apply-${name}`}>{label}</FieldLabel>
          <Input {...field} {...props} id={`apply-${name}`} aria-invalid={fieldState.invalid} />
          <Errors state={fieldState} />
        </Field>
      )}
    />
  );

  const dateField = (name: "cardIssueDate" | "startDate", label: string, props: { min?: string; max?: string }) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid} {...timing.track(name)}>
          <FieldLabel htmlFor={`apply-${name}`}>{label}</FieldLabel>
          {/* Native date input: better than a popover calendar on a phone. */}
          <Input {...field} {...props} id={`apply-${name}`} type="date" aria-invalid={fieldState.invalid} />
          <Errors state={fieldState} />
        </Field>
      )}
    />
  );

  const yesNoField = (name: "hasCard" | "hasTransport", label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid} {...timing.track(name)}>
          <FieldLabel htmlFor={`apply-${name}`}>{label}</FieldLabel>
          <YesNo id={`apply-${name}`} value={field.value} onChange={field.onChange} t={t} />
          <Errors state={fieldState} />
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{job.title}</CardTitle>
        <CardDescription>
          {job.company}. {t.tagline}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            {textField("name", t.name, { autoComplete: "name" })}
            {textField("phone", t.phone, { type: "tel", inputMode: "tel", autoComplete: "tel" })}
            {textField("yearsInTrade", t.yearsInTrade, { inputMode: "numeric", maxLength: 2 })}
            {textField("lastEmployer", t.lastEmployer, { autoComplete: "organization" })}
            {textField("lastSite", t.lastSite)}
            {yesNoField("hasCard", t.hasCard)}
            {hasCard && (
              <>
                <Controller
                  control={form.control}
                  name="provider"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid} {...timing.track("provider")}>
                      <FieldLabel htmlFor="apply-provider">{t.provider}</FieldLabel>
                      <ProviderPicker
                        id="apply-provider"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={fieldState.invalid}
                        t={t}
                      />
                      <Errors state={fieldState} />
                    </Field>
                  )}
                />
                {provider === OTHER_PROVIDER && textField("providerOther", t.providerOtherLabel)}
                {textField("cardId", t.cardId, { autoCapitalize: "characters" })}
                {dateField("cardIssueDate", t.cardIssueDate, { max: today() })}
              </>
            )}
            {dateField("startDate", t.startDate, { min: today() })}
            {yesNoField("hasTransport", t.hasTransport)}
          </FieldGroup>
          <Button type="submit" size="lg" className="w-full" disabled={!token || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Errors({ state }: { state: ControllerFieldState }) {
  return state.invalid ? <FieldError errors={[state.error]} /> : null;
}
