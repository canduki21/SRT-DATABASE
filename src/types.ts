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
  applications?: string[];
}

export interface Measurement {
  id: string
  simulant: string
  category: 'physical' | 'mechanical' | 'thermal' | 'optical' | 'electrical' | 'mineralogy'
  property: string
  value: number | string
  unit: string
  condition: string | null
  paper_id: string | null
  year: number | null
}

export interface Simulant {
  id: string;
  name: string;
  abbr: string;
  category: 'lunar' | 'martian' | 'asteroid';
  variations: string[];
}
