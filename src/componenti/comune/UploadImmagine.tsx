import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import LinkIcon from '@mui/icons-material/Link';
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
  const [dialogoUrlAperto, setDialogoUrlAperto] = useState(false);
  const [urlEsterno, setUrlEsterno] = useState('');
  const [erroreUrl, setErroreUrl] = useState('');
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
      // Se c'è già un'immagine, proviamo ad eliminarla
      if (urlImmagine) {
        // Verifica se l'URL è da Firebase Storage (non eliminare URL esterni)
        if (urlImmagine.includes('firebasestorage.googleapis.com')) {
          try {
            const vecchioRef = ref(storage, urlImmagine);
            await deleteObject(vecchioRef);
          } catch (error) {
            // Ignoriamo l'errore se l'immagine non esiste più
            console.warn('Immagine precedente non trovata:', error);
          }
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
      // Verifica se l'URL è da Firebase Storage
      if (urlImmagine.includes('firebasestorage.googleapis.com')) {
        try {
          const imageRef = ref(storage, urlImmagine);
          await deleteObject(imageRef);
        } catch (error) {
          // Ignoriamo l'errore se l'immagine non esiste più
          console.warn('Immagine già eliminata:', error);
        }
      }
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

  const apriDialogoUrl = () => {
    setDialogoUrlAperto(true);
    setUrlEsterno('');
    setErroreUrl('');
  };

  const chiudiDialogoUrl = () => {
    setDialogoUrlAperto(false);
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleUsaUrl = () => {
    if (!validateUrl(urlEsterno)) {
      setErroreUrl('URL non valido');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Controlla se l'URL è un'immagine
    fetch(urlEsterno, { method: 'HEAD' })
      .then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          // Se abbiamo un URL di Firebase Storage, eliminiamo la vecchia immagine
          if (urlImmagine && urlImmagine.includes('firebasestorage.googleapis.com')) {
            const vecchioRef = ref(storage, urlImmagine);
            deleteObject(vecchioRef).catch(error => {
              console.error('Errore nell\'eliminazione della vecchia immagine:', error);
            });
          }
          
          // Usa direttamente l'URL esterno
          onImmagineCaricata(urlEsterno);
          chiudiDialogoUrl();
        } else {
          setErroreUrl('L\'URL non contiene un\'immagine valida');
        }
      })
      .catch(error => {
        console.error('Errore nel controllare l\'URL:', error);
        setErroreUrl('Impossibile accedere all\'URL');
      })
      .finally(() => {
        setLoading(false);
      });
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
            {urlImmagine && !urlImmagine.includes('firebasestorage.googleapis.com') && (
              <Chip
                label="URL"
                size="small"
                color="primary"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  fontSize: '0.7rem',
                  height: 20,
                  opacity: 0.8,
                }}
              />
            )}
          </>
        ) : (
          <Stack direction="column" spacing={1} sx={{ width: '100%', height: '100%' }}>
            <Button
              onClick={handleClick}
              sx={{ height: '50%', width: '100%' }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <AddPhotoAlternateIcon sx={{ fontSize: 32, mb: 1, color: 'action.active' }} />
                <Typography variant="body2" color="text.secondary">
                  {isDragging ? 'Rilascia qui' : 'Carica dal PC'}
                </Typography>
              </Box>
            </Button>
            <Button
              onClick={apriDialogoUrl}
              sx={{ height: '50%', width: '100%' }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <LinkIcon sx={{ fontSize: 32, mb: 1, color: 'action.active' }} />
                <Typography variant="body2" color="text.secondary">
                  Usa URL esterno
                </Typography>
              </Box>
            </Button>
          </Stack>
        )}
      </Box>

      {error && (
        <Typography color="error" variant="caption">
          {error}
        </Typography>
      )}

      {/* Dialogo per inserire URL */}
      <Dialog open={dialogoUrlAperto} onClose={chiudiDialogoUrl}>
        <DialogTitle>Inserisci URL dell'immagine</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL dell'immagine"
            type="url"
            fullWidth
            variant="outlined"
            value={urlEsterno}
            onChange={(e) => setUrlEsterno(e.target.value)}
            error={!!erroreUrl}
            helperText={erroreUrl}
            placeholder="https://static.wikia.nocookie.net/hayday/images/4/47/Bakery.png"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={chiudiDialogoUrl}>Annulla</Button>
          <Button onClick={handleUsaUrl} disabled={!urlEsterno}>Usa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
