"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Archive, ArrowUpRight, BadgeCheck, CircleAlert, PencilLine, RotateCcw } from "lucide-react";
import type { ActionResult } from "@/features/events/actions";
import {
  reviewBillingAction,
  setEventArchivedAction,
  setUserPlanAction,
  setUserRoleAction,
  setUserSuspendedAction,
  updatePlanAction,
  updateTemplateFlagsAction,
} from "@/features/admin/actions";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { adminCell, adminRow } from "./admin-table";
import { AdminRowQuickMenu, AdminSwitchOption } from "./admin-ui";

const failureMessages: Record<string, string> = {
  already_reviewed: "This payment was already reviewed.",
  invalid: "Check the values you entered and try again.",
  not_found: "This record is no longer available.",
  non_manual: "Only manual payments can be reviewed here.",
  event_state_changed: "This event changed. Reload the page and try again.",
  forbidden: "Your account no longer has permission to make this change.",
  plan: "This plan is unavailable.",
  self: "You cannot change your own role or suspend your account.",
  suspended: "Restore this account before granting administration access.",
};

type Feedback = { ok: boolean; label: string };

function useAdminMutation() {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const run = (action: () => Promise<ActionResult>, message: string) => {
    setFeedback(null);
    start(async () => {
      try {
        const result = await action();
        setFeedback(result.ok ? { ok: true, label: message } : { ok: false, label: failureMessages[result.error] ?? "The change could not be saved. Refresh and try again." });
      } catch {
        setFeedback({ ok: false, label: "The change could not be saved. Refresh and try again." });
      }
    });
  };
  return { pending, feedback, clear: () => setFeedback(null), run };
}

function AdminFeedback({ value }: { value: Feedback | null }) {
  if (!value) return null;
  const Icon = value.ok ? BadgeCheck : CircleAlert;
  return (
    <p role={value.ok ? "status" : "alert"} className={`flex items-start gap-2 text-sm ${value.ok ? "text-[#116647]" : "text-[#a23436]"}`}>
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {value.label}
    </p>
  );
}

type User = { id: string; name: string; email: string; createdAt: string; planCode: string; role: string; deleted: boolean; suspended: boolean };
type PlanOption = { code: string; name: string; active: boolean };

