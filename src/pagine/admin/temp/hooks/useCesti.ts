import { useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";
import { Cesto, IncaricoInCesto } from "../../../../tipi/cesto";
import { Assegnazione } from "../../../../tipi/assegnazione";

export const useCesti = () => {
  // Stati
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [cestiIncarichi, setCestiIncarichi] = useState<
    Map<string, IncaricoInCesto[]>
  >(new Map());

  // Funzione per caricare i cesti
  const caricaCesti = useCallback(async () => {
    try {
      const cestiQuery = query(collection(db, "cesti"));
      const cestiSnapshot = await getDocs(cestiQuery);
      const cestiData = cestiSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Cesto)
      );
      setCesti(cestiData);

      // Crea una mappa degli incarichi per cesto
      const nuovaCestiIncarichi = new Map<string, IncaricoInCesto[]>();
      for (const cesto of cestiData) {
        nuovaCestiIncarichi.set(cesto.id, cesto.incarichi);
      }
      setCestiIncarichi(nuovaCestiIncarichi);

      return {
        cesti: cestiData,
        cestiIncarichi: nuovaCestiIncarichi,
      };
    } catch (error) {
      console.error("Errore nel caricamento dei cesti:", error);
      return {
        cesti: [],
        cestiIncarichi: new Map(),
      };
    }
  }, []);

  // Funzione per ottenere il livello di un cesto
  const getLivelloCesto = useCallback((cesto: Cesto) => {
    // Implementazione da completare
    return 1;
  }, []);

  // Funzione per ottenere i conteggi di un cesto
  const getConteggiCesto = useCallback((cesto: Cesto) => {
    // Implementazione da completare
    return {
      totaleAttive: 0,
      totaleInattive: 0,
      completateAttive: 0,
      completateInattive: 0,
      completateSenzaAssegnazioneAttive: 0,
      completateSenzaAssegnazioneInattive: 0,
    };
  }, []);

  // Funzione per verificare se un cesto è completo
  const verificaCestoCompleto = useCallback(
    (cesto: Cesto, farmId: string) => {
      // Implementazione da completare
      return false;
    },
    []
  );

  // Funzione per ottenere i giocatori assegnati a un cesto
  const getGiocatoriAssegnatiCesto = useCallback(
    (cestoId: string) => {
      // Implementazione da completare
      return [];
    },
    []
  );

  // Funzione per trovare un cesto per incarico
  const trovaCestoPerIncarico = useCallback(
    (incaricoId: string): Cesto | undefined => {
      return cesti.find((cesto) =>
        cesto.incarichi.some((incaricoInCesto: IncaricoInCesto) => incaricoInCesto.incarico_id === incaricoId)
      );
    },
    [cesti]
  );

  // Funzione per ottenere la quantità di un incarico in un cesto
  const getQuantitaIncaricoCesto = useCallback(
    (cestoId: string, incaricoId: string): number => {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) return 0;

      const incaricoInCesto = cesto.incarichi.find(
        (incaricoItem: IncaricoInCesto) => incaricoItem.incarico_id === incaricoId
      );
      if (!incaricoInCesto) return 0;

      // Per ora restituiamo la quantità di default
      // In futuro potremmo considerare la quantità specifica per derby
      return incaricoInCesto.quantita;
    },
    [cesti]
  );

  // Funzione per calcolare il livello di un cesto
  const calcolaLivelloCesto = useCallback(
    (incarichiIds: { incarico_id: string }[]) => {
      // Implementazione da completare
      return 1;
    },
    []
  );

  return {
    cesti,
    cestiIncarichi,
    caricaCesti,
    getLivelloCesto,
    getConteggiCesto,
    verificaCestoCompleto,
    getGiocatoriAssegnatiCesto,
    trovaCestoPerIncarico,
    getQuantitaIncaricoCesto,
    calcolaLivelloCesto,
  };
}; 