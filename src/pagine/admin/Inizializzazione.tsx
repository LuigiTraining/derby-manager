import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import Layout from '../../componenti/layout/Layout';
import { initializeFirebase } from '../../scripts/initializeFirebase';

export default function Inizializzazione() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await initializeFirebase();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'inizializzazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h4" gutterBottom>
            Inizializzazione Sistema
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            Questa pagina permette di inizializzare il sistema con i dati di base necessari.
            Usa questo strumento solo durante la prima configurazione o se hai bisogno di reimpostare i dati di esempio.
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            Attenzione: questa operazione creerà le collezioni e i documenti di base nel database.
            Se esistono già dei dati, verranno sovrascritti.
          </Alert>

          <Button
            variant="contained"
            color="primary"
            onClick={handleInitialize}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Inizializzazione in corso...
              </>
            ) : (
              'Inizializza Sistema'
            )}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success">
              Inizializzazione completata con successo!
            </Alert>
          )}
        </Paper>
      </Box>
    </Layout>
  );
} 