function UserSettings({ user, plans, isSelf }: { user: User; plans: PlanOption[]; isSelf: boolean }) {
  const id = useId();
  const [plan, setPlan] = useState(user.planCode);
  const [role, setRole] = useState<"super_admin" | "user">(user.role === "super_admin" ? "super_admin" : "user");
  const [savedPlan, setSavedPlan] = useState(user.planCode);
  const [savedRole, setSavedRole] = useState(role);
  const [suspended, setSuspended] = useState(user.suspended);
  const [confirmAccess, setConfirmAccess] = useState(false);
  const planMutation = useAdminMutation();
  const roleMutation = useAdminMutation();
  const accessMutation = useAdminMutation();
  const busy = planMutation.pending || roleMutation.pending || accessMutation.pending;
  const activePlans = plans.filter((option) => option.active);

  return (
    <div className="divide-y divide-line">
      <form className="space-y-2 pb-4" onSubmit={(e) => {
        e.preventDefault();
        planMutation.run(async () => {
          const result = await setUserPlanAction(user.id, plan);
          if (result.ok) setSavedPlan(plan);
          return result;
        }, "Plan updated.");
      }}>
        <Field label="Subscription plan" htmlFor={`${id}-plan`}>
          <div className="flex items-center gap-2">
            <Select id={`${id}-plan`} value={plan} onChange={(e) => { setPlan(e.target.value); planMutation.clear(); }} disabled={busy}>
              {!activePlans.some((option) => option.code === savedPlan) ? <option value={savedPlan} disabled>{plans.find((option) => option.code === savedPlan)?.name ?? savedPlan} (current)</option> : null}
              {activePlans.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
            </Select>
            <Button type="submit" className="h-11 rounded-lg" disabled={busy || plan === savedPlan}>{planMutation.pending ? "Saving…" : "Save plan"}</Button>
          </div>
        </Field>
        <AdminFeedback value={planMutation.feedback} />
      </form>

      <form className="space-y-2 py-4" onSubmit={(e) => {
        e.preventDefault();
        roleMutation.run(async () => {
          const result = await setUserRoleAction(user.id, role);
          if (result.ok) setSavedRole(role);
          return result;
        }, "Role updated.");
      }}>
        <Field label="System role" htmlFor={`${id}-role`}>
          <div className="flex items-center gap-2">
            <Select id={`${id}-role`} value={role} onChange={(e) => { setRole(e.target.value === "super_admin" ? "super_admin" : "user"); roleMutation.clear(); }} disabled={busy || isSelf}>
              <option value="user">User</option>
              <option value="super_admin" disabled={suspended}>Super admin</option>
            </Select>
            <Button type="submit" variant="outline" className="h-11 rounded-lg" disabled={busy || isSelf || role === savedRole}>{roleMutation.pending ? "Saving…" : "Save role"}</Button>
          </div>
        </Field>
        {isSelf ? <p className="text-xs text-muted">Your role and sign-in access are protected here.</p> : null}
        {!isSelf && role !== savedRole ? <p className="text-xs leading-relaxed text-[#8a5729]">{role === "super_admin" ? "Saving this role grants full administration access." : "Saving this role removes administration access."}</p> : null}
        <AdminFeedback value={roleMutation.feedback} />
      </form>

      {isSelf ? null : (
        <div className="space-y-2 pt-4">
          <p className="text-[13px] font-medium text-ink-2">Sign-in access</p>
          <p className="text-sm text-muted">
            {suspended ? "Restoring access allows this user to sign in again." : "Suspending this account signs the user out and blocks new sign-ins."}
          </p>
          {confirmAccess ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={suspended ? "primary" : "danger"} className="rounded-lg" disabled={busy} onClick={() => {
                accessMutation.run(async () => {
                  const result = await setUserSuspendedAction(user.id, !suspended);
                  if (result.ok) {
                    setSuspended(!suspended);
                    setConfirmAccess(false);
                  }
                  return result;
                }, suspended ? "Account access restored." : "Account suspended.");
              }}>{accessMutation.pending ? "Saving…" : suspended ? "Confirm restore" : "Confirm suspension"}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-lg" disabled={busy} onClick={() => setConfirmAccess(false)}>Cancel</Button>
            </div>
          ) : <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={() => { accessMutation.clear(); setConfirmAccess(true); }}>{suspended ? "Restore account" : "Suspend account"}</Button>}
          <AdminFeedback value={accessMutation.feedback} />
        </div>
      )}
    </div>
  );
}

