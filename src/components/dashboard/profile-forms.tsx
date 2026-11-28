"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@base-ui/react/avatar";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cva } from "class-variance-authority";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Bell,
  Check,
  Copy,
  Crown,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MoreHorizontal,
  Send,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  changePasswordAction,
  deleteAccountAction,
  signOutOtherSessionsAction,
  telegramLinkCodeAction,
  telegramStatusAction,
  updateNotificationPrefsAction,
  updateProfileAction,
} from "@/features/account/actions";
import { setLocaleAction } from "@/features/auth/actions";
import { Badge, Button, Field, Input, buttonClass } from "@/components/ui";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProfileTab = "account" | "notifications" | "security";

const heroCardVariants = cva(
  "profile-stagger relative overflow-hidden rounded-3xl border bg-white p-6 shadow-xs",
  {
    variants: {
      tier: {
        free: "border-[#e7e1d5]",
        paid: "border-[#e3d2b4] bg-gradient-to-br from-white via-white to-[#fcf8ef]",
      },
    },
    defaultVariants: { tier: "free" },
  },
);

function ProfileSwitch({
  checked,
  disabled,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-[#86622f] bg-[#86622f]" : "border-[#d5cbb9] bg-[#ebe5d9]",
      )}
    >
      <Switch.Thumb
        className={cn(
          "block size-4.5 rounded-full bg-white shadow-xs transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </Switch.Root>
  );
}

export function ProfileForms({
  locale,
  user,
  telegram,
}: {
  locale: "km" | "en";
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    locale: "km" | "en";
    planCode: string;
    planName: string;
    eventsCount: number;
    sessionsCount: number;
  };
  telegram: {
    configured: boolean;
    connected: boolean;
    onRsvp: boolean;
    onDecline: boolean;
    onWish: boolean;
  };
}) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<ProfileTab>("account");
  const [p, setP] = useState({ name: user.name, locale: user.locale });
  const [tg, setTg] = useState(telegram);
  const [code, setCode] = useState<{ code: string; bot: string | null } | null>(null);
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [showPw, setShowPw] = useState(false);
  const [del, setDel] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(user.sessionsCount);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".profile-stagger",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
      );
      el.querySelectorAll<HTMLElement>("[data-profile-count]").forEach((node) => {
        const target = Number(node.dataset.profileCount ?? 0);
        const state = { val: 0 };
        gsap.to(state, {
          val: target,
          duration: 0.6,
          ease: "power2.out",
          onUpdate: () => {
            node.textContent = String(Math.round(state.val));
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      const st = await telegramStatusAction().catch(() => null);
      if (!cancelled && st?.connected) {
        window.clearInterval(id);
        setCode(null);
        setTg((prev) => ({ ...prev, connected: true }));
        router.refresh();
      }
    }, 2500);
    const stopTimer = window.setTimeout(() => window.clearInterval(id), 120000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(stopTimer);
    };
  }, [code, router]);

  const initials =
    p.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "?";

  const isPaid = user.planCode !== "free";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={rootRef} className="max-w-3xl space-y-5 pb-12">
      {/* Profile Hero Card (GSAP + Base UI Avatar + Radix Dropdown + cva) */}
      <div className={heroCardVariants({ tier: isPaid ? "paid" : "free" })}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar.Root className="relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#e3d2b4] bg-[#f4eddf] text-lg font-semibold text-[#765124] shadow-xs select-none">
              {user.avatarUrl ? (
                <Avatar.Image
                  src={user.avatarUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              ) : null}
              <Avatar.Fallback className="grid size-full place-items-center">{initials}</Avatar.Fallback>
            </Avatar.Root>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-ink" dir="auto">{p.name}</h2>
                <Badge tone={isPaid ? "gold" : "neutral"}>
                  {isPaid ? <Crown size={11} aria-hidden="true" /> : <Sparkles size={11} aria-hidden="true" />}
                  {user.planName}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/billing"
              className={buttonClass("outline", "sm", "rounded-xl text-xs")}
            >
              {isPaid ? L("គម្រោង", "Manage plan") : L("ដំឡើងគម្រោង", "Upgrade plan")}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={L("សកម្មភាពរហ័ស", "Quick actions")}
                  className="grid size-8 place-items-center rounded-xl border border-[#e7e1d5] bg-white text-ink-2 transition-colors hover:bg-[#faf8f3]"
                >
                  {copied ? <Check size={14} className="text-success" aria-hidden="true" /> : <MoreHorizontal size={15} aria-hidden="true" />}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-xl border border-[#e7e1d5] bg-white p-1.5 shadow-xl">
                  <DropdownMenu.Item
                    onSelect={copyEmail}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
                  >
                    <Copy size={13} aria-hidden="true" />
                    {L("ចម្លងអ៊ីមែល", "Copy email")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      href="/api/account/export"
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
                    >
                      <Download size={13} aria-hidden="true" />
                      {L("ទាញយកទិន្នន័យ (JSON)", "Export data (JSON)")}
                    </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        {/* Mini Stats Strip */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center sm:text-left">
          <div>
            <p className="text-[11px] font-medium text-muted">{L("កម្មវិធី", "Events")}</p>
            <p className="num mt-0.5 text-lg font-semibold text-ink" data-profile-count={user.eventsCount}>
              {user.eventsCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted">{L("ឧបករណ៍កំពុងភ្ជាប់", "Active sessions")}</p>
            <p className="num mt-0.5 text-lg font-semibold text-ink" data-profile-count={sessionsCount}>
              {sessionsCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted">Telegram</p>
            <p className="mt-1">
              <Badge tone={tg.connected ? "success" : "neutral"}>
                {tg.connected ? L("បានភ្ជាប់", "Connected") : L("មិនទាន់ភ្ជាប់", "Not linked")}
              </Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Base UI Tabs + Motion layoutId Navigation */}
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <Tabs.List
          aria-label={L("ផ្នែកកំណត់", "Profile sections")}
          className="profile-stagger inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-[#e7e1d5] bg-[#faf8f3] p-1 sm:w-auto"
        >
          {(
            [
              ["account", L("គណនី", "Account"), UserRound],
              ["notifications", L("ការជូនដំណឹង", "Alerts & Telegram"), Bell],
              ["security", L("សុវត្ថិភាព និងទិន្នន័យ", "Security & Data"), Shield],
            ] as const
          ).map(([key, label, Icon]) => {
            const active = tab === key;
            return (
              <Tabs.Tab
                key={key}
                value={key}
                className={cn(
                  "relative z-10 inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-colors sm:flex-initial",
                  active ? "text-[#241c19]" : "text-muted hover:text-ink",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="profile-tab-pill"
                    transition={{ type: "spring", stiffness: 440, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-xs"
                  />
                ) : null}
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        <AnimatePresence mode="wait">
          {tab === "account" ? (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <form
                className="rounded-3xl border border-[#e7e1d5] bg-white p-6 shadow-xs"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMsg({});
                  start(async () => {
                    const res = await updateProfileAction(p);
                    await setLocaleAction(p.locale);
                    if (res.ok) setMsg({ profile: L("បានរក្សាទុក", "Saved") });
                    router.refresh();
                  });
                }}
              >
                <h3 className="text-base font-semibold text-ink">{L("ព័ត៌មានគណនី", "Account details")}</h3>
                <p className="mt-1 text-xs text-muted">
                  {L("កែសម្រួលឈ្មោះបង្ហាញ និងភាសាសម្រាប់ផ្ទាំងគ្រប់គ្រង។", "Update your display name and preferred interface language.")}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={L("ឈ្មោះ", "Display name")} htmlFor="p-n">
                    <Input
                      id="p-n"
                      value={p.name}
                      maxLength={80}
                      required
                      onChange={(e) => {
                        setP({ ...p, name: e.target.value });
                        setMsg({});
                      }}
                    />
                  </Field>

                  <Field label={L("ភាសា", "Language")}>
                    <Tabs.Root
                      value={p.locale}
                      onValueChange={(v) => {
                        setP({ ...p, locale: v as "km" | "en" });
                        setMsg({});
                      }}
                    >
                      <Tabs.List className="grid h-11 grid-cols-2 items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-1">
                        {(
                          [
                            ["km", "ខ្មែរ"],
                            ["en", "English"],
                          ] as const
                        ).map(([loc, text]) => (
                          <Tabs.Tab
                            key={loc}
                            value={loc}
                            className={cn(
                              "relative z-10 h-full rounded-lg text-sm font-medium transition-colors",
                              p.locale === loc ? "text-[#241c19]" : "text-muted hover:text-ink",
                            )}
                          >
                            {p.locale === loc ? (
                              <motion.span
                                layoutId="profile-lang-pill"
                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                              />
                            ) : null}
                            {text}
                          </Tabs.Tab>
                        ))}
                      </Tabs.List>
                    </Tabs.Root>
                  </Field>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                  {msg.profile ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <Check size={14} aria-hidden="true" />
                      {msg.profile}
                    </span>
                  ) : null}
                  <Button type="submit" disabled={pending} className="rounded-xl">
                    {pending ? L("កំពុងរក្សាទុក…", "Saving…") : L("រក្សាទុកការផ្លាស់ប្តូរ", "Save changes")}
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : null}

          {tab === "notifications" ? (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <div className="rounded-3xl border border-[#e7e1d5] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">Telegram Bot</h3>
                    <p className="mt-1 text-xs text-muted">
                      {L("ទទួលការជូនដំណឹងភ្លាមៗនៅលើ Telegram ពេលភ្ញៀវឆ្លើយតប ឬផ្ញើពាក្យជូនពរ។", "Get instant Telegram alerts when guests RSVP or leave wishes.")}
                    </p>
                  </div>
                  <Badge tone={tg.connected ? "success" : "neutral"}>
                    {tg.connected ? L("បានភ្ជាប់", "Connected") : L("មិនទាន់ភ្ជាប់", "Not connected")}
                  </Badge>
                </div>

                {!tg.configured ? (
                  <p className="mt-4 rounded-2xl border border-[#efe9dc] bg-[#faf8f3] p-3.5 text-xs text-muted">
                    {L(
                      "Telegram bot មិនទាន់កំណត់រចនាសម្ព័ន្ធលើម៉ាស៊ីនមេនេះទេ (TELEGRAM_BOT_TOKEN)។ ការជូនដំណឹងនៅតែបង្ហាញក្នុងកម្មវិធី។",
                      "The Telegram bot isn't configured on this server (TELEGRAM_BOT_TOKEN). Notifications still appear in-app.",
                    )}
                  </p>
                ) : null}

                {tg.configured && !tg.connected ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await telegramLinkCodeAction();
                          setCode(res);
                          if (res.bot) window.open(`https://t.me/${res.bot}?start=${res.code}`, "_blank", "noopener,noreferrer");
                        })
                      }
                    >
                      <Send className="h-4 w-4" />
                      {L("ភ្ជាប់ Telegram", "Connect Telegram")}
                    </Button>
                    {code ? (
                      <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#faf8f3] p-3 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-gold-2" />
                        <span>{L("កំពុងរង់ចាំចុច Start ក្នុង", "Waiting for Start in")}</span>
                        {code.bot ? (
                          <a className="font-medium text-gold-2 underline" href={`https://t.me/${code.bot}?start=${code.code}`} target="_blank" rel="noopener noreferrer">
                            @{code.bot}
                          </a>
                        ) : (
                          <code className="rounded bg-white px-2 py-0.5">/start {code.code}</code>
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 space-y-2.5 border-t border-line pt-4">
                  {(
                    [
                      ["onRsvp", L("ភ្ញៀវឆ្លើយតបចូលរួម", "Guest RSVPs")],
                      ["onDecline", L("ភ្ញៀវមិនអាចចូលរួម", "Guest declines")],
                      ["onWish", L("ពាក្យជូនពររង់ចាំការអនុម័ត", "Wishes awaiting approval")],
                    ] as const
                  ).map(([k, label]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#efe9dc] bg-[#fcfbf8] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-ink-2">{label}</span>
                      <ProfileSwitch
                        checked={tg[k]}
                        disabled={pending}
                        label={label}
                        onCheckedChange={(checked) => {
                          const next = { ...tg, [k]: checked };
                          setTg(next);
                          start(async () => {
                            await updateNotificationPrefsAction(next);
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>

                {tg.connected ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-danger hover:bg-danger/10"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await updateNotificationPrefsAction({ ...tg, disconnect: true });
                          setTg((prev) => ({ ...prev, connected: false }));
                          router.refresh();
                        })
                      }
                    >
                      {L("ផ្ដាច់ Telegram", "Disconnect Telegram")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {tab === "security" ? (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-4"
            >
              {/* Change Password */}
              <form
                className="rounded-3xl border border-[#e7e1d5] bg-white p-6 shadow-xs"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMsg({});
                  start(async () => {
                    const r = await changePasswordAction(pw.cur, pw.next);
                    if (r && !r.ok) {
                      setMsg({
                        pw: r.error === "wrong" ? L("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "Wrong password") : L("យ៉ាងតិច ៨ តួអក្សរ", "At least 8 characters"),
                      });
                    }
                  });
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                      <KeyRound size={16} className="text-[#86622f]" aria-hidden="true" />
                      {L("ប្ដូរពាក្យសម្ងាត់", "Change password")}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {L("យ៉ាងតិច ៨ តួអក្សរ។ ឧបករណ៍ផ្សេងទៀតនឹងត្រូវចាកចេញដោយស្វ័យប្រវត្តិ។", "Minimum 8 characters. Other sessions will be signed out.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-[#faf8f3] hover:text-ink"
                  >
                    {showPw ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    {showPw ? L("លាក់", "Hide") : L("បង្ហាញ", "Show")}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label={L("ពាក្យសម្ងាត់បច្ចុប្បន្ន", "Current password")} htmlFor="pw-c">
                    <Input
                      id="pw-c"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={pw.cur}
                      onChange={(e) => setPw({ ...pw, cur: e.target.value })}
                    />
                  </Field>
                  <Field label={L("ពាក្យសម្ងាត់ថ្មី", "New password")} htmlFor="pw-n">
                    <Input
                      id="pw-n"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
                  {msg.pw ? <span className="text-xs text-danger">{msg.pw}</span> : null}
                  <Button type="submit" variant="outline" className="rounded-xl" disabled={pending || !pw.cur || pw.next.length < 8}>
                    {L("ប្ដូរពាក្យសម្ងាត់", "Update password")}
                  </Button>
                </div>
              </form>

              {/* Sessions & Data Export */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-3xl border border-[#e7e1d5] bg-white p-5 shadow-xs">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{L("ឧបករណ៍ដែលកំពុងភ្ជាប់", "Active sessions")}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {L("ចាកចេញពីឧបករណ៍ផ្សេងទៀតទាំងអស់ លើកលែងឧបករណ៍នេះ។", `Currently ${sessionsCount} active session(s). Sign out all other devices.`)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={pending || sessionsCount <= 1}
                      onClick={() =>
                        start(async () => {
                          const res = await signOutOtherSessionsAction();
                          if (res.ok) {
                            setSessionsCount(1);
                            setMsg({ sessions: L("បានចាកចេញពីឧបករណ៍ផ្សេងៗ", "Signed out other devices") });
                          }
                        })
                      }
                    >
                      <LogOut size={14} aria-hidden="true" />
                      {L("ចាកចេញឧបករណ៍ផ្សេង", "Sign out others")}
                    </Button>
                    {msg.sessions ? <span className="text-xs text-success">{msg.sessions}</span> : null}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-3xl border border-[#e7e1d5] bg-white p-5 shadow-xs">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{L("ទិន្នន័យរបស់អ្នក", "Your data")}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {L("ទាញយកទិន្នន័យទាំងអស់ (JSON)។", "Download everything we store for your account (JSON).")}
                    </p>
                  </div>
                  <div className="mt-4">
                    <a href="/api/account/export" className={buttonClass("outline", "sm", "rounded-xl")}>
                      <Download className="h-4 w-4" />
                      {L("នាំចេញទិន្នន័យ", "Export data")}
                    </a>
                  </div>
                </div>
              </div>

              {/* Danger Zone: Delete Account via Radix Dialog */}
              <div className="flex flex-col justify-between gap-4 rounded-3xl border border-danger/30 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-semibold text-danger">{L("លុបគណនី", "Delete account")}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {L("លុបបញ្ជីភ្ញៀវ និងទិន្នន័យផ្ទាល់ខ្លួនភ្លាមៗ។ មិនអាចត្រឡប់វិញបានទេ។", "Guest lists and personal data are removed immediately. This cannot be undone.")}
                  </p>
                </div>
                <Dialog
                  open={deleteOpen}
                  onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) {
                      setDel("");
                      setMsg({});
                    }
                  }}
                  title={L("លុបគណនីជាអចិន្ត្រៃយ៍?", "Permanently delete account?")}
                  description={L("សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។", "This action removes your account and events permanently.")}
                  trigger={
                    <Button type="button" variant="danger" size="sm" className="shrink-0 rounded-xl">
                      <Trash2 size={14} aria-hidden="true" />
                      {L("លុបគណនី", "Delete account")}
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    <Field label={L("បញ្ចូលពាក្យសម្ងាត់ដើម្បីបញ្ជាក់", "Enter password to confirm")} htmlFor="del-pw">
                      <Input
                        id="del-pw"
                        type="password"
                        value={del}
                        onChange={(e) => setDel(e.target.value)}
                        autoComplete="current-password"
                      />
                    </Field>
                    {msg.del ? <p className="text-xs text-danger">{msg.del}</p> : null}
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className="rounded-xl" disabled={pending}>
                          {L("បោះបង់", "Cancel")}
                        </Button>
                      </DialogClose>
                      <Button
                        type="button"
                        variant="danger"
                        className="rounded-xl"
                        disabled={!del || pending}
                        onClick={() =>
                          start(async () => {
                            const r = await deleteAccountAction(del);
                            if (r && !r.ok) {
                              setMsg({ del: L("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "Wrong password") });
                            }
                          })
                        }
                      >
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {L("បញ្ជាក់ការលុប", "Confirm delete")}
                      </Button>
                    </div>
                  </div>
                </Dialog>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Tabs.Root>
    </div>
  );
}
