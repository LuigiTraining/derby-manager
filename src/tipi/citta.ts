import { Timestamp } from 'firebase/firestore';
import { IncaricoCitta } from './incarico';

// Tipo per distinguere edifici e visitatori
export type TipoElementoCitta = 'edificio' | 'visitatore';

// Interfaccia per gli elementi base della città (edifici e visitatori)
export interface ElementoCitta {
  id: string;
  nome: string;
  tipo: TipoElementoCitta;
  immagine: string;
  livello_minimo: number;
  data_creazione: Timestamp;
}

// Interfaccia per il progresso degli incarichi città
export interface ProgressoCitta {
  id: string;
  farm_id: string;
  incarico_id: string;
  quantita_prodotta: number;
  ultimo_aggiornamento: Timestamp;
}

// Interfaccia per il conteggio totale della città di un giocatore
export interface ConteggioTotaleCitta {
  farm_id: string;
  totale_assegnati: number;    // Totale visitatori assegnati
  totale_prodotti: number;     // Totale visitatori prodotti
  ultimo_aggiornamento: Timestamp;
} 