export function AdminUserRow({ user, plans, isSelf }: { user: User; plans: PlanOption[]; isSelf: boolean }) {
  return (
    <tr className={adminRow}>
      <td className={adminCell}>
        <p className="max-w-[16rem] min-w-28 break-words font-semibold sm:max-w-none" dir="auto">{user.name} {isSelf ? <span className="ml-1 text-xs font-normal text-muted">(you)</span> : null}</p>
        <p className="mt-0.5 max-w-[15rem] break-all text-xs text-muted">{user.email}</p>
      </td>
      <td className={`${adminCell} whitespace-nowrap text-muted`}>{user.createdAt}</td>
      <td className={adminCell}>{plans.find((plan) => plan.code === user.planCode)?.name ?? user.planCode}</td>
      <td className={`${adminCell} whitespace-nowrap`}>{user.role === "super_admin" ? "Super admin" : "User"}</td>
      <td className={adminCell}>
        <Badge tone={user.deleted ? "danger" : user.suspended ? "warning" : "success"}>{user.deleted ? "Deleted" : user.suspended ? "Suspended" : "Active"}</Badge>
      </td>
      <td className={`${adminCell} text-right`}>
        <div className="flex items-center justify-end gap-1.5">
          {user.deleted ? <span className="text-xs whitespace-nowrap text-muted">Read only</span> : (
            <Dialog title={`Manage ${user.name}`} description={user.email} trigger={<Button type="button" variant="outline" size="sm" className="rounded-lg" aria-label={`Manage ${user.email}`}><PencilLine size={14} aria-hidden="true" /> Manage</Button>}>
              <UserSettings user={user} plans={plans} isSelf={isSelf} />
            </Dialog>
          )}
          <AdminRowQuickMenu
            label={`More actions for ${user.email}`}
            items={[
              { kind: "link", label: "View user events", href: `/admin/events?q=${encodeURIComponent(user.email)}` },
              { kind: "copy", label: "Copy email", value: user.email },
              { kind: "copy", label: "Copy user ID", value: user.id },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}

export function AdminEventAction({ id, title, archived }: { id: string; title: string; archived: boolean }) {
  const { run, clear, feedback, pending } = useAdminMutation();
  const [intent, setIntent] = useState(archived);
  const action = intent ? "Restore event" : "Archive event";
  const done = feedback?.ok;
  const Icon = archived ? RotateCcw : Archive;
  return (
    <Dialog title={action} description={title} onOpenChange={(open) => { if (open) { setIntent(archived); clear(); } }} trigger={<Button type="button" variant="outline" size="sm" className="rounded-lg" aria-label={`${archived ? "Restore" : "Archive"} ${title}`}><Icon size={14} aria-hidden="true" /> {archived ? "Restore" : "Archive"}</Button>}>
      <p className="mb-4 text-sm leading-relaxed text-ink-2">
        {intent ? "Restore the event to its previous status. Invitations become available again if the event was published." : "Archive this event to disable its invitation links and prevent publishing until an admin restores it. Its event data will be retained."}
      </p>
      <AdminFeedback value={feedback} />
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline" className="rounded-lg" disabled={pending}>{done ? "Done" : "Cancel"}</Button></DialogClose>
        {!done ? <Button type="button" variant={intent ? "primary" : "danger"} className="rounded-lg" disabled={pending} onClick={() => run(() => setEventArchivedAction(id, !intent), intent ? "Event restored." : "Event archived.")}>{pending ? "Saving…" : action}</Button> : null}
      </div>
    </Dialog>
  );
}

type Template = { slug: string; name: string; nameKm: string; category: string; version: number; tier: "free" | "premium"; isPublished: boolean; isFeatured: boolean; preview: boolean };

function TemplateSettings({ template }: { template: Template }) {
  const id = useId();
  const { run, feedback, pending, clear } = useAdminMutation();
  return (
    <form className="space-y-4" onChange={clear} onSubmit={(e) => {
      e.preventDefault();
      const fields = new FormData(e.currentTarget);
      run(() => updateTemplateFlagsAction(template.slug, {
        tier: fields.get("tier") === "premium" ? "premium" : "free",
        isPublished: fields.has("published"),
        isFeatured: fields.has("featured"),
      }), "Template updated.");
    }}>
      <Field label="Access tier" htmlFor={id}>
        <Select name="tier" id={id} defaultValue={template.tier} disabled={pending}>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </Select>
      </Field>
      <CheckOption name="published" label="Available in template catalog" defaultChecked={template.isPublished} disabled={pending} />
      <CheckOption name="featured" label="Feature in the template catalog" defaultChecked={template.isFeatured} disabled={pending} />
      <AdminFeedback value={feedback} />
      <div className="flex flex-wrap justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline" className="rounded-lg" disabled={pending}>Close</Button></DialogClose>
        <Button type="submit" className="rounded-lg" disabled={pending || !!feedback?.ok}>{pending ? "Saving…" : "Save template"}</Button>
      </div>
    </form>
  );
}

export function AdminTemplateRow({ template }: { template: Template }) {
  return (
    <tr className={adminRow}>
      <td className={adminCell}>
        <p className="font-semibold">{template.name}</p>
        <p className="mt-0.5 text-xs text-muted" lang="km">{template.nameKm}</p>
      </td>
      <td className={adminCell}>{template.category}</td>
      <td className={`${adminCell} num`}>v{template.version}</td>
      <td className={adminCell}><Badge tone={template.tier === "premium" ? "gold" : "neutral"}>{template.tier === "premium" ? "Premium" : "Free"}</Badge></td>
      <td className={adminCell}>
        <div className="flex flex-wrap gap-1"><Badge tone={template.isPublished ? "success" : "neutral"}>{template.isPublished ? "Published" : "Hidden"}</Badge>{template.isFeatured ? <Badge tone="gold">Featured</Badge> : null}</div>
      </td>
      <td className={adminCell}>
        <div className="flex items-center justify-end gap-1">
          {template.preview ? <Link href={`/t/${template.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${template.name} (opens in a new tab)`} className="grid size-8 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-paper"><ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
          <Dialog title={`Edit ${template.name}`} description="Change catalog visibility, promotion, and access tier." trigger={<Button type="button" variant="outline" size="sm" className="rounded-lg" aria-label={`Edit ${template.name}`}><PencilLine size={14} aria-hidden="true" /> Edit</Button>}>
            <TemplateSettings template={template} />
          </Dialog>
        </div>
      </td>
    </tr>
  );
}

function CheckOption({ name, label, defaultChecked, disabled }: { name: string; label: string; defaultChecked: boolean; disabled: boolean }) {
  return (
    <label className="flex min-h-9 items-center gap-2.5 rounded-lg text-sm text-ink-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="size-4 shrink-0 accent-[#86622f]" />
      {label}
    </label>
  );
}

type PlanForm = { code: string; nameKm: string; nameEn: string; priceMinor: number; isActive: boolean; maxEvents: number; maxGuestsPerEvent: number; maxPhotos: number; premiumTemplates: boolean; seating: boolean; checkin: boolean; telegram: boolean; finance: boolean; branding: boolean };

const planLimits = [
  { key: "maxEvents", title: "Maximum events", max: 10_000 },
  { key: "maxGuestsPerEvent", title: "Guests per event", max: 100_000 },
  { key: "maxPhotos", title: "Maximum photos", max: 500 },
] as const;
const planFeatures = [
  ["premiumTemplates", "Premium templates"],
  ["seating", "Seating planner"],
  ["checkin", "Guest check-in"],
  ["telegram", "Telegram alerts"],
  ["finance", "Event finance"],
  ["branding", "Branding"],
] as const;

export function AdminPlanForm({ plan }: { plan: PlanForm }) {
  const id = useId();
  const { run, feedback, pending, clear } = useAdminMutation();
  const isDefaultPlan = plan.code === "free";
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    run(() => updatePlanAction(plan.code, {
      nameKm: String(values.get("nameKm") ?? ""),
      nameEn: String(values.get("nameEn") ?? ""),
      priceMinor: Number(values.get("priceMinor")),
      maxEvents: Number(values.get("maxEvents")),
      maxGuestsPerEvent: Number(values.get("maxGuestsPerEvent")),
      maxPhotos: Number(values.get("maxPhotos")),
      premiumTemplates: values.has("premiumTemplates"),
      seating: values.has("seating"),
      checkin: values.has("checkin"),
      telegram: values.has("telegram"),
      finance: values.has("finance"),
      branding: values.has("branding"),
      isActive: isDefaultPlan || values.has("isActive"),
    }), "Plan saved.");
  };

  return (
    <form className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white" onSubmit={submit} onChange={clear}>
      <header className="flex items-center justify-between gap-3 border-b border-line bg-[#faf8f3] p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">{plan.nameEn}</h2>
          <p lang="km" className="text-sm text-muted">{plan.nameKm}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={plan.isActive ? "success" : "neutral"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
          <p className="num text-sm font-semibold">{formatMoney(plan.priceMinor, "USD")}</p>
        </div>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="English name" htmlFor={`${id}-en`}>
            <Input id={`${id}-en`} name="nameEn" defaultValue={plan.nameEn} maxLength={60} required disabled={pending} />
          </Field>
          <Field label="Khmer name" htmlFor={`${id}-km`}>
            <Input id={`${id}-km`} name="nameKm" lang="km" defaultValue={plan.nameKm} maxLength={60} required disabled={pending} />
          </Field>
          <Field label="Price (USD cents)" htmlFor={`${id}-price`}>
            <Input id={`${id}-price`} name="priceMinor" type="number" defaultValue={plan.priceMinor} min={0} max={10_000_000} step={1} required disabled={pending} />
          </Field>
          {planLimits.map(({ key, title, max }) => (
            <Field key={key} label={title} htmlFor={`${id}-${key}`}>
              <Input type="number" id={`${id}-${key}`} name={key} defaultValue={plan[key]} min={0} max={max} step={1} required disabled={pending} />
            </Field>
          ))}
        </div>
        <fieldset className="border-t border-line pt-3">
          <legend className="pr-2 text-sm font-semibold">Features</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {planFeatures.map(([key, label]) => <AdminSwitchOption key={key} name={key} label={label} defaultChecked={plan[key]} disabled={pending} />)}
          </div>
        </fieldset>
        <div className="space-y-2">
          <AdminSwitchOption name="isActive" label="Active plan" defaultChecked={isDefaultPlan || plan.isActive} disabled={pending || isDefaultPlan} />
          <p className="text-xs leading-relaxed text-muted">
            {isDefaultPlan ? "The free plan stays active because it is the default." : "Inactive plans are unavailable for assignment and purchase. Existing accounts on those plans fall back to the default plan."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <AdminFeedback value={feedback} />
        <Button type="submit" className="ml-auto rounded-lg" disabled={pending || !!feedback?.ok}>{pending ? "Saving…" : "Save plan"}</Button>
      </div>
    </form>
  );
}

function BillingReviewForm({ id, approvalBlock }: { id: string; approvalBlock: string | null }) {
  const fieldId = useId();
  const [decision, setDecision] = useState("");
  const { run, pending, feedback, clear } = useAdminMutation();
  const done = feedback?.ok;
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (decision !== "approved" && decision !== "rejected") return;
      const note = String(new FormData(e.currentTarget).get("note") ?? "");
      run(() => reviewBillingAction(id, decision, note), decision === "approved" ? "Payment approved and the plan is active." : "Payment rejected.");
    }}>
      {!done ? (
        <>
          {approvalBlock ? <p className="text-sm leading-relaxed text-[#8a5729]">{approvalBlock} You can still reject the request.</p> : null}
          <Field label="Decision" htmlFor={`${fieldId}-decision`}>
            <Select id={`${fieldId}-decision`} value={decision} required disabled={pending} onChange={(e) => { setDecision(e.target.value); clear(); }}>
              <option value="">Choose a decision</option>
              <option value="approved" disabled={!!approvalBlock}>Approve and activate plan</option>
              <option value="rejected">Reject payment</option>
            </Select>
          </Field>
          <Field label="Review note" hint="Optional" htmlFor={`${fieldId}-note`}>
            <Textarea name="note" id={`${fieldId}-note`} maxLength={500} disabled={pending} />
          </Field>
        </>
      ) : null}
      <AdminFeedback value={feedback} />
      <div className="flex flex-wrap justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline" className="rounded-lg" disabled={pending}>{done ? "Done" : "Cancel"}</Button></DialogClose>
        {!done ? <Button type="submit" variant={decision === "rejected" ? "danger" : "primary"} className="rounded-lg" disabled={pending || !decision || (decision === "approved" && !!approvalBlock)}>{pending ? "Saving…" : decision === "rejected" ? "Reject payment" : "Approve payment"}</Button> : null}
      </div>
    </form>
  );
}

export function AdminBillingReview({ id, reference, amount, approvalBlock }: { id: string; reference: string | null; amount: string; approvalBlock: string | null }) {
  return (
    <Dialog title="Review payment" description={`Verify the ${amount} payment in your bank app${reference ? ` using reference ${reference}` : ""} before approving.`} trigger={<Button variant="outline" type="button" size="sm" className="rounded-lg" aria-label={reference ? `Review payment ${reference}` : "Review payment"}>Review</Button>}>
      <BillingReviewForm id={id} approvalBlock={approvalBlock} />
    </Dialog>
  );
}
