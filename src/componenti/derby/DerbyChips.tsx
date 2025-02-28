import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import { Derby } from '../../tipi/derby';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import UpdateIcon from '@mui/icons-material/Update';

export default function DerbyChips() {
  const [derbyAttivo, setDerbyAttivo] = useState<Derby | null>(null);
  const [prossimoDerby, setProssimoDerby] = useState<Derby | null>(null);
  const [isDerbyAttivoDisabled, setIsDerbyAttivoDisabled] = useState(false);

  useEffect(() => {
    // Ascolta il derby attivo
    const qAttivo = query(collection(db, 'derby'), where('attivo', '==', true));
    const unsubscribeAttivo = onSnapshot(qAttivo, (snapshot) => {
      if (!snapshot.empty) {
        setDerbyAttivo(snapshot.docs[0].data() as Derby);
      } else {
        setDerbyAttivo(null);
      }
    });

    // Ascolta il prossimo derby
    const qProssimo = query(collection(db, 'derby'), where('prossimo', '==', true));
    const unsubscribeProssimo = onSnapshot(qProssimo, (snapshot) => {
      if (!snapshot.empty) {
        setProssimoDerby(snapshot.docs[0].data() as Derby);
      } else {
        setProssimoDerby(null);
      }
    });

    // Controlla se è domenica dopo le 20:00
    const checkDerbyStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = domenica
      const hour = now.getHours();
      
      if (day === 0 && hour >= 20) {
        setIsDerbyAttivoDisabled(true);
      } else {
        setIsDerbyAttivoDisabled(false);
      }
    };

    // Esegui il controllo iniziale
    checkDerbyStatus();

    // Imposta un intervallo per controllare ogni minuto
    const interval = setInterval(checkDerbyStatus, 60000);

    return () => {
      unsubscribeAttivo();
      unsubscribeProssimo();
      clearInterval(interval);
    };
  }, []);

  const commonChipStyles = {
    height: 24,
    borderRadius: '16px',
    width: '100%',
    '& .MuiChip-label': {
      fontSize: '0.75rem',
      px: 2,
      py: 0.25
    },
    '& .MuiChip-icon': {
      fontSize: '0.9rem',
      ml: 0.5,
      mr: -0.5
    }
  };

  return (
    <Box sx={{ p: 1.5 }}>
      {/* Derby Attivo */}
      {derbyAttivo && (
        <Box sx={{ mb: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              mb: 0.5, 
              display: 'block', 
              color: 'text.secondary',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Derby in corso
          </Typography>
          <Chip
            icon={<EmojiEventsIcon />}
            label={derbyAttivo.nome}
            sx={{
              ...commonChipStyles,
              backgroundColor: isDerbyAttivoDisabled ? 'grey.300' : derbyAttivo.colore,
              color: isDerbyAttivoDisabled ? 'text.secondary' : '#fff',
              fontWeight: 500,
              boxShadow: isDerbyAttivoDisabled ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: isDerbyAttivoDisabled ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                filter: isDerbyAttivoDisabled ? 'none' : 'brightness(1.1)'
              }
            }}
          />
        </Box>
      )}

      {/* Prossimo Derby */}
      <Box>
        <Typography 
          variant="caption" 
          sx={{ 
            mb: 0.5, 
            display: 'block', 
            color: 'text.secondary',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Prossimo derby
        </Typography>
        <Chip
          icon={<UpdateIcon />}
          label={prossimoDerby ? prossimoDerby.nome : 'Da definire'}
          sx={{
            ...commonChipStyles,
            backgroundColor: prossimoDerby ? 'grey.200' : 'grey.100',
            color: 'text.secondary',
            fontWeight: 500,
            border: '1px solid',
            borderColor: 'grey.300',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: prossimoDerby ? 'grey.300' : 'grey.200'
            }
          }}
        />
      </Box>
    </Box>
  );
} 