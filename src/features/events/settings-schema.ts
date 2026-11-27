import { z } from "zod";

export const EventSettingsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  organizerNotes: z.string().trim().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^(\d{2}:\d{2})?$/),
  timezone: z.string().max(60),
  venueName: z.string().trim().max(200),
  venueAddress: z.string().trim().max(400),
  mapUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//.test(v)),
  rsvpDeadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  allowMaybe: z.boolean(),
  wishesEnabled: z.boolean(),
  isPublic: z.boolean(),
});

export type EventSettingsInput = z.input<typeof EventSettingsSchema>;
