import React, { useMemo } from 'react';

const MieiIncarichi: React.FC = () => {
  const incarichi = []; // Replace with actual incarichi data
  const ordinamento = ''; // Replace with actual sorting logic
  const mostraSoloAssegnati = false; // Replace with actual logic to determine if showing only assigned incarichi
  const isIncaricoAssegnato = (id: string) => true; // Replace with actual logic to check if an incarico is assigned

  const incarichiDaMostrare = useMemo(() => {
    // Prima filtriamo SEMPRE gli incarichi in base a mostraSoloAssegnati
    const incarichiVisibili = mostraSoloAssegnati 
      ? incarichi.filter(inc => isIncaricoAssegnato(inc.id))
      : incarichi;

    // Poi applichiamo l'ordinamento se richiesto
    if (ordinamento) {
      return [...incarichiVisibili].sort((a, b) => {
        const nomeA = (a.nome || '').toLowerCase();
        const nomeB = (b.nome || '').toLowerCase();
        return ordinamento === 'asc' 
          ? nomeA.localeCompare(nomeB)
          : nomeB.localeCompare(nomeA);
      });
    }
    return incarichiVisibili; // Ritorniamo gli incarichi filtrati anche senza ordinamento
  }, [incarichi, ordinamento, mostraSoloAssegnati, isIncaricoAssegnato]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default MieiIncarichi; 