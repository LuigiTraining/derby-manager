// Definizione dello stato di una farm
export type StatoFarm = 'attivo' | 'inattivo';

// Definizione del ruolo utente
export type RuoloUtente = 'admin' | 'giocatore';

// Interfaccia per le statistiche del giocatore
export interface StatisticheGiocatore {
  incarichiCompletati: number;
  puntiAccumulati: number;
}

// Interfaccia per una farm
export interface Farm {
  id: string;
  farmId: string;
  nome: string;
  livello: number;
  isAttiva: boolean;
  diamanti?: number;
  eta?: number | null;
  nazionalita?: string;
  suDiMe?: string;
  immagine?: string;
  giocatore_id?: string;
  giocatore_nome?: string;
  tag?: string;
  stato: StatoFarm;
  principale: boolean;
  derby_tags?: string[];  // Array di ID dei derby per cui questa farm è predisposta
}

// Interfaccia principale per il giocatore
export interface Giocatore {
  // Dati identificativi
  id: string;
  pin: number;
  ruolo: 'giocatore';
  
  // Dati personali
  nome: string;
  contatto?: string;
  contattoVisibile?: boolean;
  note?: string;
  immagine?: string;
  
  // Dati di gioco
  farms: Farm[];
  vicinati: string[];
  statistiche: {
    incarichiCompletati: number;
    puntiAccumulati: number;
  };
  
  // Metadati
  dataRegistrazione: string;
  eta?: number | null;
  nazionalita?: string;
}

export interface RichiestaIscrizione {
  id: string;
  nome: string;
  contatto: string;
  presentazione: string;
  nome_farm: string;
  livello_farm: number;
  stato: 'approvata' | 'rifiutata';
  data_richiesta: Date;
}
