import { Timestamp } from 'firebase/firestore';

// Interfaccia base per gli incarichi
interface IncaricoBase {
  id: string;
  nome: string;
  quantita: number;  // Quantità di default
  quantita_derby?: Record<string, number>;  // Mappa derby_id -> quantità
  livello_minimo: number;
  immagine: string;
  is_obbligatorio: boolean;
  usato_in_cesti: boolean;
  data_creazione?: Timestamp;
  data_modifica?: Timestamp;
  derby_tags?: string[];  // Array di ID dei derby per cui questo incarico è disponibile
}

export interface IncaricoCitta extends IncaricoBase {
  elemento_id?: string;
  tipo?: 'edificio' | 'visitatore';
  quantita_derby?: Record<string, number>;
}

export interface Incarico {
  id: string;
  nome: string;
  quantita: number;
  livello_minimo: number;
  immagine: string;
  edificio_id: string | null;  // Modifica qui per permettere null
  is_obbligatorio: boolean;
  quantita_derby?: Record<string, number>;
  usato_in_cesti?: boolean;    // Aggiungi questa proprietà opzionale
  derby_tags?: string[];       // Array di ID dei derby per cui questo incarico è disponibile
}

export interface Cesto {
  id: string;
  nome: string;
  incarichi: {
    incarico_id: string;
    quantita: number;
  }[];
  derby_tags?: string[];  // Array di ID dei derby per cui questo cesto è disponibile
}

export interface Assegnazione {
  id: string;
  farm_id: string;
  tipo: 'incarico' | 'cesto';
  riferimento_id: string;  // ID dell'incarico o del cesto
  completato: boolean;
  data_assegnazione: Date;
  livello_farm: number;      // Per validazione futura
  livello_richiesto: number; // Per validazione futura
}

export interface IncaricoInCesto {
  incarico_id: string;
  quantita: number;
  quantita_derby?: Record<string, number>;
}
