import React, { useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { aggiornaTuttiDati } from '../../servizi/gestioneCache';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import { useTranslation } from 'react-i18next';

interface AggiornaDatiButtonProps {
  userId?: string;
  onAggiornamentoCompletato?: () => void;
  caricaProgressiDalServer?: () => Promise<boolean | void>;
}

const AggiornaDatiButton: React.FC<AggiornaDatiButtonProps> = ({ 
  userId, 
  onAggiornamentoCompletato,
  caricaProgressiDalServer
}) => {
  const [caricamento, setCaricamento] = useState(false);
  const { t } = useTranslation();
  
  const handleAggiornaDati = async () => {
    if (!userId) return;
    
    setCaricamento(true);
    
    try {
      await aggiornaTuttiDati(userId);
      
      if (caricaProgressiDalServer) {
        console.log("AggiornaDatiButton: Caricamento progressi dal server");
        await caricaProgressiDalServer();
      }
      
      if (onAggiornamentoCompletato) {
        onAggiornamentoCompletato();
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento dei dati:", error);
    } finally {
      setCaricamento(false);
    }
  };
  
  return (
    <Tooltip title={t('messaggi.aggiorna_tooltip')}>
      <Button
        variant="contained"
        color="primary"
        startIcon={caricamento ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
        onClick={handleAggiornaDati}
        disabled={caricamento}
      >
        {t('pulsanti.aggiorna')}
      </Button>
    </Tooltip>
  );
};

export default AggiornaDatiButton; 