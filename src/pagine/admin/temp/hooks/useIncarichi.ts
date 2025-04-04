import { useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";
import { Edificio } from "../../../../tipi/edificio";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";

export const useIncarichi = () => {
  // Stati
  const [edifici, setEdifici] = useState<Edificio[]>([]);
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);

  // Funzione per caricare gli incarichi
  const caricaIncarichi = useCallback(async () => {
    try {
      // Carica gli edifici
      const edificiQuery = query(collection(db, "edifici"));
      const edificiSnapshot = await getDocs(edificiQuery);
      const edificiData = edificiSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Edificio)
      );
      setEdifici(edificiData);

      // Carica gli incarichi
      const incarichiQuery = query(collection(db, "incarichi"));
      const incarichiSnapshot = await getDocs(incarichiQuery);
      const incarichiData = incarichiSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Incarico)
      );
      setIncarichi(incarichiData);

      // Carica gli incarichi città
      const incarichiCittaQuery = query(collection(db, "incarichi_citta"));
      const incarichiCittaSnapshot = await getDocs(incarichiCittaQuery);
      const incarichiCittaData = incarichiCittaSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as IncaricoCitta)
      );
      setIncarichiCitta(incarichiCittaData);

      return {
        edifici: edificiData,
        incarichi: incarichiData,
        incarichiCitta: incarichiCittaData,
      };
    } catch (error) {
      console.error("Errore nel caricamento degli incarichi:", error);
      return {
        edifici: [],
        incarichi: [],
        incarichiCitta: [],
      };
    }
  }, []);

  // Funzione per ottenere il progresso di un incarico
  const getProgressoIncarico = useCallback(
    (incaricoId: string, farmId: string): number => {
      // Questa funzione sarà implementata quando avremo accesso ai progressi
      return 0;
    },
    []
  );

  // Funzione per calcolare i completamenti di un incarico
  const getCompletamentiIncarico = useCallback(
    (progresso: number, quantita: number): number => {
      return quantita > 0 ? Math.floor(progresso / quantita) : 0;
    },
    []
  );

  // Funzione per ottenere il progresso di un incarico per una farm
  const getProgressoIncaricoFarm = useCallback(
    async (incaricoId: string, farmId: string): Promise<number> => {
      try {
        // Cerca il progresso nel database
        const progressiQuery = query(
          collection(db, "progressi_incarichi"),
          where("riferimento_id", "==", incaricoId),
          where("farm_id", "==", farmId),
          where("tipo", "==", "incarico")
        );
        const progressiSnapshot = await getDocs(progressiQuery);

        if (progressiSnapshot.empty) {
          return 0;
        }

        // Prendi il primo documento (dovrebbe essere l'unico)
        const progressoDoc = progressiSnapshot.docs[0];
        const progressoData = progressoDoc.data();

        return progressoData.quantita || 0;
      } catch (error) {
        console.error("Errore nel recupero del progresso:", error);
        return 0;
      }
    },
    []
  );

  // Funzione per calcolare i conteggi delle assegnazioni
  const calcolaConteggi = useCallback(
    async (incaricoId: string): Promise<ConteggioAssegnazioni> => {
      try {
        // Cerca le assegnazioni per questo incarico
        const assegnazioniQuery = query(
          collection(db, "assegnazioni"),
          where("riferimento_id", "==", incaricoId),
          where("tipo", "==", "incarico")
        );
        const assegnazioniSnapshot = await getDocs(assegnazioniQuery);

        // Inizializza i conteggi
        const conteggi: ConteggioAssegnazioni = {
          totaleAttive: 0,
          totaleInattive: 0,
          completateAttive: 0,
          completateInattive: 0,
          completateSenzaAssegnazioneAttive: 0,
          completateSenzaAssegnazioneInattive: 0,
        };

        // Calcola i conteggi
        for (const doc of assegnazioniSnapshot.docs) {
          const assegnazione = doc.data();
          const farmId = assegnazione.farm_id;

          // Verifica se la farm è attiva
          // Questa parte sarà implementata quando avremo accesso alle farm
          const isAttiva = true; // Per ora assumiamo che tutte le farm siano attive

          if (isAttiva) {
            conteggi.totaleAttive++;
            if (assegnazione.completato) {
              conteggi.completateAttive++;
            }
          } else {
            conteggi.totaleInattive++;
            if (assegnazione.completato) {
              conteggi.completateInattive++;
            }
          }
        }

        return conteggi;
      } catch (error) {
        console.error("Errore nel calcolo dei conteggi:", error);
        return {
          totaleAttive: 0,
          totaleInattive: 0,
          completateAttive: 0,
          completateInattive: 0,
          completateSenzaAssegnazioneAttive: 0,
          completateSenzaAssegnazioneInattive: 0,
        };
      }
    },
    []
  );

  return {
    edifici,
    incarichi,
    incarichiCitta,
    caricaIncarichi,
    getProgressoIncarico,
    getCompletamentiIncarico,
    getProgressoIncaricoFarm,
    calcolaConteggi,
  };
}; 