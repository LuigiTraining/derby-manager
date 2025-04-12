import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PersonIcon from '@mui/icons-material/Person';
import { collection, query, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from '../../configurazione/firebase';
import { ElementoCitta, TipoElementoCitta } from '../../tipi/citta';
import Layout from '../../componenti/layout/Layout';
import { useAuth } from '../../componenti/autenticazione/AuthContext';
import UploadImmagine from '../../componenti/comune/UploadImmagine';

interface FormData {
  nome: string;
  tipo: TipoElementoCitta;
  immagine: string;
  livello_minimo: number;
}

const formIniziale: FormData = {
  nome: '',
  tipo: 'edificio',
  immagine: '',
  livello_minimo: 1,
};

export default function GestioneCitta() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<TipoElementoCitta>('edificio');
  const [elementi, setElementi] = useState<ElementoCitta[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<FormData>(formIniziale);
  const [editingElemento, setEditingElemento] = useState<ElementoCitta | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<{ id: string; element: HTMLElement } | null>(null);

  // Carica gli elementi dal database
  const caricaElementi = async () => {
    try {
      const elementiQuery = query(collection(db, 'elementi_citta'));
      const snapshot = await getDocsWithRateLimit(elementiQuery);
      const elementiData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ElementoCitta[];
      setElementi(elementiData);
    } catch (error) {
      console.error('Errore nel caricamento degli elementi:', error);
      setError('Errore nel caricamento degli elementi');
    }
  };

  useEffect(() => {
    caricaElementi();
  }, []);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: TipoElementoCitta) => {
    setTab(newValue);
  };

  const handleOpenDialog = (elemento?: ElementoCitta) => {
    if (elemento) {
      setEditingElemento(elemento);
      setFormData({
        nome: elemento.nome,
        tipo: elemento.tipo,
        immagine: elemento.immagine,
        livello_minimo: elemento.livello_minimo,
      });
    } else {
      setEditingElemento(null);
      setFormData({ ...formIniziale, tipo: tab });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(formIniziale);
    setEditingElemento(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      if (!formData.nome) {
        setError('Il nome è obbligatorio');
        return;
      }

      if (!formData.immagine) {
        setError('L\'immagine è obbligatoria');
        return;
      }

      if (formData.livello_minimo < 1) {
        setError('Il livello minimo deve essere maggiore di 0');
        return;
      }

      const elementoData: ElementoCitta = {
        id: editingElemento?.id || crypto.randomUUID(),
        ...formData,
        data_creazione: editingElemento?.data_creazione || Timestamp.now(),
      };

      await setDocWithRateLimit(doc(db, 'elementi_citta', elementoData.id), elementoData);

      setSuccess(editingElemento ? 'Elemento aggiornato con successo!' : 'Elemento creato con successo!');
      handleCloseDialog();
      caricaElementi();
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setError('Errore nel salvataggio dell\'elemento');
    }
  };

  const handleDelete = async (elemento: ElementoCitta) => {
    if (!window.confirm(`Sei sicuro di voler eliminare ${elemento.nome}?`)) {
      return;
    }

    try {
      await deleteDocWithRateLimit(doc(db, 'elementi_citta', elemento.id));
      setSuccess('Elemento eliminato con successo!');
      caricaElementi();
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      setError('Errore nell\'eliminazione dell\'elemento');
    }
  };

  const elementiFiltrati = elementi.filter(e => e.tipo === tab);

  return (
    <Layout>
      <Box sx={{ maxWidth: '100%', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestione Città
        </Typography>

        <Tabs value={tab} onChange={handleChangeTab} sx={{ mb: 3 }}>
          <Tab label="Edifici" value="edificio" />
          <Tab label="Visitatori" value="visitatore" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ mb: 3 }}
        >
          Nuovo {tab === 'edificio' ? 'Edificio' : 'Visitatore'}
        </Button>

        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              {elementiFiltrati.map((elemento, index) => (
                <TableRow key={elemento.id}>
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
                        {elemento.livello_minimo}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 2 }}>
                      {elemento.immagine ? (
                        <Avatar
                          src={elemento.immagine}
                          alt={elemento.nome}
                          variant="rounded"
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ width: 40, height: 40, bgcolor: 'grey.300' }}
                        >
                          {elemento.tipo === 'edificio' ? <LocationCityIcon /> : <PersonIcon />}
                        </Avatar>
                      )}
                      <Typography>{elemento.nome}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAnchorEl({ id: elemento.id, element: event.currentTarget });
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
              const elemento = elementi.find(e => e.id === anchorEl.id);
              if (elemento) {
                handleOpenDialog(elemento);
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
              handleDelete(elementi.find(e => e.id === anchorEl.id)!);
              setAnchorEl(null);
            }
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Elimina</ListItemText>
          </MenuItem>
        </Menu>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingElemento ? 'Modifica' : 'Nuovo'} {tab === 'edificio' ? 'Edificio' : 'Visitatore'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                fullWidth
                size="small"
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Immagine {tab === 'edificio' ? 'Edificio' : 'Visitatore'}
                </Typography>
                <UploadImmagine
                  cartella={`elementi_citta/${tab}`}
                  id={editingElemento?.id || 'nuovo'}
                  urlImmagine={formData.immagine}
                  onImmagineCaricata={(url) => setFormData({ ...formData, immagine: url })}
                  onImmagineEliminata={() => setFormData({ ...formData, immagine: '' })}
                  dimensione={120}
                />
              </Box>
              <TextField
                label="Livello Minimo"
                type="number"
                value={formData.livello_minimo}
                onChange={(e) => setFormData({ ...formData, livello_minimo: parseInt(e.target.value) || 0 })}
                fullWidth
                size="small"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
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