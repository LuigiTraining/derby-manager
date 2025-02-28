import { Timestamp } from 'firebase/firestore';

// Tipo di assegnazione (incarico standard o cesto)
export type TipoAssegnazione = 'incarico' | 'cesto';

// Interfaccia per le assegnazioni
export interface Assegnazione {
  id: string;
  farm_id: string;
  tipo: TipoAssegnazione;
  riferimento_id: string;  // ID dell'incarico o del cesto
  completato: boolean;
  data_assegnazione: Timestamp;
}

// Interfaccia per il conteggio delle assegnazioni
export interface ConteggioAssegnazioni {
  totaleAttive: number;
  totaleInattive: number;
  completateAttive: number;
  completateInattive: number;
  completateSenzaAssegnazioneAttive: number;
  completateSenzaAssegnazioneInattive: number;
}

// Interfaccia per raggruppare gli incarichi per edificio
export interface IncarichiPerEdificio {
  edificio_id: string | null;
  nome_edificio: string | null;
  livello_edificio: number;
  incarichi: Array<{
    incarico: {
      id: string;
      nome: string;
      quantita: number;
      livello_minimo: number;
      immagine: string;
      is_obbligatorio: boolean;
    };
    conteggi: ConteggioAssegnazioni;
    giocatori_assegnati: Array<{
      giocatore_id: string;
      nome_giocatore: string;
      farm_id: string;
      nome_farm: string;
      isAttiva: boolean;
      completato: boolean;
    }>;
  }>;
}
