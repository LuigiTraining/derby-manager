import { useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";
import { Assegnazione } from "../../../../tipi/assegnazione";
import { Cesto, IncaricoInCesto } from "../../../../tipi/cesto";

export const useAssegnazioni = () => {
  // Stati
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [salvandoAssegnazioni, setSalvandoAssegnazioni] = useState(false);
  const [assegnazioniModificate, setAssegnazioniModificate] = useState<{
    aggiunte: Omit<Assegnazione, "id">[];
    rimosse: string[];
  }>({ aggiunte: [], rimosse: [] });

  // Funzione per caricare le assegnazioni
  const caricaAssegnazioni = useCallback(async () => {
    try {
      const assegnazioniQuery = query(collection(db, "assegnazioni"));
      const assegnazioniSnapshot = await getDocs(assegnazioniQuery);
      const assegnazioniData = assegnazioniSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Assegnazione)
      );
      setAssegnazioni(assegnazioniData);
      return assegnazioniData;
    } catch (error) {
      console.error("Errore nel caricamento delle assegnazioni:", error);
      return [];
    }
  }, []);

  // Funzione per rimuovere un'assegnazione
  const handleRimuoviAssegnazione = useCallback(
    async (assegnazioneId: string, tipo: "cesto" | "incarico") => {
      try {
        const assegnazione = assegnazioni.find((a) => a.id === assegnazioneId);
        if (!assegnazione) return;

        // Aggiungi l'ID dell'assegnazione alla lista delle rimosse
        setAssegnazioniModificate((prev) => ({
          ...prev,
          rimosse: [...prev.rimosse, assegnazioneId],
        }));

        // Se è un incarico, trova anche i cesti correlati
        if (tipo === "incarico") {
          // Questa parte sarà implementata quando avremo accesso ai cesti
          // Per ora lasciamo un segnaposto
        }
      } catch (error) {
        console.error("Errore nella rimozione dell'assegnazione:", error);
      }
    },
    [assegnazioni]
  );

  // Funzione per assegnare un incarico
  const handleAssegnaIncarico = useCallback(
    async (incaricoId: string, farmId: string) => {
      try {
        // Verifica se l'assegnazione esiste già
        const esisteAssegnazione = assegnazioni.some(
          (a) =>
            a.tipo === "incarico" &&
            a.riferimento_id === incaricoId &&
            a.farm_id === farmId
        );

        // Verifica anche se esiste nelle assegnazioni modificate ma non ancora salvate
        const esisteNelleModifiche = assegnazioniModificate.aggiunte.some(
          (a) =>
            a.tipo === "incarico" &&
            a.riferimento_id === incaricoId &&
            a.farm_id === farmId
        );

        if (esisteAssegnazione || esisteNelleModifiche) {
          console.log("Assegnazione già esistente");
          return;
        }

        // Crea la nuova assegnazione (solo in memoria)
        const nuovaAssegnazione: Omit<Assegnazione, "id"> = {
          farm_id: farmId,
          tipo: "incarico",
          riferimento_id: incaricoId,
          completato: false,
          data_assegnazione: Timestamp.now(),
        };

        // Aggiungi alla lista delle modifiche locali
        setAssegnazioniModificate((prev) => ({
          ...prev,
          aggiunte: [...prev.aggiunte, nuovaAssegnazione],
        }));
      } catch (error) {
        console.error("Errore nell'assegnazione dell'incarico:", error);
      }
    },
    [assegnazioni, assegnazioniModificate]
  );

  // Funzione per completare un incarico
  const handleToggleCompletamento = useCallback(
    async (assegnazioneId: string, completato: boolean) => {
      try {
        await updateDoc(doc(db, "assegnazioni", assegnazioneId), {
          completato: !completato,
        });

        setAssegnazioni((prev) =>
          prev.map((ass) =>
            ass.id === assegnazioneId ? { ...ass, completato: !completato } : ass
          )
        );
      } catch (error) {
        console.error("Errore nel toggle del completamento:", error);
      }
    },
    []
  );

  // Funzione per assegnare un cesto
  const handleAssegnaCesto = useCallback(
    async (cestoId: string, farmId: string, cesti: Cesto[]) => {
      try {
        const cesto = cesti.find((c) => c.id === cestoId);
        if (!cesto) return;

        // Verifica se il cesto è già stato assegnato a questa farm
        const assegnazioniCesto = assegnazioni.filter(
          (a) =>
            a.tipo === "cesto" &&
            a.riferimento_id === cestoId &&
            a.farm_id === farmId
        );

        if (assegnazioniCesto.length > 0) {
          console.error("Cesto già assegnato a questa farm");
          return;
        }

        // Crea l'assegnazione del cesto
        const nuovaAssegnazioneCesto: Omit<Assegnazione, "id"> = {
          farm_id: farmId,
          tipo: "cesto",
          riferimento_id: cestoId,
          completato: false,
          data_assegnazione: Timestamp.now(),
        };

        // Crea le assegnazioni per ogni incarico nel cesto che non è già assegnato
        const nuoveAssegnazioniIncarichi: Omit<Assegnazione, "id">[] = [];
        for (const inc of cesto.incarichi) {
          const esisteAssegnazione = assegnazioni.some(
            (a) =>
              a.tipo === "incarico" &&
              a.riferimento_id === inc.incarico_id &&
              a.farm_id === farmId
          );

          if (!esisteAssegnazione) {
            nuoveAssegnazioniIncarichi.push({
              farm_id: farmId,
              tipo: "incarico",
              riferimento_id: inc.incarico_id,
              completato: false,
              data_assegnazione: Timestamp.now(),
            });
          }
        }

        // Salva tutte le assegnazioni in una batch
        const batch = writeBatch(db);

        // Aggiungi l'assegnazione del cesto
        const cestoRef = doc(collection(db, "assegnazioni"));
        batch.set(cestoRef, nuovaAssegnazioneCesto);

        // Aggiungi solo le nuove assegnazioni degli incarichi
        const nuoveAssegnazioniRefs = nuoveAssegnazioniIncarichi.map(() =>
          doc(collection(db, "assegnazioni"))
        );
        nuoveAssegnazioniIncarichi.forEach((assegnazione, index) => {
          batch.set(nuoveAssegnazioniRefs[index], assegnazione);
        });

        await batch.commit();

        // Aggiorna lo stato locale
        setAssegnazioni((prev) => [
          ...prev,
          { id: cestoRef.id, ...nuovaAssegnazioneCesto },
          ...nuoveAssegnazioniIncarichi.map((a, index) => ({
            id: nuoveAssegnazioniRefs[index].id,
            ...a,
          })),
        ]);
      } catch (error) {
        console.error("Errore nell'assegnazione del cesto:", error);
      }
    },
    [assegnazioni]
  );

  // Funzione per rimuovere un cesto
  const handleRimuoviCesto = useCallback(
    async (assegnazioneId: string, cesti: Cesto[]) => {
      try {
        const assegnazioneCesto = assegnazioni.find(
          (a) => a.id === assegnazioneId
        );
        if (!assegnazioneCesto || assegnazioneCesto.tipo !== "cesto") return;

        const cesto = cesti.find(
          (c) => c.id === assegnazioneCesto.riferimento_id
        );
        if (!cesto) return;

        // Trova tutte le assegnazioni degli incarichi correlate
        const assegnazioniCorrelate = assegnazioni.filter(
          (a) =>
            a.tipo === "incarico" &&
            a.farm_id === assegnazioneCesto.farm_id &&
            cesto.incarichi.some((incarico: IncaricoInCesto) => incarico.incarico_id === a.riferimento_id)
        );

        // Rimuovi tutte le assegnazioni in batch
        const batch = writeBatch(db);

        // Rimuovi l'assegnazione del cesto
        batch.delete(doc(db, "assegnazioni", assegnazioneId));

        // Rimuovi le assegnazioni degli incarichi
        for (const assegnazione of assegnazioniCorrelate) {
          batch.delete(doc(db, "assegnazioni", assegnazione.id));
        }

        await batch.commit();

        // Aggiorna lo stato locale
        setAssegnazioni((prev) =>
          prev.filter(
            (a) =>
              a.id !== assegnazioneId &&
              !assegnazioniCorrelate.some((ac) => ac.id === a.id)
          )
        );
      } catch (error) {
        console.error("Errore nella rimozione del cesto:", error);
      }
    },
    [assegnazioni]
  );

  // Funzione per salvare le assegnazioni modificate
  const handleSalvaAssegnazioni = useCallback(async () => {
    if (
      assegnazioniModificate.aggiunte.length === 0 &&
      assegnazioniModificate.rimosse.length === 0
    ) {
      return;
    }

    setSalvandoAssegnazioni(true);

    try {
      const batch = writeBatch(db);

      // Aggiungi le nuove assegnazioni
      for (const nuovaAssegnazione of assegnazioniModificate.aggiunte) {
        // Genera un ID casuale per la nuova assegnazione
        const assegnazioneId = doc(collection(db, "assegnazioni")).id;
        const assegnazioneRef = doc(db, "assegnazioni", assegnazioneId);
        batch.set(assegnazioneRef, {
          tipo: nuovaAssegnazione.tipo,
          farm_id: nuovaAssegnazione.farm_id,
          riferimento_id: nuovaAssegnazione.riferimento_id,
          data_assegnazione: nuovaAssegnazione.data_assegnazione,
          completato: nuovaAssegnazione.completato,
        });
      }

      // Rimuovi le assegnazioni eliminate
      for (const assegnazioneId of assegnazioniModificate.rimosse) {
        const assegnazioneRef = doc(db, "assegnazioni", assegnazioneId);
        batch.delete(assegnazioneRef);
      }

      await batch.commit();

      // Ricarica le assegnazioni
      await caricaAssegnazioni();

      // Resetta le modifiche
      setAssegnazioniModificate({ aggiunte: [], rimosse: [] });

      // Invalida la cache per forzare un ricaricamento alla prossima apertura
      localStorage.removeItem("assegnazioniCache");
      localStorage.removeItem("assegnazioniCacheTimestamp");
      console.log("Cache invalidata dopo il salvataggio delle assegnazioni");
    } catch (error) {
      console.error("Errore nel salvataggio delle assegnazioni:", error);
    } finally {
      setSalvandoAssegnazioni(false);
    }
  }, [assegnazioniModificate, caricaAssegnazioni]);

  return {
    assegnazioni,
    assegnazioniModificate,
    setAssegnazioniModificate,
    handleAssegnaIncarico,
    handleAssegnaCesto,
    handleRimuoviAssegnazione,
    handleRimuoviCesto,
    handleToggleCompletamento,
    handleSalvaAssegnazioni,
    salvandoAssegnazioni,
    caricaAssegnazioni,
  };
}; 