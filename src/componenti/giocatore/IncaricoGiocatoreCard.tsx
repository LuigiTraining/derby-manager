import React, { useEffect, useState } from 'react';

const IncaricoGiocatoreCard = () => {
  const [valoreIniziale, setValoreIniziale] = useState(null);
  const [valoreLocale, setValoreLocale] = useState(null);
  const [incarico, setIncarico] = useState(null);

  // Utilizza useEffect per impostare il valore iniziale quando il componente viene montato
  useEffect(() => {
    if (valoreIniziale !== undefined && valoreLocale === undefined) {
      setValoreLocale(valoreIniziale);
    }
  }, [valoreIniziale, incarico.id, valoreLocale]);

  return (
    <div>
      {/* Renderizza il componente */}
    </div>
  );
};

export default IncaricoGiocatoreCard; 