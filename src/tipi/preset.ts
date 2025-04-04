import { Timestamp } from 'firebase/firestore';

// Definizione delle interfacce per la gestione dei preset di assegnazioni

/**
 * Interfaccia che rappresenta un preset di assegnazioni
 */
export interface PresetAssegnazioni {
  id: string;
  nome: string;
  descrizione: string;
  incarichi: string[]; // Array di ID incarichi
  createdAt: Timestamp; // timestamp di creazione
  updatedAt: Timestamp; // timestamp di ultima modifica
  ultimoUtilizzo: Timestamp | null;
}

/**
 * Interfaccia per la gestione delle richieste di modifica dei preset
 */
export interface PresetAssegnazioniRequest {
  nome: string;
  descrizione?: string;
  incarichi: string[];
} 