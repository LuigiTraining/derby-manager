import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Avatar,
} from '@mui/material';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getUrlImmagineHayDay, getImmagineFallback } from '../../servizi/immaginiEsterne';

interface Props {
  urlImmagine?: string; // URL dell'immagine in Firebase Storage
  nomeIncarico: string; // Nome dell'incarico per cercare su Hay Day Wiki
  dimensione?: number; // Dimensione dell'anteprima in pixel
  mostraFallback?: boolean; // Se mostrare un'immagine di fallback quando non c'è immagine
}

export default function ImmagineIncarico({
  urlImmagine,
  nomeIncarico,
  dimensione = 40,
  mostraFallback = true,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const caricaImmagine = async () => {
      setLoading(true);
      setError('');

      try {
        // Strategia 1: Usa l'URL di Firebase se disponibile
        if (urlImmagine) {
          if (urlImmagine.startsWith('https://')) {
            setImageUrl(urlImmagine);
            setLoading(false);
            return;
          }

          try {
            const storage = getStorage();
            
            if (!urlImmagine.includes('/o/')) {
              const imageRef = ref(storage, urlImmagine);
              const url = await getDownloadURL(imageRef);
              setImageUrl(url);
              setLoading(false);
              return;
            }

            const imagePath = urlImmagine.split('/o/')[1]?.split('?')[0];
            if (imagePath) {
              const decodedPath = decodeURIComponent(imagePath);
              const imageRef = ref(storage, decodedPath);
              const url = await getDownloadURL(imageRef);
              setImageUrl(url);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.warn(`Errore nel caricamento dell'immagine da Firebase per ${nomeIncarico}:`, error);
            // Continua con la strategia successiva
          }
        }

        // Strategia 2: Cerca su Hay Day Wiki
        const hayDayUrl = getUrlImmagineHayDay(nomeIncarico);
        if (hayDayUrl) {
          setImageUrl(hayDayUrl);
          setLoading(false);
          return;
        }

        // Strategia 3: Usa l'immagine di fallback
        if (mostraFallback) {
          setImageUrl(getImmagineFallback(nomeIncarico.charAt(0)));
        } else {
          setError('Immagine non disponibile');
        }
      } catch (error) {
        console.error(`Errore nel caricamento dell'immagine per ${nomeIncarico}:`, error);
        setError('Errore nel caricamento dell\'immagine');
      } finally {
        setLoading(false);
      }
    };

    caricaImmagine();
  }, [urlImmagine, nomeIncarico, mostraFallback]);

  return (
    <Box
      sx={{
        width: dimensione,
        height: dimensione,
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'grey.100',
      }}
    >
      {loading ? (
        <CircularProgress size={dimensione / 2} />
      ) : error ? (
        <Typography variant="caption" color="error" sx={{ fontSize: dimensione / 4 }}>
          {nomeIncarico.charAt(0)}
        </Typography>
      ) : (
        <Avatar
          src={imageUrl}
          alt={nomeIncarico}
          variant="square"
          sx={{
            width: '100%',
            height: '100%',
          }}
        />
      )}
    </Box>
  );
}
