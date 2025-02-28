// Interfaccia per gli incarichi nel cesto
export interface IncaricoInCesto {
  incarico_id: string;
  quantita: number;
  quantita_derby?: Record<string, number>;
}

// Interfaccia principale per il cesto
export interface Cesto {
  id: string;
  nome: string;
  incarichi: IncaricoInCesto[];
  data_creazione: Date;
  note?: string;
}

// Tipo per il livello del cesto (calcolato in base agli incarichi contenuti)
export type LivelloCesto = {
  livello: number;
  incarichi: {
    nome: string;
    livello: number;
  }[];
}
