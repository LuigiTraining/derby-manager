import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const MieiIncarichi: React.FC = () => {
  const { t } = useTranslation();
  const incarichi = []; // Replace with actual incarichi data
  const ordinamento = ""; // Replace with actual sorting logic
  const mostraSoloAssegnati = false; // Replace with actual logic to determine if showing only assigned incarichi
  const isIncaricoAssegnato = (id: string) => true; // Replace with actual logic to check if an incarico is assigned

  // Funzione per tradurre il nome dell'incarico
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
    });
    return traduzione;
  };

  const incarichiDaMostrare = useMemo(() => {
    // Prima filtriamo SEMPRE gli incarichi in base a mostraSoloAssegnati
    const incarichiVisibili = mostraSoloAssegnati
      ? incarichi.filter((inc) => isIncaricoAssegnato(inc.id))
      : incarichi;

    // Poi applichiamo l'ordinamento se richiesto
    if (ordinamento) {
      return [...incarichiVisibili].sort((a, b) => {
        const nomeA = (getTranslatedName(a.nome) || "").toLowerCase();
        const nomeB = (getTranslatedName(b.nome) || "").toLowerCase();
        return ordinamento === "asc"
          ? nomeA.localeCompare(nomeB)
          : nomeB.localeCompare(nomeA);
      });
    }
    return incarichiVisibili; // Ritorniamo gli incarichi filtrati anche senza ordinamento
  }, [incarichi, ordinamento, mostraSoloAssegnati, isIncaricoAssegnato]);

  return (
    <div>
      {/* Quando renderizzi gli incarichi, usa getTranslatedName(incarico.nome) */}
      {incarichiDaMostrare.map((incarico) => (
        <div key={incarico.id}>{getTranslatedName(incarico.nome)}</div>
      ))}
    </div>
  );
};

export default MieiIncarichi;
