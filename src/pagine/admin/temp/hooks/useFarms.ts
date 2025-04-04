import { useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";
import { Farm } from "../../../../tipi/giocatore";
import { Incarico } from "../../../../tipi/incarico";
import { Assegnazione } from "../../../../tipi/assegnazione";

export const useFarms = () => {
  // Stati
  const [farms, setFarms] = useState<Farm[]>([]);

  // Funzione per caricare le farm
  const caricaFarms = useCallback(async () => {
    try {
      const farmsQuery = query(collection(db, "farms"));
      const farmsSnapshot = await getDocs(farmsQuery);
      const farmsData = farmsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Farm)
      );
      setFarms(farmsData);
      return farmsData;
    } catch (error) {
      console.error("Errore nel caricamento delle farm:", error);
      return [];
    }
  }, []);

  // Funzione per ottenere le farm disponibili per un incarico
  const getFarmDisponibili = useCallback(
    (incarico: Incarico, assegnazioni: Assegnazione[]) => {
      const farmAssegnate = assegnazioni
        .filter(
          (a) => a.tipo === "incarico" && a.riferimento_id === incarico.id
        )
        .map((a) => a.farm_id);

      return farms.filter(
        (farm) =>
          !farmAssegnate.includes(farm.id) &&
          farm.livello >= incarico.livello_minimo
      );
    },
    [farms]
  );

  return {
    farms,
    caricaFarms,
    getFarmDisponibili,
  };
}; 