import { Timestamp } from 'firebase/firestore';

/**
 * Interfaccia per una sezione di regolamento
 */
export interface RegolamentiSezione {
  id: string;
  titolo: string;
  contenuto: string;
  ordine: number;
  parentId: string | null; // null se è una sezione di primo livello
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // ID dell'utente
  updatedBy: string; // ID dell'utente
  pubblicato: boolean;
}

/**
 * Interfaccia per le revisioni di una sezione di regolamento
 */
export interface RegolamentiRevisione {
  id: string;
  sezioneId: string;
  titolo: string;
  contenuto: string;
  createdAt: Timestamp;
  createdBy: string; // ID dell'utente
  note: string; // Note sulla revisione
} 