// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Grussbuch {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    nachricht?: string;
    zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  GRUSSBUCH: '6af2efb2ce80433d7fc81b17',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'grußbuch': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'nachricht': 'string/textarea',
    'zeitpunkt': 'date/datetimeminute',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateGrussbuch = StripLookup<Grussbuch['fields']>;