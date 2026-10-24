import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { defaultEvents } from '@/lib/attendance';
import { formatLong } from '@/lib/dates';
import { defaultStatementTemplates, defaultTemplates } from '@/lib/letters';
import { defaultSettings, normalizeSettings } from '@/lib/settings';
import { defaultGiving } from '@/lib/giving';
import { formatId, ID_START, newUid } from '@/lib/ids';
import { formatMoney } from '@/lib/money';
import { AppData, LetterTemplate, LetterTemplateInput, Settings, TemplateKind, AttendanceInput, AttendanceRecord, EventInput, EventType, Gift, GiftInput, GivingInput, GivingOpportunity, Note, NoteInput, Person, PersonInput, PersonType } from '@/lib/types';

const STORAGE_KEY = 'attendance-tracker:data:v1';

const emptyData = (): AppData => ({
  version: 1,
  orgName: '',
  people: [],
  givingOpportunities: defaultGiving(),
  gifts: [],
  eventTypes: defaultEvents(),
  attendance: [],
  notes: [],
  templates: defaultTemplates(),
  statementSeeded: true,
  statementsSent: {},
  settings: defaultSettings(),
  counters: { ...ID_START },
});

type DataContextValue = {
  loaded: boolean;
  data: AppData;
  setOrgName: (name: string) => void;
  /** The ID the next person of this type would receive. */
  peekNextId: (type: PersonType) => string;
  addPerson: (input: PersonInput) => Person;
  updatePerson: (id: string, input: PersonInput) => void;
  deletePerson: (id: string) => void;
  addGiving: (input: GivingInput) => void;
  updateGiving: (id: string, input: GivingInput) => void;
  deleteGiving: (id: string) => void;
  addGift: (input: GiftInput) => void;
  updateGift: (id: string, input: GiftInput) => void;
  deleteGift: (id: string) => void;
  addEventType: (input: EventInput) => void;
  updateEventType: (id: string, input: EventInput) => void;
  deleteEventType: (id: string) => void;
  addAttendance: (input: AttendanceInput) => void;
  updateAttendance: (id: string, input: AttendanceInput) => void;
  deleteAttendance: (id: string) => void;
  addNote: (input: NoteInput) => void;
  updateNote: (id: string, input: NoteInput) => void;
  deleteNote: (id: string) => void;
  addTemplate: (input: LetterTemplateInput, kind?: TemplateKind) => void;
  updateTemplate: (id: string, input: LetterTemplateInput) => void;
  deleteTemplate: (id: string) => void;
  markGiftThanked: (id: string, thanked: boolean) => void;
  markStatementSent: (personId: string, year: number, sent: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<AppData>(data); // always the latest data, even between renders

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppData>;
          const base = emptyData();
          const merged: AppData = {
            ...base,
            ...parsed,
            version: 1,
            counters: {
              member: Math.max(ID_START.member, parsed.counters?.member ?? 0),
              contributor: Math.max(ID_START.contributor, parsed.counters?.contributor ?? 0),
              visitor: Math.max(ID_START.visitor, parsed.counters?.visitor ?? 0),
            },
            people: Array.isArray(parsed.people) ? parsed.people : [],
            // Data saved before Step 2 has no giving list: start with the defaults.
            givingOpportunities: Array.isArray(parsed.givingOpportunities)
              ? parsed.givingOpportunities
              : base.givingOpportunities,
            gifts: Array.isArray(parsed.gifts) ? parsed.gifts : [],
            eventTypes: Array.isArray(parsed.eventTypes) ? parsed.eventTypes : base.eventTypes,
            attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            templates: base.templates,
            statementSeeded: true,
            statementsSent: parsed.statementsSent && typeof parsed.statementsSent === 'object' ? parsed.statementsSent : {},
            settings: normalizeSettings(parsed.settings),
          };
          // Templates: keep the saved ones; add the starter statement template once for older data.
          if (Array.isArray(parsed.templates)) {
            merged.templates = parsed.templates;
            if (parsed.statementSeeded !== true) merged.templates = [...parsed.templates, ...defaultStatementTemplates()];
          }
          ref.current = merged;
          if (!cancelled) setData(merged);
        }
      } catch (e) {
        console.warn('Could not load saved data', e);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: AppData) => {
    ref.current = next;
    setData(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('Could not save data', e)
    );
  }, []);

  const setOrgName = useCallback(
    (name: string) => commit({ ...ref.current, orgName: name.trim() }),
    [commit]
  );

  const peekNextId = useCallback(
    (type: PersonType) => formatId(type, ref.current.counters[type] + 1),
    []
  );

  const addPerson = useCallback(
    (input: PersonInput) => {
      const cur = ref.current;
      const n = cur.counters[input.type] + 1;
      const person: Person = {
        id: newUid(),
        displayId: formatId(input.type, n),
        name: input.name.trim(),
        type: input.type,
        email: input.email.trim(),
        phone: input.phone.trim(),
        createdAt: new Date().toISOString(),
        previousIds: [],
      };
      commit({
        ...cur,
        people: [...cur.people, person],
        counters: { ...cur.counters, [input.type]: n },
      });
      return person;
    },
    [commit]
  );

  const updatePerson = useCallback(
    (id: string, input: PersonInput) => {
      const cur = ref.current;
      const existing = cur.people.find((p) => p.id === id);
      if (!existing) return;
      let counters = cur.counters;
      let displayId = existing.displayId;
      let previousIds = existing.previousIds;
      if (existing.type !== input.type) {
        // Type changed: start a fresh ID in the new series, remember the old one.
        const n = cur.counters[input.type] + 1;
        counters = { ...cur.counters, [input.type]: n };
        displayId = formatId(input.type, n);
        previousIds = [...existing.previousIds, existing.displayId];
      }
      const updated: Person = {
        ...existing,
        name: input.name.trim(),
        type: input.type,
        email: input.email.trim(),
        phone: input.phone.trim(),
        displayId,
        previousIds,
      };
      commit({
        ...cur,
        counters,
        people: cur.people.map((p) => (p.id === id ? updated : p)),
      });
    },
    [commit]
  );

  const deletePerson = useCallback(
    (id: string) => {
      const cur = ref.current;
      const gone = cur.people.find((p) => p.id === id);
      commit({
        ...cur,
        people: cur.people.filter((p) => p.id !== id),
        // Their gifts are kept, labelled with the name they had.
        gifts: gone
          ? cur.gifts.map((g) =>
              g.personId === id ? { ...g, personId: null, donorLabel: `${gone.name} (${gone.displayId})` } : g
            )
          : cur.gifts,
        statementsSent: Object.fromEntries(Object.entries(cur.statementsSent).filter(([k]) => !k.startsWith(`${id}:`))),
        // Their attendance stays counted, as unnamed attendees.
        attendance: cur.attendance.map((r) =>
          r.personIds.includes(id)
            ? { ...r, personIds: r.personIds.filter((x) => x !== id), otherCount: r.otherCount + 1 }
            : r
        ),
        notes: gone
          ? cur.notes.map((n) =>
              n.targetKind === 'person' && n.targetId === id
                ? { ...n, targetKind: 'none' as const, targetId: '', targetLabel: `Person: ${gone.name} (${gone.displayId})` }
                : n
            )
          : cur.notes,
      });
    },
    [commit]
  );

  const addGiving = useCallback(
    (input: GivingInput) => {
      const cur = ref.current;
      const item: GivingOpportunity = {
        id: newUid(),
        name: input.name.trim(),
        kind: input.kind,
        description: input.description.trim(),
        active: input.active,
        createdAt: new Date().toISOString(),
      };
      commit({ ...cur, givingOpportunities: [...cur.givingOpportunities, item] });
    },
    [commit]
  );

  const updateGiving = useCallback(
    (id: string, input: GivingInput) => {
      const cur = ref.current;
      commit({
        ...cur,
        givingOpportunities: cur.givingOpportunities.map((g) =>
          g.id === id
            ? { ...g, name: input.name.trim(), kind: input.kind, description: input.description.trim(), active: input.active }
            : g
        ),
      });
    },
    [commit]
  );

  const deleteGiving = useCallback(
    (id: string) => {
      const cur = ref.current;
      commit({ ...cur, givingOpportunities: cur.givingOpportunities.filter((g) => g.id !== id) });
    },
    [commit]
  );

  const addGift = useCallback(
    (input: GiftInput) => {
      const cur = ref.current;
      const gift: Gift = { ...input, id: newUid(), donorLabel: '', createdAt: new Date().toISOString() };
      commit({ ...cur, gifts: [...cur.gifts, gift] });
    },
    [commit]
  );

  const updateGift = useCallback(
    (id: string, input: GiftInput) => {
      const cur = ref.current;
      commit({
        ...cur,
        gifts: cur.gifts.map((g) =>
          g.id === id ? { ...g, ...input, donorLabel: input.personId ? '' : g.donorLabel } : g
        ),
      });
    },
    [commit]
  );

  const deleteGift = useCallback(
    (id: string) => {
      const cur = ref.current;
      const gone = cur.gifts.find((g) => g.id === id);
      commit({
        ...cur,
        gifts: cur.gifts.filter((g) => g.id !== id),
        notes: gone
          ? cur.notes.map((n) =>
              n.targetKind === 'gift' && n.targetId === id
                ? { ...n, targetKind: 'none' as const, targetId: '', targetLabel: `Gift: ${formatMoney(gone.amountCents)} on ${formatLong(gone.date)}` }
                : n
            )
          : cur.notes,
      });
    },
    [commit]
  );

  const addEventType = useCallback(
    (input: EventInput) => {
      const cur = ref.current;
      const item: EventType = {
        id: newUid(),
        name: input.name.trim(),
        description: input.description.trim(),
        active: input.active,
        createdAt: new Date().toISOString(),
      };
      commit({ ...cur, eventTypes: [...cur.eventTypes, item] });
    },
    [commit]
  );

  const updateEventType = useCallback(
    (id: string, input: EventInput) => {
      const cur = ref.current;
      commit({
        ...cur,
        eventTypes: cur.eventTypes.map((e) =>
          e.id === id ? { ...e, name: input.name.trim(), description: input.description.trim(), active: input.active } : e
        ),
      });
    },
    [commit]
  );

  const deleteEventType = useCallback(
    (id: string) => {
      const cur = ref.current;
      commit({ ...cur, eventTypes: cur.eventTypes.filter((e) => e.id !== id) });
    },
    [commit]
  );

  const addAttendance = useCallback(
    (input: AttendanceInput) => {
      const cur = ref.current;
      const rec: AttendanceRecord = { ...input, id: newUid(), createdAt: new Date().toISOString() };
      commit({ ...cur, attendance: [...cur.attendance, rec] });
    },
    [commit]
  );

  const updateAttendance = useCallback(
    (id: string, input: AttendanceInput) => {
      const cur = ref.current;
      commit({ ...cur, attendance: cur.attendance.map((r) => (r.id === id ? { ...r, ...input } : r)) });
    },
    [commit]
  );

  const deleteAttendance = useCallback(
    (id: string) => {
      const cur = ref.current;
      const gone = cur.attendance.find((r) => r.id === id);
      const eventName = gone ? cur.eventTypes.find((e) => e.id === gone.eventTypeId)?.name ?? 'Event' : '';
      commit({
        ...cur,
        attendance: cur.attendance.filter((r) => r.id !== id),
        notes: gone
          ? cur.notes.map((n) =>
              n.targetKind === 'attendance' && n.targetId === id
                ? { ...n, targetKind: 'none' as const, targetId: '', targetLabel: `Attendance: ${eventName} on ${formatLong(gone.date)}` }
                : n
            )
          : cur.notes,
      });
    },
    [commit]
  );

  const addNote = useCallback(
    (input: NoteInput) => {
      const cur = ref.current;
      const now = new Date().toISOString();
      const note: Note = {
        id: newUid(),
        text: input.text.trim(),
        category: input.category,
        pinned: input.pinned,
        done: input.done,
        targetKind: input.targetKind,
        targetId: input.targetKind === 'none' ? '' : input.targetId,
        targetLabel: '',
        createdAt: now,
        updatedAt: now,
      };
      commit({ ...cur, notes: [...cur.notes, note] });
    },
    [commit]
  );

  const updateNote = useCallback(
    (id: string, input: NoteInput) => {
      const cur = ref.current;
      commit({
        ...cur,
        notes: cur.notes.map((n) =>
          n.id === id
            ? {
                ...n,
                text: input.text.trim(),
                category: input.category,
                pinned: input.pinned,
                done: input.done,
                targetKind: input.targetKind,
                targetId: input.targetKind === 'none' ? '' : input.targetId,
                targetLabel: input.targetKind === 'none' ? n.targetLabel : '',
                updatedAt: new Date().toISOString(),
              }
            : n
        ),
      });
    },
    [commit]
  );

  const deleteNote = useCallback(
    (id: string) => {
      const cur = ref.current;
      commit({ ...cur, notes: cur.notes.filter((n) => n.id !== id) });
    },
    [commit]
  );

  const addTemplate = useCallback(
    (input: LetterTemplateInput, kind: TemplateKind = 'thankyou') => {
      const cur = ref.current;
      const t: LetterTemplate = {
        id: newUid(),
        kind,
        name: input.name.trim(),
        subject: input.subject.trim(),
        body: input.body,
        createdAt: new Date().toISOString(),
      };
      commit({ ...cur, templates: [...cur.templates, t] });
    },
    [commit]
  );

  const updateTemplate = useCallback(
    (id: string, input: LetterTemplateInput) => {
      const cur = ref.current;
      commit({
        ...cur,
        templates: cur.templates.map((t) =>
          t.id === id ? { ...t, name: input.name.trim(), subject: input.subject.trim(), body: input.body } : t
        ),
      });
    },
    [commit]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const cur = ref.current;
      commit({ ...cur, templates: cur.templates.filter((t) => t.id !== id) });
    },
    [commit]
  );

  const markGiftThanked = useCallback(
    (id: string, thanked: boolean) => {
      const cur = ref.current;
      commit({
        ...cur,
        gifts: cur.gifts.map((g) => (g.id === id ? { ...g, thankedAt: thanked ? new Date().toISOString() : '' } : g)),
      });
    },
    [commit]
  );

  const markStatementSent = useCallback(
    (personId: string, year: number, sent: boolean) => {
      const cur = ref.current;
      const key = `${personId}:${year}`;
      const next = { ...cur.statementsSent };
      if (sent) next[key] = new Date().toISOString();
      else delete next[key];
      commit({ ...cur, statementsSent: next });
    },
    [commit]
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const cur = ref.current;
      commit({ ...cur, settings: normalizeSettings({ ...cur.settings, ...patch }) });
    },
    [commit]
  );

  const resetAll = useCallback(async () => {
    // Erasing data keeps your look, layout and letter templates.
    const fresh: AppData = { ...emptyData(), settings: ref.current.settings, templates: ref.current.templates, statementSeeded: true };
    ref.current = fresh;
    setData(fresh);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not clear saved data', e);
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      loaded,
      data,
      setOrgName,
      peekNextId,
      addPerson,
      updatePerson,
      deletePerson,
      addGiving,
      updateGiving,
      deleteGiving,
      addGift,
      updateGift,
      deleteGift,
      addEventType,
      updateEventType,
      deleteEventType,
      addAttendance,
      updateAttendance,
      deleteAttendance,
      addNote,
      updateNote,
      deleteNote,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      markGiftThanked,
      markStatementSent,
      updateSettings,
      resetAll,
    }),
    [loaded, data, setOrgName, peekNextId, addPerson, updatePerson, deletePerson, addGiving, updateGiving, deleteGiving, addGift, updateGift, deleteGift, addEventType, updateEventType, deleteEventType, addAttendance, updateAttendance, deleteAttendance, addNote, updateNote, deleteNote, addTemplate, updateTemplate, deleteTemplate, markGiftThanked, markStatementSent, updateSettings, resetAll]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
