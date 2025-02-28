import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import Layout from '../../componenti/layout/Layout';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import { Edificio } from '../../tipi/edificio';
import UploadImmagine from '../../componenti/comune/UploadImmagine';
import { useAuth } from '../../componenti/autenticazione/AuthContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function GestioneEdifici() {
  const [edifici, setEdifici] = useState<Edificio[]>([]);
  const [editingEdificio, setEditingEdificio] = useState<Edificio | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const { currentUser } = useAuth();
  const canEdit = ['admin', 'coordinatore'].includes(currentUser?.ruolo || '');
  const [anchorEl, setAnchorEl] = useState<{ id: string; element: HTMLElement } | null>(null);

  // Carica gli edifici dal database
  const caricaEdifici = async () => {
    try {
      const edificiRef = collection(db, 'edifici');
      const snapshot = await getDocs(edificiRef);
      const edificiData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Edificio);
      setEdifici(edificiData);
    } catch (error) {
      console.error('Errore nel caricamento degli edifici:', error);
      setError('Errore nel caricamento degli edifici');
    }
  };

  useEffect(() => {
    caricaEdifici();
  }, []);

  const handleAddEdificio = () => {
    setEditingEdificio({ id: '', nome: '', livello: 0, immagine: '' });
    setFormData({
      nome: '',
      livello: '',
      immagine: '',
    });
  };

  const handleEditEdificio = (edificio: Edificio) => {
    setEditingEdificio(edificio);
    setFormData({
      nome: edificio.nome,
      livello: edificio.livello.toString(),
      immagine: edificio.immagine,
    });
  };

  const handleDeleteEdificio = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo edificio?')) {
      try {
        await deleteDoc(doc(db, 'edifici', id));
        setSuccess('Edificio eliminato con successo!');
        caricaEdifici();
      } catch (error) {
        console.error('Errore nell\'eliminazione:', error);
        setError('Errore durante l\'eliminazione');
      }
    }
  };

  const handleSaveEdificio = async () => {
    try {
      if (!formData.nome || !formData.livello) {
        setError('Compila tutti i campi obbligatori');
        return;
      }

      const edificioData: Edificio = {
        id: editingEdificio?.id || crypto.randomUUID(),
        nome: formData.nome,
        livello: parseInt(formData.livello),
        immagine: formData.immagine || '',
      };

      await setDoc(doc(db, 'edifici', edificioData.id), edificioData);
      setSuccess(editingEdificio ? 'Edificio aggiornato con successo!' : 'Edificio creato con successo!');
      // Reset del form e chiusura del dialog
      setEditingEdificio(null);
      setFormData({ nome: '', livello: '', immagine: '' });
      caricaEdifici();
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setError('Errore durante il salvataggio');
    }
  };

  const [formData, setFormData] = useState({
    nome: '',
    livello: '',
    immagine: '',
  });

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Contatore edifici */}
        <Box 
          sx={{ 
            mb: 3,
            p: 2,
            bgcolor: 'rgba(33, 150, 243, 0.04)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            TOTALE EDIFICI:
          </Typography>
          <Typography 
            sx={{ 
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'primary.main'
            }}
          >
            {edifici.length}
          </Typography>
        </Box>

        {canEdit && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddEdificio}
              sx={{ 
                minWidth: 'auto',
                height: 36,
                px: 2
              }}
            >
              EDIFICIO
            </Button>
          </Box>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              {edifici.sort((a, b) => a.livello - b.livello).map((edificio, index) => (
                <TableRow key={edificio.id}>
                  <TableCell sx={{ width: '50px' }}>
                    <Typography variant="body2" color="text.secondary">
                      #{index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ position: 'relative', pl: 3 }}>
                    {/* Strisciolina del livello */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '24px',
                        bgcolor: 'rgb(33, 150, 243, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                          color: 'rgb(33, 150, 243)',
                          width: '3ch',
                          textAlign: 'center'
                        }}
                      >
                        {edificio.livello}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 2 }}>
                      {edificio.immagine ? (
                        <Avatar
                          src={edificio.immagine}
                          alt={edificio.nome}
                          variant="rounded"
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ width: 40, height: 40, bgcolor: 'grey.300' }}
                        >
                          <BusinessIcon />
                        </Avatar>
                      )}
                      <Typography>{edificio.nome}</Typography>
                    </Box>
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          setAnchorEl({ id: edificio.id, element: event.currentTarget });
                        }}
                        sx={{ 
                          width: 28,
                          height: 28,
                          color: 'text.secondary'
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Menu per Modifica/Elimina */}
        <Menu
          anchorEl={anchorEl?.element}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            if (anchorEl) {
              const edificio = edifici.find(e => e.id === anchorEl.id);
              if (edificio) {
                handleEditEdificio(edificio);
                setAnchorEl(null);
              }
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Modifica</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            if (anchorEl) {
              handleDeleteEdificio(anchorEl.id);
              setAnchorEl(null);
            }
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Elimina</ListItemText>
          </MenuItem>
        </Menu>

        {/* Dialog per aggiungere/modificare edificio (per admin e moderatori) */}
        {canEdit && (
          <Dialog open={!!editingEdificio} onClose={() => setEditingEdificio(null)}>
            <DialogTitle>
              {editingEdificio?.id ? 'Modifica Edificio' : 'Nuovo Edificio'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ 
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <TextField
                  required
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  fullWidth
                  size="small"
                />

                <TextField
                  required
                  label="Livello"
                  type="number"
                  value={formData.livello}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setFormData({ ...formData, livello: value });
                    }
                  }}
                  fullWidth
                  size="small"
                  InputProps={{ inputProps: { min: 1 } }}
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Immagine Edificio
                  </Typography>
                  <UploadImmagine
                    cartella="edifici"
                    id={editingEdificio?.id || 'nuovo'}
                    urlImmagine={formData.immagine}
                    onImmagineCaricata={(url) => setFormData({ ...formData, immagine: url })}
                    onImmagineEliminata={() => setFormData({ ...formData, immagine: '' })}
                    dimensione={120}
                  />
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setEditingEdificio(null)}>ANNULLA</Button>
              <Button onClick={handleSaveEdificio} variant="contained">SALVA</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Snackbar per messaggi di successo/errore */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
