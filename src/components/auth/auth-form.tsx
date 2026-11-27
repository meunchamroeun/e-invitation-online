"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/features/auth/actions";
import { Button, Field } from "@/components/ui";
import type { Dictionary } from "@/i18n/dictionaries";

type AuthFormProps = {
  mode: "login" | "register";
  t: Dictionary["auth"];
  locale?: "km" | "en";
  next?: string;
  googleEnabled?: boolean;
  telegramBot?: string | null;
  oauthError?: string;
};

export function AuthForm({ mode, t, locale = "km", next, googleEnabled = false, telegramBot = null, oauthError }: AuthFormProps) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, undefined);
  const [showPw, setShowPw] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(
    oauthError === "google_unconfigured"
      ? (locale === "km" ? "សូមកំណត់ GOOGLE_CLIENT_ID និង GOOGLE_CLIENT_SECRET ក្នុង .env.local ជាមុនសិន។" : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.")
      : oauthError
        ? (locale === "km" ? "ការចូលមិនបានជោគជ័យ — សូមព្យាយាមម្ដងទៀត។" : "Sign-in failed — please try again.")
        : null,
  );
  const tgContainer = useRef<HTMLDivElement>(null);
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";

  useEffect(() => {
    if (!telegramBot || !tgContainer.current) return;
    const container = tgContainer.current;
    container.innerHTML = "";
    const cbName = "__onTelegramAuth";
    (window as unknown as Record<string, unknown>)[cbName] = async (user: Record<string, unknown>) => {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...user, next: next ?? "/dashboard" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; redirect?: string } | null;
      if (json?.ok && json.redirect) window.location.assign(json.redirect);
      else setSocialNotice(locale === "km" ? "ការចូលតាម Telegram មិនបានជោគជ័យ។" : "Telegram sign-in failed.");
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", telegramBot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", `${cbName}(user)`);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
      delete (window as unknown as Record<string, unknown>)[cbName];
    };
  }, [telegramBot, next, locale]);

  return (
    <div className="space-y-5">
      {/* Modern segmented tab switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F3EFE8] p-1 text-xs font-medium sm:text-sm">
        <Link
          href={`/login${nextQ}`}
          className={`rounded-lg py-2 text-center transition-all ${mode === "login" ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-muted hover:text-ink"}`}
        >
          {t.login}
        </Link>
        <Link
          href={`/register${nextQ}`}
          className={`rounded-lg py-2 text-center transition-all ${mode === "register" ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-muted hover:text-ink"}`}
        >
          {t.register}
        </Link>
      </div>

      <form action={action} className="space-y-4" noValidate={false}>
        <input type="hidden" name="next" value={next ?? ""} />
        {mode === "register" ? (
          <Field label={t.name} htmlFor="name">
            <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line-2 bg-paper/60 px-3.5 transition-[border,box-shadow,background] focus-within:border-gold focus-within:bg-white focus-within:ring-4 focus-within:ring-gold/15">
              <User className="h-4 w-4 shrink-0 text-muted" />
              <input id="name" name="name" required maxLength={80} autoComplete="name" defaultValue={state?.fields?.name} className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" />
            </div>
          </Field>
        ) : null}
        <Field label={t.email} htmlFor="email">
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line-2 bg-paper/60 px-3.5 transition-[border,box-shadow,background] focus-within:border-gold focus-within:bg-white focus-within:ring-4 focus-within:ring-gold/15">
            <Mail className="h-4 w-4 shrink-0 text-muted" />
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" placeholder="name@example.com" />
          </div>
        </Field>
        <Field label={t.password} htmlFor="password" hint={mode === "register" ? t.pwHint : undefined}>
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line-2 bg-paper/60 px-3.5 transition-[border,box-shadow,background] focus-within:border-gold focus-within:bg-white focus-within:ring-4 focus-within:ring-gold/15">
            <Lock className="h-4 w-4 shrink-0 text-muted" />
            <input id="password" name="password" type={showPw ? "text" : "password"} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
              className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:text-ink">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {state?.error ? <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{state.error}</p> : null}
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full border-0 text-white shadow-[0_14px_30px_-10px_rgba(142,102,44,0.65)] transition-all hover:brightness-105 active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, #8E662C 0%, #B68A45 50%, #99713A 100%)" }}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "login" ? t.login : t.register}
        </Button>
      </form>

      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-line" />
        <span className="px-3 text-xs text-muted">{locale === "km" ? "ឬ បន្តជាមួយ" : "or continue with"}</span>
        <div className="flex-1 border-t border-line" />
      </div>

      {socialNotice ? <p role="status" className="rounded-xl bg-[#FAF6EE] px-3.5 py-2.5 text-xs text-[#8E662C]">{socialNotice}</p> : null}

      <div className="grid grid-cols-2 gap-2.5">
        {googleEnabled ? (
          <a
            href={`/api/auth/google${nextQ}`}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            <GoogleIcon />
            <span>Google</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setSocialNotice(locale === "km" ? "សូមកំណត់ GOOGLE_CLIENT_ID និង GOOGLE_CLIENT_SECRET ក្នុង .env.local ដើម្បីបើក Google Login។" : "Add GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET in .env.local to enable Google Login.")}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
        )}

        {telegramBot ? (
          <div ref={tgContainer} className="flex h-11 items-center justify-center overflow-hidden rounded-xl border border-line-2 bg-white" />
        ) : (
          <button
            type="button"
            onClick={() => setSocialNotice(locale === "km" ? "សូមកំណត់ TELEGRAM_BOT_TOKEN និង TELEGRAM_BOT_USERNAME ក្នុង .env.local ដើម្បីបើក Telegram Login។" : "Add TELEGRAM_BOT_TOKEN & TELEGRAM_BOT_USERNAME in .env.local to enable Telegram Login.")}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            <TelegramIcon />
            <span>Telegram</span>
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#229ED9]">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}
