import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export { Button, buttonClass } from "./button";

const field = "w-full rounded-xl border border-line-2 bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-[border,box-shadow] focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15 disabled:bg-paper";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(field, "h-11", className)} {...rest} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-24 py-2.5 leading-7", className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(field, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23737373%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...rest}>
      {children}
    </select>
  );
});

export function Label({ children, htmlFor, hint, className }: { children: ReactNode; htmlFor?: string; hint?: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-2", className)}>
      <span>{children}</span>
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Field({ label, hint, error, children, htmlFor, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} hint={hint}>{label}</Label>
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)}>{children}</div>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "gold" | "success" | "warning" | "danger" | "dark"; className?: string }) {
  const tones = {
    neutral: "bg-black/[.05] text-ink-2",
    gold: "bg-gold-soft text-gold-2",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-[#8a5a12]",
    danger: "bg-danger/10 text-danger",
    dark: "bg-ink text-white",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 bg-white/60 px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-gold">{icon}</div> : null}
      <p className="text-base font-semibold">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "success" | "danger" | "warning" | "gold" }) {
  const dot = { success: "bg-success", danger: "bg-danger", warning: "bg-warning", gold: "bg-gold" };
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13px] text-muted">{tone ? <span className={cn("h-1.5 w-1.5 rounded-full", dot[tone])} /> : null}{label}</p>
      <p className="num mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
