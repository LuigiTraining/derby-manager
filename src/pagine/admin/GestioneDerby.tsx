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
  Switch,
  FormControlLabel,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, Timestamp, writeBatch, getDocs, where, getDoc } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from '../../configurazione/firebase';
import { useAuth } from '../../componenti/autenticazione/AuthContext';
import { Derby } from '../../tipi/derby';
import Layout from '../../componenti/layout/Layout';
import { ChromePicker } from 'react-color';

export default function GestioneDerby() {
  const { currentUser } = useAuth();
  const [derby, setDerby] = useState<Derby[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDerby, setEditingDerby] = useState<Derby | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    attivo: false,
    prossimo: false,
    colore: '#1976d2' // colore di default
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDerbyId, setSelectedDerbyId] = useState<string | null>(null);
  const [openProssimoDialog, setOpenProssimoDialog] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'derby'), orderBy('data_creazione', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const derbyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Derby[];
      setDerby(derbyData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenDialog = (derbyToEdit?: Derby) => {
    if (derbyToEdit) {
      setEditingDerby(derbyToEdit);
      setFormData({
        nome: derbyToEdit.nome,
        attivo: derbyToEdit.attivo,
        prossimo: derbyToEdit.prossimo || false,
        colore: derbyToEdit.colore || '#1976d2'
      });
    } else {
      setEditingDerby(null);
      setFormData({
        nome: '',
        attivo: false,
        prossimo: false,
        colore: '#1976d2'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDerby(null);
    setFormData({
      nome: '',
      attivo: false,
      prossimo: false,
      colore: '#1976d2'
    });
    setShowColorPicker(false);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!formData.nome.trim()) return;

    try {
      const derbyData: Partial<Derby> = {
        nome: formData.nome.trim(),
        attivo: formData.attivo,
        prossimo: formData.prossimo,
        colore: formData.colore,
        data_modifica: Timestamp.now()
      };

      const batch = writeBatch(db);

      if (formData.attivo) {
        const derbyAttivoQuery = query(collection(db, 'derby'), where('attivo', '==', true));
        const derbyAttivoSnapshot = await getDocsWithRateLimit(derbyAttivoQuery);
        
        derbyAttivoSnapshot.docs.forEach(doc => {
          if (doc.id !== editingDerby?.id) {
            batch.update(doc.ref, { attivo: false });
          }
        });
      }

      if (formData.prossimo) {
        const derbyProssimoQuery = query(collection(db, 'derby'), where('prossimo', '==', true));
        const derbyProssimoSnapshot = await getDocsWithRateLimit(derbyProssimoQuery);
        
        derbyProssimoSnapshot.docs.forEach(doc => {
          if (doc.id !== editingDerby?.id) {
            batch.update(doc.ref, { prossimo: false });
          }
        });
      }

      if (editingDerby) {
        batch.update(doc(db, 'derby', editingDerby.id), derbyData);
      } else {
        const newDerbyRef = doc(collection(db, 'derby'));
        batch.set(newDerbyRef, {
          ...derbyData,
          id: newDerbyRef.id,
          data_creazione: Timestamp.now(),
          creato_da: currentUser.id
        });
      }

      await batch.commit();
      handleCloseDialog();
    } catch (error) {
      console.error('Errore durante il salvataggio del derby:', error);
    }
  };

  const handleDelete = async (derbyId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo derby?')) return;

    try {
      await deleteDocWithRateLimit(doc(db, 'derby', derbyId));
    } catch (error) {
      console.error('Errore durante l\'eliminazione del derby:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, derbyId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDerbyId(derbyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDerbyId(null);
  };

  const handleToggleActive = async (derbyId: string, currentActive: boolean) => {
    try {
      if (currentActive) {
        await updateDocWithRateLimit(doc(db, 'derby', derbyId), {
          attivo: false,
          data_modifica: Timestamp.now()
        });
      } else {
        const derbyAttivoQuery = query(collection(db, 'derby'), where('attivo', '==', true));
        const derbyAttivoSnapshot = await getDocsWithRateLimit(derbyAttivoQuery);
        
        const batch = writeBatch(db);
        
        derbyAttivoSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { 
            attivo: false,
            data_modifica: Timestamp.now()
          });
        });

        batch.update(doc(db, 'derby', derbyId), {
          attivo: true,
          data_modifica: Timestamp.now()
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato del derby:', error);
    }
  };

  const handleSetProssimo = async (derbyId: string) => {
    try {
      const derbyRef = doc(db, 'derby', derbyId);
      const derbySnap = await getDocWithRateLimit(derbyRef);
      const isProssimo = derbySnap.data()?.prossimo || false;

      const batch = writeBatch(db);

      if (!isProssimo) {
        const derbyProssimoQuery = query(collection(db, 'derby'), where('prossimo', '==', true));
        const derbyProssimoSnapshot = await getDocsWithRateLimit(derbyProssimoQuery);
        
        derbyProssimoSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { prossimo: false });
        });

        batch.update(derbyRef, { 
          prossimo: true,
          data_modifica: Timestamp.now()
        });
      } else {
        batch.update(derbyRef, { 
          prossimo: false,
          data_modifica: Timestamp.now()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Errore durante l\'impostazione del prossimo derby:', error);
    }
  };

  // Se l'utente non è admin o coordinatore, mostra messaggio di errore
  if (!['admin', 'coordinatore'].includes(currentUser?.ruolo || '')) {
    return (
      <Layout>
        <Typography>Non hai i permessi per accedere a questa pagina.</Typography>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          gap: 2,
          mb: 3 
        }}>
          <Typography variant="h5" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>Gestione Derby</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              fullWidth
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Nuovo Derby
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table sx={{ 
            width: '100%',
            minWidth: { xs: '100%', sm: 650 }, // su mobile occupa il 100%, su desktop minimo 650px
            '& .MuiTableCell-root': { // riduco il padding delle celle su mobile
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 1.5 },
              '&:last-child': {
                pr: { xs: 1, sm: 2 }
              }
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { xs: '25%', sm: '30%' } }}>Nome</TableCell>
                <TableCell sx={{ width: { xs: '25%', sm: '25%' } }}>Stato</TableCell>
                <TableCell sx={{ width: { xs: '15%', sm: '15%' } }}>Colore</TableCell>
                <TableCell sx={{ width: { xs: '25%', sm: '15%' } }}>Prossimo</TableCell>
                <TableCell align="right" sx={{ width: { xs: '10%', sm: '15%' } }}>Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {derby.map((d) => (
                <TableRow key={d.id}>
                  <TableCell sx={{ 
                    typography: { xs: 'body2', sm: 'body1' }  // testo più piccolo su mobile
                  }}>
                    {d.nome}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={d.attivo ? 'Attivo' : 'Non attivo'}
                      color={d.attivo ? 'success' : 'default'}
                      sx={{ 
                        cursor: 'pointer',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }, // testo più piccolo su mobile
                        height: { xs: 24, sm: 32 }, // chip più piccolo su mobile
                        '& .MuiChip-label': {
                          px: { xs: 1, sm: 2 }
                        }
                      }}
                      onClick={() => handleToggleActive(d.id, d.attivo)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: { xs: 24, sm: 30 }, // cerchio più piccolo su mobile
                        height: { xs: 24, sm: 30 },
                        borderRadius: '50%',
                        backgroundColor: d.colore || '#1976d2',
                        border: '1px solid #ddd'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={d.prossimo ? 'Prossimo' : 'No'}
                      color={d.prossimo ? 'primary' : 'default'}
                      sx={{ 
                        cursor: 'pointer',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }, // testo più piccolo su mobile
                        height: { xs: 24, sm: 32 }, // chip più piccolo su mobile
                        '& .MuiChip-label': {
                          px: { xs: 1, sm: 2 }
                        }
                      }}
                      onClick={() => handleSetProssimo(d.id)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, d.id)}
                      sx={{
                        padding: { xs: 0.5, sm: 1 } // padding più piccolo su mobile
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: { xs: 150, sm: 200 }, // menu più stretto su mobile
              '& .MuiMenuItem-root': {
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                typography: { xs: 'body2', sm: 'body1' }
              }
            }
          }}
        >
          <MenuItem onClick={() => {
            const derbySelezionato = derby.find(d => d.id === selectedDerbyId);
            if (derbySelezionato) handleOpenDialog(derbySelezionato);
            handleMenuClose();
          }}>
            <EditIcon sx={{ mr: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
            Modifica
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedDerbyId) handleDelete(selectedDerbyId);
            handleMenuClose();
          }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
            Elimina
          </MenuItem>
        </Menu>

        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              width: { xs: '95%', sm: '100%' },
              m: { xs: 1, sm: 2 }
            }
          }}
        >
          <DialogTitle>
            {editingDerby ? 'Modifica Derby' : 'Nuovo Derby'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.attivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, attivo: e.target.checked }))}
                  />
                }
                label="Derby Attivo"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.prossimo}
                    onChange={(e) => setFormData(prev => ({ ...prev, prossimo: e.target.checked }))}
                  />
                }
                label="Prossimo Derby"
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Colore del Derby
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: formData.colore,
                      cursor: 'pointer',
                      border: '2px solid #ddd'
                    }}
                  />
                  {showColorPicker && (
                    <Box sx={{ position: 'absolute', zIndex: 2 }}>
                      <Box
                        sx={{
                          position: 'fixed',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                        }}
                        onClick={() => setShowColorPicker(false)}
                      />
                      <ChromePicker
                        color={formData.colore}
                        onChange={(color) => setFormData(prev => ({ ...prev, colore: color.hex }))}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annulla</Button>
            <Button onClick={handleSave} variant="contained">
              Salva
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
} 