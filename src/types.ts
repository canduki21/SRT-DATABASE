export interface Paper {
  id: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  url: string;
  keywords: string[];
  simulants: string[];
  category: 'lunar' | 'martian' | 'asteroid' | 'multi' | 'general';
  source: 'spreadsheet' | 'auto-fetch' | 'manual';
  added_at?: string;
}

export interface Simulant {
  id: string;
  name: string;
  abbr: string;
  category: 'lunar' | 'martian' | 'asteroid';
  variations: string[];
}
