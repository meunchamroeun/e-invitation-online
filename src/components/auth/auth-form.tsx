"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/features/auth/actions";
import { Button, Field, Input } from "@/components/ui";
import type { Dictionary } from "@/i18n/dictionaries";

export function AuthForm({ mode, t, next }: { mode: "login" | "register"; t: Dictionary["auth"]; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "register" ? (
        <Field label={t.name} htmlFor="name">
          <Input id="name" name="name" required maxLength={80} autoComplete="name" defaultValue={state?.fields?.name} />
        </Field>
      ) : null}
      <Field label={t.email} htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} />
      </Field>
      <Field label={t.password} htmlFor="password" hint={mode === "register" ? t.pwHint : undefined}>
        <Input id="password" name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </Field>
      {state?.error ? <p role="alert" className="rounded-xl bg-danger/8 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? t.login : t.register}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t.noAccount : t.haveAccount}{" "}
        <Link className="font-medium text-gold-2 underline-offset-4 hover:underline" href={`${mode === "login" ? "/register" : "/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {mode === "login" ? t.register : t.login}
        </Link>
      </p>
    </form>
  );
}
