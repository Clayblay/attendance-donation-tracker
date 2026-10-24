export type PersonType = 'member' | 'contributor' | 'visitor';

export type Person = {
  /** Internal, never changes. */
  id: string;
  /** Human-friendly sequential ID shown in the app, e.g. M0001. */
  displayId: string;
  name: string;
  type: PersonType;
  email: string;
  phone: string;
  createdAt: string;
  /** Earlier display IDs, kept when a person's type changes. */
  previousIds: string[];
};

export type PersonInput = Pick<Person, 'name' | 'type' | 'email' | 'phone'>;

export type GivingKind = 'tithe' | 'offering' | 'dues' | 'special' | 'other';

export type GivingOpportunity = {
  id: string;
  name: string;
  kind: GivingKind;
  description: string;
  /** Inactive opportunities are hidden when recording gifts but keep their history. */
  active: boolean;
  createdAt: string;
};

export type GivingInput = Pick<GivingOpportunity, 'name' | 'kind' | 'description' | 'active'>;

export type PaymentMethod = 'cash' | 'check' | 'card' | 'online' | 'other';

export type Gift = {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** null = anonymous / unnamed donor. */
  personId: string | null;
  /** Filled in when the donor is deleted, so the gift keeps a name. */
  donorLabel: string;
  givingId: string;
  /** Stored in cents to avoid rounding errors. */
  amountCents: number;
  method: PaymentMethod;
  /** e.g. a check number. */
  reference: string;
  note: string;
  /** When a thank-you was marked as sent (ISO date), or empty/missing if not yet. */
  thankedAt?: string;
  createdAt: string;
};

export type GiftInput = Omit<Gift, 'id' | 'createdAt' | 'donorLabel' | 'thankedAt'>;

export type EventType = {
  id: string;
  name: string;
  description: string;
  /** Inactive event types are hidden when taking attendance but keep their history. */
  active: boolean;
  createdAt: string;
};

export type EventInput = Pick<EventType, 'name' | 'description' | 'active'>;

export type AttendanceRecord = {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  eventTypeId: string;
  /** People checked off as present. */
  personIds: string[];
  /** Extra people who were there but are not checked off by name. */
  otherCount: number;
  note: string;
  createdAt: string;
};

export type AttendanceInput = Omit<AttendanceRecord, 'id' | 'createdAt'>;

export type NoteCategory = 'general' | 'followup' | 'prayer' | 'reminder';
export type NoteTargetKind = 'none' | 'person' | 'gift' | 'attendance';

export type Note = {
  id: string;
  text: string;
  category: NoteCategory;
  pinned: boolean;
  /** Only used for Follow-up and Reminder notes. */
  done: boolean;
  targetKind: NoteTargetKind;
  targetId: string;
  /** Remembers what a note was attached to if that item was later deleted. */
  targetLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = Pick<Note, 'text' | 'category' | 'pinned' | 'done' | 'targetKind' | 'targetId'>;

export type TemplateKind = 'thankyou' | 'statement';

export type LetterTemplate = {
  id: string;
  kind: TemplateKind;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
};

export type LetterTemplateInput = Pick<LetterTemplate, 'name' | 'subject' | 'body'>;

export type ThemeMode = 'system' | 'light' | 'dark';

export type DashboardItemId = 'shortcuts' | 'people' | 'lastAttendance' | 'notes' | 'today' | 'byOccasion' | 'byDonor';
export type DashboardItemPref = { id: DashboardItemId; visible: boolean };

export type Settings = {
  themeMode: ThemeMode;
  paletteId: string;
  /** Optional custom accent colour as #RRGGBB, or '' for the palette's own. */
  customAccent: string;
  /** Order and visibility of the Dashboard sections. */
  dashboard: DashboardItemPref[];
};

export type AppData = {
  version: 1;
  orgName: string;
  people: Person[];
  givingOpportunities: GivingOpportunity[];
  gifts: Gift[];
  eventTypes: EventType[];
  attendance: AttendanceRecord[];
  notes: Note[];
  templates: LetterTemplate[];
  /** True once the starter statement template has been added (so a deleted one stays deleted). */
  statementSeeded: boolean;
  /** "personId:year" -> ISO time the statement was marked as sent. */
  statementsSent: Record<string, string>;
  settings: Settings;
  /** Last number used for each ID series. Numbers are never reused. */
  counters: Record<PersonType, number>;
};
