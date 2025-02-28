import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Avatar,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../configurazione/firebase';

interface Props {
  cartella: string; // cartella in Firebase Storage (es: 'edifici', 'giocatori', 'farm')
  id: string; // ID dell'elemento a cui associare l'immagine
  urlImmagine?: string; // URL dell'immagine esistente
  onImmagineCaricata: (url: string) => void; // Callback quando l'immagine viene caricata
  onImmagineEliminata: () => void; // Callback quando l'immagine viene eliminata
  dimensione?: number; // Dimensione dell'anteprima in pixel
}

export default function UploadImmagine({
  cartella,
  id,
  urlImmagine,
  onImmagineCaricata,
  onImmagineEliminata,
  dimensione = 200,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    // Verifica il tipo di file
    if (!file.type.startsWith('image/')) {
      setError('Per favore seleziona un\'immagine');
      return;
    }

    // Verifica la dimensione del file (1MB = 1024 * 1024 bytes)
    if (file.size > 1024 * 1024) {
      setError('L\'immagine deve essere più piccola di 1MB');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Se c'è già un'immagine, eliminiamola
      if (urlImmagine) {
        const vecchioRef = ref(storage, urlImmagine);
        try {
          await deleteObject(vecchioRef);
        } catch (error) {
          console.error('Errore nell\'eliminazione della vecchia immagine:', error);
        }
      }

      // Mantieni l'estensione originale del file
      const estensione = file.name.split('.').pop() || 'jpg';
      const nomeFile = `${cartella}/${id}.${estensione}`;
      const storageRef = ref(storage, nomeFile);

      // Carica il file originale
      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      };

      await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      onImmagineCaricata(downloadURL);
    } catch (error) {
      console.error('Errore nel caricamento dell\'immagine:', error);
      setError('Errore nel caricamento dell\'immagine');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  const handleDelete = async () => {
    if (!urlImmagine) return;

    setLoading(true);
    try {
      const imageRef = ref(storage, urlImmagine);
      await deleteObject(imageRef);
      onImmagineEliminata();
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'immagine:', error);
      setError('Errore nell\'eliminazione dell\'immagine');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleUpload(file);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Area di preview/upload */}
      <Box
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          width: dimensione,
          height: dimensione,
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out',
          bgcolor: isDragging ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : urlImmagine ? (
          <>
            <Avatar
              src={urlImmagine}
              variant="square"
              sx={{
                width: '100%',
                height: '100%',
              }}
            />
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
              onClick={handleDelete}
            >
              <DeleteIcon sx={{ color: 'white' }} />
            </IconButton>
          </>
        ) : (
          <Button
            onClick={handleClick}
            sx={{ height: '100%', width: '100%' }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <AddPhotoAlternateIcon sx={{ fontSize: 32, mb: 1, color: 'action.active' }} />
              <Typography variant="body2" color="text.secondary">
                {isDragging ? 'Rilascia qui' : 'Carica icona'}
              </Typography>
            </Box>
          </Button>
        )}
      </Box>

      {error && (
        <Typography color="error" variant="caption">
          {error}
        </Typography>
      )}
    </Box>
  );
}
