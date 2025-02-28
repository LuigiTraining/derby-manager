import { Timestamp } from 'firebase/firestore';

export interface Derby {
  id: string;
  nome: string;           // es: "STANDARD", "INTENSIVO"
  attivo: boolean;        // indica se questo derby è quello attualmente in corso
  prossimo: boolean;      // indica se questo derby è programmato per il prossimo martedì
  colore: string;         // colore del derby in formato hex (es: "#FF0000")
  data_creazione: Timestamp;
  data_modifica?: Timestamp;
  creato_da: string;     // ID dell'admin che ha creato il derby
}

// Interfaccia per lo storico dei derby
export interface DerbyStorico {
  id: string;
  derby_id: string;
  nome: string;
  colore: string;
  data_inizio: Timestamp;
  data_fine: Timestamp | null;
  completato: boolean;
}

// Interfaccia per le statistiche aggregate
export interface StatisticheDerby {
  totale_derby: number;
  per_tipo: {
    [key: string]: number;  // es: { "STANDARD": 10, "INTENSIVO": 5 }
  };
}

// Interfaccia per mappare le quantità degli incarichi per ogni tipo di derby
export interface QuantitaDerby {
  incarico_id: string;
  derby_id: string;
  quantita: number;
}

// Interfaccia per le assegnazioni specifiche per derby
export interface AssegnazioneDerby {
  id: string;
  derby_id: string;
  farm_id: string;
  tipo: 'incarico' | 'cesto';
  riferimento_id: string;  // ID dell'incarico o del cesto
  completato: boolean;
  data_assegnazione: Timestamp;
  livello_farm: number;
  livello_richiesto: number;
} 