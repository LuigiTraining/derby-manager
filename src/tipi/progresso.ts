import { Timestamp } from 'firebase/firestore';

// Interfaccia per il progresso di un incarico
export interface ProgressoIncarico {
  id: string;
  farm_id: string;
  incarico_id: string;
  quantita_prodotta: number;
  ultimo_aggiornamento: Timestamp;
  is_assegnato: boolean;
}

// Interfaccia per il progresso di un cesto
export interface ProgressoCesto {
  id: string;
  farm_id: string;
  cesto_id: string;
  progressi_incarichi: {
    incarico_id: string;
    quantita_prodotta: number;
    quantita_richiesta: number;
  }[];
  completato: boolean;
  ultimo_aggiornamento: Timestamp;
  is_assegnato: boolean;
}

// Interfaccia per il conteggio del progresso
export interface ConteggioProgresso {
  quantita_prodotta: number;
  quantita_richiesta: number;
  completamenti: number;  // Quante volte è stato completato l'incarico
}

// Interfaccia per il progresso completo di una farm
export interface ProgressoFarm {
  incarichi: {
    [incarico_id: string]: ConteggioProgresso;
  };
  cesti: {
    [cesto_id: string]: {
      progressi: {
        [incarico_id: string]: ConteggioProgresso;
      };
      completamenti: number;
    };
  };
}
