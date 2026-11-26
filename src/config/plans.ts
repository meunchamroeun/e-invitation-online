import type { PlanLimits } from "@/lib/db/schema";

/** Default plan catalogue. Prices are starting values only — admins edit them in /admin/plans. */
export const DEFAULT_PLANS: { code: string; nameKm: string; nameEn: string; priceMinor: number; limits: PlanLimits; features: string[]; sort: number }[] = [
  {
    code: "free", nameKm: "ឥតគិតថ្លៃ", nameEn: "Free", priceMinor: 0, sort: 0,
    limits: { maxEvents: 1, maxGuestsPerEvent: 50, maxPhotos: 6, premiumTemplates: false, seating: false, checkin: false, telegram: false, finance: false, branding: true },
    features: ["free_templates", "personal_links", "rsvp", "guest_list"],
  },
  {
    code: "standard", nameKm: "ស្តង់ដារ", nameEn: "Standard", priceMinor: 2900, sort: 1,
    limits: { maxEvents: 3, maxGuestsPerEvent: 400, maxPhotos: 20, premiumTemplates: true, seating: false, checkin: false, telegram: true, finance: false, branding: false },
    features: ["premium_templates", "personal_links", "rsvp", "guest_import", "telegram", "basic_analytics"],
  },
  {
    code: "premium", nameKm: "ពិសេស", nameEn: "Premium", priceMinor: 7900, sort: 2,
    limits: { maxEvents: 10, maxGuestsPerEvent: 1000, maxPhotos: 40, premiumTemplates: true, seating: true, checkin: true, telegram: true, finance: true, branding: false },
    features: ["all_templates", "seating", "checkin", "gifts_budget", "telegram", "advanced_analytics", "music"],
  },
  {
    code: "business", nameKm: "អាជីវកម្ម", nameEn: "Business", priceMinor: 19900, sort: 3,
    limits: { maxEvents: 100, maxGuestsPerEvent: 3000, maxPhotos: 60, premiumTemplates: true, seating: true, checkin: true, telegram: true, finance: true, branding: false },
    features: ["everything", "team", "white_label", "custom_domain", "agency"],
  },
];

export const PLAN_FEATURE_LABELS: Record<string, { km: string; en: string }> = {
  free_templates: { km: "គំរូឥតគិតថ្លៃ", en: "Free templates" },
  premium_templates: { km: "គំរូពិសេស", en: "Premium templates" },
  all_templates: { km: "គំរូទាំងអស់", en: "Every template" },
  personal_links: { km: "តំណភ្ញៀវផ្ទាល់ខ្លួន", en: "Personal guest links" },
  rsvp: { km: "RSVP", en: "RSVP" },
  guest_list: { km: "បញ្ជីភ្ញៀវ", en: "Guest list" },
  guest_import: { km: "នាំចូលភ្ញៀវពី CSV", en: "CSV guest import" },
  telegram: { km: "ជូនដំណឹង Telegram", en: "Telegram alerts" },
  basic_analytics: { km: "ស្ថិតិមូលដ្ឋាន", en: "Basic analytics" },
  advanced_analytics: { km: "ស្ថិតិលម្អិត", en: "Advanced analytics" },
  seating: { km: "រៀបចំតុ", en: "Seating planner" },
  checkin: { km: "Check-in ដោយ QR", en: "QR check-in" },
  gifts_budget: { km: "ចំណងដៃ និងថវិកា", en: "Gifts & budget" },
  music: { km: "ភ្លេងផ្ទៃខាងក្រោយ", en: "Background music" },
  everything: { km: "គ្រប់មុខងារពិសេស", en: "Everything in Premium" },
  team: { km: "សមាជិកក្រុម", en: "Team members" },
  white_label: { km: "គ្មានស្លាកយីហោ", en: "White label" },
  custom_domain: { km: "ដូមេនផ្ទាល់ខ្លួន", en: "Custom domain" },
  agency: { km: "គ្រប់គ្រងអតិថិជនច្រើន", en: "Agency management" },
};
