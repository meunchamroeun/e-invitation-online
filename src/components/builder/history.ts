import type { InvitationDoc } from "@/features/invitations/doc";

/** Editor history: real undo/redo with coalescing of rapid typing into one step. Pure — unit tested. */
export type History = { past: InvitationDoc[]; present: InvitationDoc; future: InvitationDoc[]; lastKey: string | null; lastAt: number };

export type HistoryAction =
  | { type: "set"; doc: InvitationDoc; key?: string; at?: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: InvitationDoc };

const LIMIT = 100;
const COALESCE_MS = 800;

export function initHistory(doc: InvitationDoc): History {
  return { past: [], present: doc, future: [], lastKey: null, lastAt: 0 };
}

export function historyReducer(h: History, a: HistoryAction): History {
  switch (a.type) {
    case "set": {
      const at = a.at ?? Date.now();
      // Same field edited again within a short window → replace instead of push (typing a word = one undo step).
      if (a.key && a.key === h.lastKey && at - h.lastAt < COALESCE_MS) return { ...h, present: a.doc, future: [], lastAt: at };
      return { past: [...h.past, h.present].slice(-LIMIT), present: a.doc, future: [], lastKey: a.key ?? null, lastAt: at };
    }
    case "undo":
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKey: null, lastAt: 0 };
    case "redo":
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: null, lastAt: 0 };
    case "reset":
      return initHistory(a.doc);
  }
}
