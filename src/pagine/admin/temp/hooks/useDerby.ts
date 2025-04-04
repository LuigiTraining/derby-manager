import { useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../../../../configurazione/firebase";
import { Derby } from "../../../../tipi/derby";
import { SelectChangeEvent } from "@mui/material/Select";

export const useDerby = () => {
  // Stati
  const [derby, setDerby] = useState<Derby[]>([]);
  const [derbySelezionato, setDerbySelezionato] = useState<Derby | null>(null);
  const [filtroDerby, setFiltroDerby] = useState<string | null>(null);
  const [filtroDerbyIncarichi, setFiltroDerbyIncarichi] = useState<
    string | null
  >(null);

  // Funzione per caricare i derby
  const caricaDerby = useCallback(async () => {
    try {
      const derbyQuery = query(collection(db, "derby"));
      const derbySnapshot = await getDocs(derbyQuery);
      const derbyData = derbySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Derby)
      );
      setDerby(derbyData);

      // Seleziona il derby attivo
      const derbyAttivo = derbyData.find((d) => d.attivo);
      if (derbyAttivo) {
        setDerbySelezionato(derbyAttivo);
      } else if (derbyData.length > 0) {
        setDerbySelezionato(derbyData[0]);
      }

      return derbyData;
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
      return [];
    }
  }, []);

  // Funzione per gestire il cambio di derby
  const handleChangeDerby = useCallback((event: SelectChangeEvent) => {
    const derbyId = event.target.value;
    const selectedDerby = derby.find((d) => d.id === derbyId) || null;
    setDerbySelezionato(selectedDerby);
  }, [derby]);

  return {
    derby,
    derbySelezionato,
    setDerbySelezionato,
    filtroDerby,
    setFiltroDerby,
    filtroDerbyIncarichi,
    setFiltroDerbyIncarichi,
    caricaDerby,
    handleChangeDerby,
  };
}; 