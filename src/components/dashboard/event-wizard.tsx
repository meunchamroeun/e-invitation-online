"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarHeart, Clock3, ImagePlus, LayoutTemplate, Loader2, MapPin, Plus, X, type LucideIcon } from "lucide-react";
import { EVENT_TYPES, type EventType } from "@/features/templates/registry";
import type { MarketTemplate } from "@/features/templates/queries";
import { createEventAction } from "@/features/events/actions";
import { Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { EventTemplatePicker } from "@/components/dashboard/event-template-picker";
import { toKhmerDigits, zonedParts } from "@/i18n/format";
import { cn } from "@/lib/utils";

const STORAGE = "ei:wizard:v1";
const COVER_LIMIT = 8 * 1024 * 1024;
const COVER_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const AGENDA_LIMIT = 30;
const COUPLE_TYPES = new Set<EventType>(["wedding", "engagement", "anniversary"]);

const COPY = {
  events: { km: "កម្មវិធីទាំងអស់", en: "All events" },
  heading: { km: "បង្កើតកម្មវិធីថ្មី", en: "Create an event" },
  details: { km: "ព័ត៌មានកម្មវិធី", en: "Event details" },
  type: { km: "ប្រភេទកម្មវិធី", en: "Event type" },
  title: { km: "ឈ្មោះកម្មវិធី", en: "Event name" },
  titleHint: { km: "ឧ. មង្គលការ សុវណ្ណ និង លក្ខិណា", en: "e.g. Sovann & Lakhena’s wedding" },
  partnerOne: { km: "ឈ្មោះកូនកំលោះ", en: "Groom’s name" },
  partnerTwo: { km: "ឈ្មោះកូនក្រមុំ", en: "Bride’s name" },
  host: { km: "ឈ្មោះម្ចាស់កម្មវិធី (ខ្មែរ)", en: "Host name (Khmer)" },
  hostEn: { km: "ឈ្មោះម្ចាស់កម្មវិធី (អង់គ្លេស)", en: "Host name (English)" },
  combinedKm: { km: "ឈ្មោះរួម (ខ្មែរ)", en: "Combined names (Khmer)" },
  combinedEn: { km: "ឈ្មោះរួម (អង់គ្លេស)", en: "Combined names (English)" },
  translations: { km: "ឈ្មោះរួម ឬឈ្មោះជាភាសាផ្សេង", en: "Combined or translated names" },
  date: { km: "កាលបរិច្ឆេទ", en: "Event date" },
  start: { km: "ម៉ោងចាប់ផ្ដើម", en: "Start time" },
  reception: { km: "ម៉ោងពិសាភោជនាហារ", en: "Reception time" },
  end: { km: "ម៉ោងបញ្ចប់", en: "End time" },
  venueSection: { km: "ទីតាំង និងសារអញ្ជើញ", en: "Venue and invitation message" },
  venue: { km: "ឈ្មោះទីកន្លែង", en: "Venue name" },
  address: { km: "អាសយដ្ឋាន", en: "Address" },
  map: { km: "តំណ Google Maps", en: "Google Maps link" },
  message: { km: "សារអញ្ជើញ", en: "Invitation message" },
  messageHint: { km: "បង្ហាញនៅលើធៀបរបស់ភ្ញៀវ", en: "Shown on the guest invitation" },
  organizerNotes: { km: "កំណត់ចំណាំអ្នករៀបចំ", en: "Organizer notes" },
  organizerNotesHint: { km: "មើលបានតែក្នុងផ្ទាំងគ្រប់គ្រងកម្មវិធី", en: "Visible in event settings only" },
  agenda: { km: "របៀបវារៈកម្មវិធី", en: "Event agenda" },
  agendaIntro: { km: "បន្ថែមសកម្មភាពដែលអ្នកចង់បង្ហាញលើធៀប។", en: "Add activities to show on the invitation." },
  agendaTime: { km: "ម៉ោង", en: "Time" },
  agendaTitle: { km: "សកម្មភាព", en: "Activity" },
  agendaNotes: { km: "កំណត់ចំណាំ", en: "Notes" },
  add: { km: "បន្ថែមសកម្មភាព", en: "Add activity" },
  removeActivity: { km: "លុបសកម្មភាព", en: "Remove activity" },
  cover: { km: "រូបភាពសម្រាប់តំណធៀប", en: "Link preview cover" },
  coverHelp: { km: "បង្ហាញនៅពេលចែករំលែកតំណធៀប។", en: "Appears when you share the invitation link." },
  coverFormats: { km: "JPG, PNG, WebP ឬ GIF រហូតដល់ ៨ MB", en: "JPG, PNG, WebP, or GIF up to 8 MB" },
  coverAlt: { km: "រូបភាពតំណធៀបដែលបានជ្រើសរើស", en: "Selected link preview cover" },
  upload: { km: "ជ្រើសរើសរូបភាព", en: "Choose an image" },
  replace: { km: "ប្ដូររូបភាព", en: "Replace image" },
  removeImage: { km: "ដករូបភាព", en: "Remove image" },
  coverSize: { km: "រូបភាពត្រូវមានទំហំមិនលើស ៨ MB។", en: "Choose an image no larger than 8 MB." },
  coverType: { km: "សូមជ្រើសរើសរូបភាព JPG, PNG, WebP ឬ GIF។", en: "Choose a JPG, PNG, WebP, or GIF image." },
  design: { km: "គំរូធៀប", en: "Invitation design" },
  optional: { km: "ស្រេចចិត្ត", en: "Optional" },
  required: { km: "ត្រូវបំពេញ", en: "Required" },
  cancel: { km: "បោះបង់", en: "Cancel" },
  create: { km: "បង្កើត និងចាប់ផ្ដើមកែធៀប", en: "Create & open builder" },
  creating: { km: "កំពុងបង្កើតកម្មវិធី…", en: "Creating event…" },
  saved: { km: "ព្រាងរក្សាទុកនៅលើឧបករណ៍នេះ", en: "Draft saved on this device" },
  failure: { km: "មិនអាចបង្កើតកម្មវិធីបានទេ។ សូមពិនិត្យព័ត៌មាន ហើយព្យាយាមម្តងទៀត។", en: "Couldn’t create the event. Check the details and try again." },
  errors: {
    plan_events_limit: { km: "អ្នកបានដល់ចំនួនកម្មវិធីអតិបរមានៃកញ្ចប់របស់អ្នក។", en: "You’ve reached your plan’s event limit." },
    host: { km: "សូមបញ្ចូលឈ្មោះម្ចាស់កម្មវិធី។", en: "Enter the host names." },
    invalid_date: { km: "សូមពិនិត្យកាលបរិច្ឆេទ និងម៉ោងកម្មវិធី។", en: "Check the event date and times." },
    cover_too_large: { km: "រូបភាពត្រូវមានទំហំមិនលើស ៨ MB។", en: "Choose an image no larger than 8 MB." },
    invalid_cover: { km: "មិនអាចអានរូបភាពបានទេ។ សូមជ្រើសរើសរូបភាពផ្សេង។", en: "This image couldn’t be read. Choose a different image." },
    template_unavailable: { km: "គំរូនេះមិនអាចប្រើបានទេ។ សូមជ្រើសរើសគំរូផ្សេង។", en: "This design is unavailable. Choose another design." },
  } as Record<string, { km: string; en: string }>,
};

type AgendaEntry = { id: string; time: string; title: string; notes: string };
type Draft = {
  type: EventType;
  title: string;
  hostKm: string;
  hostEn: string;
  partnerOne: string;
  partnerTwo: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  template: string;
  message: string;
  organizerNotes: string;
  agenda: AgendaEntry[];
  legacyHosts: boolean;
  entryTemplate: string;
};

const EMPTY: Draft = {
  type: "wedding", title: "", hostKm: "", hostEn: "", partnerOne: "", partnerTwo: "",
  date: "", startTime: "", endTime: "", venueName: "", venueAddress: "", mapUrl: "",
  template: "", message: "", organizerNotes: "", agenda: [], legacyHosts: false, entryTemplate: "",
};

function readDraft(): Draft {
  const { year, month, day } = zonedParts(new Date());
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const defaults = { ...EMPTY, date: today };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as (Partial<Draft> & { step?: number }) | null;
    if (!stored) return defaults;
    const type = EVENT_TYPES.find((type) => type.value === stored.type)?.value ?? EMPTY.type;
    const agenda = Array.isArray(stored.agenda) ? stored.agenda.slice(0, AGENDA_LIMIT)
      .filter((item) => item && [item.id, item.time, item.title, item.notes].every((value) => typeof value === "string")) : [];
    const { step, ...draft } = stored;
    return {
      ...defaults, ...draft, type, agenda,
      date: draft.date || today,
      legacyHosts: draft.legacyHosts || (step !== undefined && Boolean(draft.hostKm || draft.hostEn)),
    };
  } catch { /* Storage can be unavailable. */ }
  return defaults;
}

