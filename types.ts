export interface DilutionState {
  c1: number | '';
  v1: number | '';
  c2: number | '';
  v2: number | '';
}

export interface MolarityState {
  mw: number | '';
  molarity: number | '';
  volume: number | '';
  mass: number | '';
}

export interface ProtocolVariable {
  id: string;
  label: string;
  defaultValue: number;
  unit: string;
}

export interface ProtocolStep {
  id: string;
  text: string; // Can contain template markers like {volume}
  isHeader?: boolean;
}

export interface Protocol {
  id: string;
  title: string;
  category: string;
  variables: ProtocolVariable[];
  steps: (variables: Record<string, number>) => ProtocolStep[];
}

export type ThemeMode = 'light' | 'dark' | 'print';