function preferredTemplate(templates: MarketTemplate[], type: EventType) {
  const matching = templates.filter((template) => template.category === type);
  return (matching.find((template) => template.tier === "free") ?? matching[0])?.slug ?? "";
}

function FormSection({ id, icon: Icon, title, meta, children }: {
  id: string; icon: LucideIcon; title: string; meta?: string; children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-2">
          <Icon aria-hidden className="size-[18px]" />
        </span>
        <h2 id={id} className="min-w-0 flex-1 font-semibold">{title}</h2>
        {meta ? <span className="text-xs text-muted">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function EventWizard({ locale, templates, initialTemplate }: {
  locale: "km" | "en"; templates: MarketTemplate[]; initialTemplate?: string;
}) {
  const L = (text: { km: string; en: string }) => text[locale];
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverError, setCoverError] = useState("");
  const inputCover = useRef<HTMLInputElement>(null);
  const chooseCover = useRef<HTMLButtonElement>(null);
  const addActivity = useRef<HTMLButtonElement>(null);
  const activityToFocus = useRef<number | null>(null);
  const submitError = useRef<HTMLParagraphElement>(null);
  const submitting = useRef(false);
  const completed = useRef(false);
  const lastInitial = useRef<string | undefined>(undefined);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current && lastInitial.current === initialTemplate) return;
    const stored = readDraft();
    const linked = initialTemplate !== stored.entryTemplate ? templates.find((t) => t.slug === initialTemplate) : undefined;
    const type = linked?.category ?? stored.type;
    initialized.current = true;
    lastInitial.current = initialTemplate;
    setDraft({
      ...stored, type, entryTemplate: initialTemplate ?? "",
      template: linked?.slug ?? (templates.some((t) => t.slug === stored.template && t.category === type)
        ? stored.template : preferredTemplate(templates, type)),
    });
    setReady(true);
  }, [initialTemplate, templates]);

  useEffect(() => {
    if (!ready || completed.current) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(draft));
      setSaved(Boolean(draft.title.trim()));
    } catch { setSaved(false); }
  }, [draft, ready]);

  useEffect(() => {
    if (!cover) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  useEffect(() => {
    if (error) submitError.current?.focus();
  }, [error]);

  useEffect(() => {
    if (activityToFocus.current === null) return;
    document.getElementById(`agenda-time-${activityToFocus.current}`)?.focus();
    activityToFocus.current = null;
  }, [draft.agenda]);

  const update = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
  const couple = COUPLE_TYPES.has(draft.type);
  const retainedHosts = draft.legacyHosts && Boolean(draft.hostKm.trim() || draft.hostEn.trim());
  const requirePair = !retainedHosts || Boolean(draft.partnerOne.trim() || draft.partnerTwo.trim());
  const matchingTemplates = templates.filter((t) => t.category === draft.type);
  const selected = matchingTemplates.find((t) => t.slug === draft.template);
  const category = EVENT_TYPES.find((type) => type.value === draft.type);

  function changeType(type: EventType) {
    update({ type, template: preferredTemplate(templates, type) });
  }

  function changeCover(file: File | undefined) {
    if (inputCover.current) inputCover.current.value = "";
    if (!file) return;
    if (file.size > COVER_LIMIT) return setCoverError(L(COPY.coverSize));
    if (!COVER_TYPES.split(",").includes(file.type) && (file.type || !/\.(jpe?g|png|webp|gif)$/i.test(file.name))) {
      return setCoverError(L(COPY.coverType));
    }
    setCoverError("");
    setCover(file);
  }

  function updateActivity(id: string, next: Partial<AgendaEntry>) {
    setDraft((current) => ({
      ...current,
      agenda: current.agenda.map((item) => item.id === id ? { ...item, ...next } : item),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    const form = cover ? new FormData() : undefined;
    if (cover) form?.set("cover", cover);
    try {
      const result = await createEventAction({
        type: draft.type, title: draft.title, hostKm: draft.hostKm, hostEn: draft.hostEn,
        partnerOne: couple ? draft.partnerOne : "", partnerTwo: couple ? draft.partnerTwo : "",
        date: draft.date, startTime: draft.startTime, endTime: draft.endTime, timezone: "Asia/Phnom_Penh",
        venueName: draft.venueName, venueAddress: draft.venueAddress, mapUrl: draft.mapUrl, template: draft.template,
        message: draft.message, organizerNotes: draft.organizerNotes, locale,
        agenda: draft.agenda.filter(({ time, title, notes }) => time || title.trim() || notes.trim())
          .map(({ time, title, notes }) => ({ time, title, notes })),
      }, form);
      if (result.ok) {
        completed.current = true;
        try { localStorage.removeItem(STORAGE); } catch { /* Storage can be unavailable. */ }
        router.push(`/dashboard/events/${(result.data as { id: string }).id}/builder`);
        return;
      }
      setError(L(COPY.errors[result.error] ?? COPY.failure));
    } catch {
      setError(L(COPY.failure));
    } finally {
      if (!completed.current) {
        submitting.current = false;
        setPending(false);
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="mb-6 border-b border-line-2 pb-5 sm:mb-7">
        <Link href="/dashboard/events" className="inline-flex items-center gap-2 rounded text-sm font-medium text-ink-2 hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          {L(COPY.events)}
        </Link>
        <h1 className={cn("mt-3 text-3xl font-semibold sm:text-4xl", locale === "en" && "font-cormorant text-[2.7rem] leading-none sm:text-5xl")}>{L(COPY.heading)}</h1>
      </header>

      <form id="event-create-form" onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={!ready || pending} className="min-w-0">
          <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.55fr)]">
            <div className="grid min-w-0 gap-4 sm:gap-5">
              <FormSection id="event-details" icon={CalendarHeart} title={L(COPY.details)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={L(COPY.title)} hint={L(COPY.required)} htmlFor="title">
                    <Input id="title" required maxLength={160} value={draft.title} placeholder={L(COPY.titleHint)} onChange={(e) => update({ title: e.target.value })} />
                  </Field>
                  <Field label={L(COPY.type)} htmlFor="event-type">
                    <Select id="event-type" className="appearance-auto bg-none" value={draft.type} onChange={(e) => changeType(e.target.value as EventType)}>
                      {EVENT_TYPES.map((type) => <option key={type.value} value={type.value}>{L(type.label)}</option>)}
                    </Select>
                  </Field>
                  {couple ? (
                    <>
                      <Field label={L(COPY.partnerOne)} hint={requirePair ? L(COPY.required) : undefined} htmlFor="partner-one">
                        <Input id="partner-one" required={requirePair} maxLength={160} value={draft.partnerOne} onChange={(e) => update({ partnerOne: e.target.value })} />
                      </Field>
                      <Field label={L(COPY.partnerTwo)} hint={requirePair ? L(COPY.required) : undefined} htmlFor="partner-two">
                        <Input id="partner-two" required={requirePair} maxLength={160} value={draft.partnerTwo} onChange={(e) => update({ partnerTwo: e.target.value })} />
                      </Field>
                      <details open={retainedHosts || undefined} className="min-w-0 rounded-xl border border-line bg-paper px-3 py-2 sm:col-span-2">
                        <summary className="cursor-pointer text-sm text-ink-2">{L(COPY.translations)}</summary>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <Field label={L(COPY.combinedKm)} htmlFor="hk">
                            <Input id="hk" lang="km" value={draft.hostKm} maxLength={160} onChange={(e) => update({ hostKm: e.target.value })} />
                          </Field>
                          <Field label={L(COPY.combinedEn)} htmlFor="he">
                            <Input id="he" lang="en" value={draft.hostEn} maxLength={160} onChange={(e) => update({ hostEn: e.target.value })} />
                          </Field>
                        </div>
                      </details>
                    </>
                  ) : (
                    <>
                      <Field label={L(COPY.host)} htmlFor="hk">
                        <Input id="hk" lang="km" required={!draft.hostEn.trim()} value={draft.hostKm} maxLength={160} onChange={(e) => update({ hostKm: e.target.value })} />
                      </Field>
                      <Field label={L(COPY.hostEn)} htmlFor="he">
                        <Input id="he" lang="en" required={!draft.hostKm.trim()} value={draft.hostEn} maxLength={160} onChange={(e) => update({ hostEn: e.target.value })} />
                      </Field>
                    </>
                  )}
                </div>
                <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
                  <Field label={L(COPY.date)} hint={L(COPY.required)} htmlFor="date">
                    <Input id="date" type="date" required value={draft.date} onChange={(e) => update({ date: e.target.value })} />
                  </Field>
                  <Field label={L(couple ? COPY.reception : COPY.start)} hint={L(COPY.required)} htmlFor="st">
                    <Input id="st" type="time" required value={draft.startTime} onChange={(e) => update({ startTime: e.target.value })} />
                  </Field>
                  <Field label={L(COPY.end)} hint={L(COPY.optional)} htmlFor="et">
                    <Input id="et" type="time" value={draft.endTime} onChange={(e) => update({ endTime: e.target.value })} />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-muted">Asia/Phnom_Penh</p>
              </FormSection>

              <FormSection id="event-venue" icon={MapPin} title={L(COPY.venueSection)} meta={L(COPY.optional)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={L(COPY.venue)} htmlFor="vn">
                    <Input id="vn" value={draft.venueName} maxLength={200} onChange={(e) => update({ venueName: e.target.value })} />
                  </Field>
                  <Field label={L(COPY.address)} htmlFor="va">
                    <Input id="va" value={draft.venueAddress} maxLength={400} onChange={(e) => update({ venueAddress: e.target.value })} />
                  </Field>
                  <Field label={L(COPY.map)} htmlFor="mu" className="sm:col-span-2">
                    <Input id="mu" type="url" pattern="https://.+" placeholder="https://maps.google.com/…" value={draft.mapUrl} maxLength={500} onChange={(e) => update({ mapUrl: e.target.value })} />
                  </Field>
                  <Field label={L(COPY.message)} htmlFor="event-message" className="sm:col-span-2">
                    <Textarea id="event-message" aria-describedby="event-message-hint" rows={3} maxLength={2000} value={draft.message} onChange={(e) => update({ message: e.target.value })} />
                    <p id="event-message-hint" className="mt-1 text-xs text-ink-2">{L(COPY.messageHint)}</p>
                  </Field>
                  <Field label={L(COPY.organizerNotes)} htmlFor="organizer-notes" className="sm:col-span-2">
                    <Textarea id="organizer-notes" aria-describedby="organizer-notes-hint" rows={3} maxLength={2000}
                      value={draft.organizerNotes} onChange={(e) => update({ organizerNotes: e.target.value })} />
                    <p id="organizer-notes-hint" className="mt-1 text-xs text-ink-2">{L(COPY.organizerNotesHint)}</p>
                  </Field>
                </div>
              </FormSection>

              <FormSection id="event-agenda" icon={Clock3} title={L(COPY.agenda)} meta={L(COPY.optional)}>
                {draft.agenda.length === 0 ? <p className="mb-4 text-sm text-muted">{L(COPY.agendaIntro)}</p> : null}
                {draft.agenda.length > 0 ? (
                  <div className="mb-4 grid gap-3">
                    {draft.agenda.map((item, index) => {
                      const number = index + 1;
                      const displayNumber = locale === "km" ? toKhmerDigits(number) : number;
                      const removeLabel = `${L(COPY.removeActivity)} ${displayNumber}`;
                      return (
                        <div key={item.id} role="group" aria-label={`${L(COPY.agendaTitle)} ${displayNumber}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-3 rounded-xl border border-line bg-paper p-3">
                          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)]">
                            <Field label={L(COPY.agendaTime)} htmlFor={`agenda-time-${number}`}>
                              <Input id={`agenda-time-${number}`} type="time" value={item.time} required={Boolean(item.title.trim() || item.notes.trim())} onChange={(e) => updateActivity(item.id, { time: e.target.value })} />
                            </Field>
                            <Field label={L(COPY.agendaTitle)} htmlFor={`agenda-title-${number}`}>
                              <Input id={`agenda-title-${number}`} value={item.title} required={Boolean(item.time || item.notes.trim())} maxLength={160} onChange={(e) => updateActivity(item.id, { title: e.target.value })} />
                            </Field>
                          </div>
                          <Button type="button" variant="ghost" className="mt-6 size-10 px-0 text-muted hover:text-danger" aria-label={removeLabel} title={removeLabel}
                            onClick={() => {
                              if (draft.agenda.length === 1) addActivity.current?.focus();
                              else activityToFocus.current = Math.min(number, draft.agenda.length - 1);
                              update({ agenda: draft.agenda.filter((row) => row.id !== item.id) });
                            }}><X aria-hidden className="size-4" /></Button>
                          <Field label={L(COPY.agendaNotes)} htmlFor={`agenda-notes-${number}`} className="col-span-2">
                            <Input id={`agenda-notes-${number}`} value={item.notes} maxLength={500} onChange={(e) => updateActivity(item.id, { notes: e.target.value })} />
                          </Field>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <Button ref={addActivity} type="button" variant="outline" disabled={draft.agenda.length >= AGENDA_LIMIT}
                  onClick={() => {
                    activityToFocus.current = draft.agenda.length + 1;
                    update({ agenda: [...draft.agenda, { id: crypto.randomUUID(), time: "", title: "", notes: "" }] });
                  }}>
                  <Plus aria-hidden className="size-4" />
                  {L(COPY.add)}
                </Button>
              </FormSection>
            </div>

            <div className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-1">
              <FormSection id="event-cover-heading" icon={ImagePlus} title={L(COPY.cover)} meta={L(COPY.optional)}>
                <div className="relative isolate grid aspect-[1.91] place-items-center overflow-hidden rounded-xl border border-dashed border-line-2 bg-paper">
                  {coverPreview ? (
                    // Blob URLs are local previews and do not need image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt={L(COPY.coverAlt)} className="absolute inset-0 size-full object-cover" />
                  ) : <ImagePlus aria-hidden className="size-8 text-gold-2" />}
                </div>
                <div id="event-cover-hint" className="mt-3 space-y-1 text-sm text-ink-2">
                  <p>{L(COPY.coverHelp)}</p>
                  <p className="text-xs">{L(COPY.coverFormats)}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input id="event-cover" ref={inputCover} type="file" accept={COVER_TYPES} hidden onChange={(e) => changeCover(e.currentTarget.files?.[0])} />
                  <Button ref={chooseCover} type="button" variant="outline" aria-describedby="event-cover-hint" onClick={() => inputCover.current?.click()}>
                    {L(cover ? COPY.replace : COPY.upload)}
                  </Button>
                  {cover ? <Button type="button" variant="ghost" onClick={() => {
                    setCover(null);
                    setCoverError("");
                    chooseCover.current?.focus();
                  }}>{L(COPY.removeImage)}</Button> : null}
                </div>
                {coverError ? <p role="alert" className="mt-2 text-sm text-danger">{coverError}</p> : null}
              </FormSection>

              <FormSection id="event-design" icon={LayoutTemplate} title={L(COPY.design)}>
                <EventTemplatePicker locale={locale} category={category ? L(category.label) : ""} templates={matchingTemplates}
                  value={draft.template} onChange={(template) => update({ template })} />
              </FormSection>
            </div>
          </div>

          {error ? <p ref={submitError} tabIndex={-1} role="alert" className="mt-5 rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line-2 pt-5">
            {saved ? <span className="mr-auto w-full text-xs text-muted sm:w-auto">{L(COPY.saved)}</span> : null}
            <Link href="/dashboard/events" className={buttonClass("ghost")}>{L(COPY.cancel)}</Link>
            <Button disabled={!selected} type="submit" className="min-w-0">
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {L(pending ? COPY.creating : COPY.create)}
              {!pending ? <ArrowRight aria-hidden className="size-4" /> : null}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
