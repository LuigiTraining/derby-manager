import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Layout from '../../componenti/layout/Layout';
import { collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';

interface Requisito {
  id: string;
  testo: string;
  obbligatorio: boolean;
}

interface Impostazioni {
  requisiti: Requisito[];
  descrizione_registrazione?: string;
  descrizione_presentazione?: string;
}

interface RichiestaRegistrazione {
  id: string;
  nome: string;
  contatto: string;
  presentazione: string;
  farm: {
    nome: string;
    livello: number;
    stato: string;
  };
  requisiti_accettati: string[];
  stato: 'in_attesa' | 'approvata' | 'rifiutata';
  data_richiesta: string;
  data_risposta?: string;
}

// Funzione per generare un PIN casuale a 6 cifre
const generaPIN = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

export default function Impostazioni() {
  const [requisiti, setRequisiti] = useState<Requisito[]>([]);
  const [nuovoRequisito, setNuovoRequisito] = useState('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [richieste, setRichieste] = useState<RichiestaRegistrazione[]>([]);
  const [richiestaSelezionata, setRichiestaSelezionata] = useState<RichiestaRegistrazione | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const [pinGenerato, setPinGenerato] = useState<number | null>(null);
  const [expandedRequisiti, setExpandedRequisiti] = useState(false);
  const [expandedRichieste, setExpandedRichieste] = useState(false);
  const [nuoveRichieste, setNuoveRichieste] = useState<number>(0);
  const [descrizioneRegistrazione, setDescrizioneRegistrazione] = useState('');
  const [descrizionePresentation, setDescrizionePresentation] = useState('');
  const [editingDescrizione, setEditingDescrizione] = useState(false);
  const [nuovaDescrizione, setNuovaDescrizione] = useState('');
  const [editingDescrizionePresentation, setEditingDescrizionePresentation] = useState(false);
  const [nuovaDescrizionePresentation, setNuovaDescrizionePresentation] = useState('');
  const [editingRequisitoId, setEditingRequisitoId] = useState<string | null>(null);
  const [editingRequisitoText, setEditingRequisitoText] = useState('');
  const [requisitoMenuAnchorEl, setRequisitoMenuAnchorEl] = useState<null | { id: string, element: HTMLElement }>(null);
  const [nuovoRequisitoObbligatorio, setNuovoRequisitoObbligatorio] = useState(false);
  const [filtroStato, setFiltroStato] = useState<'in_attesa' | 'rifiutate' | 'tutte'>('in_attesa');
  const [processing, setProcessing] = useState(false);
  const [ultimoPinGenerato, setUltimoPinGenerato] = useState<number | null>(null);

  // Carica i requisiti dal database
  const caricaRequisiti = async () => {
    try {
      const docRef = doc(db, 'impostazioni', 'requisiti_iscrizione');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Impostazioni;
        setRequisiti(data.requisiti || []);
        setDescrizioneRegistrazione(data.descrizione_registrazione || '');
        setDescrizionePresentation(data.descrizione_presentazione || '');
      } else {
        await setDoc(docRef, { 
          requisiti: [], 
          descrizione_registrazione: '',
          descrizione_presentazione: ''
        });
        setRequisiti([]);
        setDescrizioneRegistrazione('');
        setDescrizionePresentation('');
      }
    } catch (error) {
      console.error('Errore nel caricamento dei requisiti:', error);
      setError('Errore nel caricamento dei requisiti');
    }
  };

  // Carica le richieste di registrazione
  const caricaRichieste = async () => {
    try {
      const q = query(
        collection(db, 'richieste_registrazione'),
        orderBy('data_richiesta', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const richiesteData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RichiestaRegistrazione[];

      // Filtra le richieste rifiutate più vecchie di 1 mese
      const unMeseFa = new Date();
      unMeseFa.setMonth(unMeseFa.getMonth() - 1);

      const richiesteFiltrate = richiesteData.filter(richiesta => {
        // Mantieni tutte le richieste in attesa
        if (richiesta.stato === 'in_attesa') return true;
        // Per le rifiutate, controlla la data
        if (richiesta.stato === 'rifiutata') {
          const dataRisposta = new Date(richiesta.data_risposta || richiesta.data_richiesta);
          return dataRisposta > unMeseFa;
        }
        return false; // Escludi le richieste approvate
      });
      
      setRichieste(richiesteFiltrate);
      
      // Conta le richieste in attesa
      const richiesteInAttesa = richiesteFiltrate.filter(r => r.stato === 'in_attesa').length;
      setNuoveRichieste(richiesteInAttesa);
    } catch (error) {
      console.error('Errore nel caricamento delle richieste:', error);
      setError('Errore nel caricamento delle richieste');
    }
  };

  useEffect(() => {
    caricaRequisiti();
    caricaRichieste();
  }, []);

  // Salva i requisiti nel database
  const salvaRequisiti = async (nuoviRequisiti: Requisito[]) => {
    try {
      const docRef = doc(db, 'impostazioni', 'requisiti_iscrizione');
      await setDoc(docRef, { 
        requisiti: nuoviRequisiti,
        descrizione_registrazione: descrizioneRegistrazione,
        descrizione_presentazione: descrizionePresentation
      });
      setSuccess('Requisiti salvati con successo!');
    } catch (error) {
      console.error('Errore nel salvataggio dei requisiti:', error);
      setError('Errore nel salvataggio dei requisiti');
    }
  };

  // Salva la descrizione
  const salvaDescrizione = async () => {
    try {
      const docRef = doc(db, 'impostazioni', 'requisiti_iscrizione');
      await setDoc(docRef, { 
        requisiti,
        descrizione_registrazione: nuovaDescrizione 
      });
      setDescrizioneRegistrazione(nuovaDescrizione);
      setEditingDescrizione(false);
      setSuccess('Descrizione salvata con successo!');
    } catch (error) {
      console.error('Errore nel salvataggio della descrizione:', error);
      setError('Errore nel salvataggio della descrizione');
    }
  };

  // Salva la descrizione presentazione
  const salvaDescrizionePresentation = async () => {
    try {
      const docRef = doc(db, 'impostazioni', 'requisiti_iscrizione');
      await setDoc(docRef, { 
        requisiti,
        descrizione_registrazione: descrizioneRegistrazione,
        descrizione_presentazione: nuovaDescrizionePresentation
      });
      setDescrizionePresentation(nuovaDescrizionePresentation);
      setEditingDescrizionePresentation(false);
      setSuccess('Descrizione presentazione salvata con successo!');
    } catch (error) {
      console.error('Errore nel salvataggio della descrizione presentazione:', error);
      setError('Errore nel salvataggio della descrizione presentazione');
    }
  };

  // Aggiungi un nuovo requisito
  const handleAggiungiRequisito = () => {
    if (!nuovoRequisito.trim()) return;
    
    const nuoviRequisiti = [
      ...requisiti,
      { id: Date.now().toString(), testo: nuovoRequisito.trim(), obbligatorio: nuovoRequisitoObbligatorio }
    ];
    
    setRequisiti(nuoviRequisiti);
    salvaRequisiti(nuoviRequisiti);
    setNuovoRequisito('');
    setNuovoRequisitoObbligatorio(false);
  };

  // Rimuovi un requisito
  const handleRimuoviRequisito = (id: string) => {
    const nuoviRequisiti = requisiti.filter(req => req.id !== id);
    setRequisiti(nuoviRequisiti);
    salvaRequisiti(nuoviRequisiti);
  };

  // Gestisci l'approvazione o il rifiuto di una richiesta
  const handleGestioneRichiesta = async (richiesta: RichiestaRegistrazione, nuovoStato: 'approvata' | 'rifiutata') => {
    try {
      setProcessing(true);

      // Aggiorna lo stato della richiesta
      const richiestaRef = doc(db, 'richieste_registrazione', richiesta.id);
      await updateDoc(richiestaRef, {
        stato: nuovoStato,
        data_risposta: new Date().toISOString()
      });

      // Se la richiesta è stata approvata, crea il nuovo giocatore
      if (nuovoStato === 'approvata') {
        const nuovoPin = generaPIN();
        const nuovoGiocatore = {
          nome: richiesta.nome,
          pin: nuovoPin,
          ruolo: 'giocatore',
          contatto: richiesta.contatto,
          contattoVisibile: false,
          farms: [{
            nome: richiesta.farm.nome,
            tag: '',
            stato: 'attivo',
            principale: true,
            livello: richiesta.farm.livello || 1,
            derby_tags: []
          }],
          vicinati: [],
          statistiche: {
            incarichiCompletati: 0,
            puntiAccumulati: 0
          },
          dataRegistrazione: new Date().toISOString()
        };

        // Crea il nuovo documento del giocatore
        await setDoc(doc(collection(db, 'utenti')), nuovoGiocatore);

        // Mostra il PIN
        setUltimoPinGenerato(nuovoPin);
        setOpenPinDialog(true);
      }

      setSuccess(`Richiesta ${nuovoStato === 'approvata' ? 'approvata' : 'rifiutata'} con successo!`);
    } catch (error) {
      console.error('Errore nella gestione della richiesta:', error);
      setError('Errore nella gestione della richiesta. Riprova.');
    } finally {
      setProcessing(false);
    }
  };

  // Funzione per gestire l'apertura del menu
  const handleOpenRequisitoMenu = (event: React.MouseEvent<HTMLElement>, requisitoId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setRequisitoMenuAnchorEl({ id: requisitoId, element: event.currentTarget });
  };

  // Funzione per chiudere il menu
  const handleCloseRequisitoMenu = () => {
    setRequisitoMenuAnchorEl(null);
  };

  // Funzione per iniziare la modifica
  const handleStartEdit = (requisito: Requisito) => {
    setEditingRequisitoId(requisito.id);
    setEditingRequisitoText(requisito.testo);
    handleCloseRequisitoMenu();
  };

  // Funzione per salvare la modifica
  const handleSaveEdit = async () => {
    if (!editingRequisitoText.trim()) return;

    const nuoviRequisiti = requisiti.map(req => 
      req.id === editingRequisitoId 
        ? { ...req, testo: editingRequisitoText.trim() }
        : req
    );

    setRequisiti(nuoviRequisiti);
    await salvaRequisiti(nuoviRequisiti);
    setEditingRequisitoId(null);
    setEditingRequisitoText('');
  };

  // Funzione per gestire il toggle dell'obbligatorietà
  const handleToggleObbligatorio = async (id: string) => {
    const nuoviRequisiti = requisiti.map(req => 
      req.id === id ? { ...req, obbligatorio: !req.obbligatorio } : req
    );
    setRequisiti(nuoviRequisiti);
    salvaRequisiti(nuoviRequisiti);
    handleCloseRequisitoMenu();
  };

  // Funzione per spostare un requisito su
  const handleMoveUp = (id: string) => {
    const index = requisiti.findIndex(req => req.id === id);
    if (index <= 0) return;

    const newRequisiti = [...requisiti];
    const temp = newRequisiti[index];
    newRequisiti[index] = newRequisiti[index - 1];
    newRequisiti[index - 1] = temp;

    setRequisiti(newRequisiti);
    salvaRequisiti(newRequisiti);
    handleCloseRequisitoMenu();
  };

  // Funzione per spostare un requisito giù
  const handleMoveDown = (id: string) => {
    const index = requisiti.findIndex(req => req.id === id);
    if (index >= requisiti.length - 1) return;

    const newRequisiti = [...requisiti];
    const temp = newRequisiti[index];
    newRequisiti[index] = newRequisiti[index + 1];
    newRequisiti[index + 1] = temp;

    setRequisiti(newRequisiti);
    salvaRequisiti(newRequisiti);
    handleCloseRequisitoMenu();
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Impostazioni
        </Typography>

        {/* Richieste di Registrazione */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3 
          }}>
            <Typography variant="h6" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              flexShrink: 0
            }}>
              Richieste di Registrazione
              {nuoveRichieste > 0 && (
                <Chip 
                  label={nuoveRichieste} 
                  color="primary" 
                  size="small"
                />
              )}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              width: { xs: '100%', sm: 'auto' },
              bgcolor: 'background.default',
              p: 0.5,
              borderRadius: 2,
              '& .MuiButton-root': {
                flex: { xs: 1, sm: 0 },
                minWidth: { xs: 0, sm: '100px' }
              }
            }}>
              <Button
                variant={filtroStato === 'in_attesa' ? 'contained' : 'text'}
                onClick={() => setFiltroStato('in_attesa')}
                size="small"
                color="primary"
              >
                In Attesa
              </Button>
              <Button
                variant={filtroStato === 'rifiutate' ? 'contained' : 'text'}
                onClick={() => setFiltroStato('rifiutate')}
                size="small"
                color="error"
              >
                Rifiutate
              </Button>
              <Button
                variant={filtroStato === 'tutte' ? 'contained' : 'text'}
                onClick={() => setFiltroStato('tutte')}
                size="small"
              >
                Tutte
              </Button>
            </Box>
          </Box>

          {richieste.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Non ci sono richieste di registrazione
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {richieste
                .filter(richiesta => {
                  if (filtroStato === 'in_attesa') return richiesta.stato === 'in_attesa';
                  if (filtroStato === 'rifiutate') return richiesta.stato === 'rifiutata';
                  return true;
                })
                .map((richiesta) => (
                  <Accordion 
                    key={richiesta.id}
                    sx={{ 
                      '&:before': { display: 'none' },
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: richiesta.stato === 'rifiutata' ? 'error.lighter' : 'background.paper',
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        width: '100%',
                        gap: { xs: 1, sm: 0 }
                      }}>
                        <Typography sx={{ 
                          flexGrow: 1,
                          mb: { xs: 1, sm: 0 }
                        }}>
                          {richiesta.nome} - Farm: {richiesta.farm.nome} (Liv. {richiesta.farm.livello})
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 1,
                          width: { xs: '100%', sm: 'auto' },
                          justifyContent: { xs: 'space-between', sm: 'flex-end' }
                        }}>
                          {richiesta.stato === 'rifiutata' && (
                            <Typography variant="caption" color="text.secondary">
                              Rifiutata il {new Date(richiesta.data_risposta || '').toLocaleDateString()}
                            </Typography>
                          )}
                          <Chip 
                            label={
                              richiesta.stato === 'approvata' ? 'Approvata' : 
                              richiesta.stato === 'rifiutata' ? 'Rifiutata' : 
                              'In attesa'
                            } 
                            color={
                              richiesta.stato === 'approvata' ? 'success' : 
                              richiesta.stato === 'rifiutata' ? 'error' : 
                              'warning'
                            }
                            size="small"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Contatto:
                          </Typography>
                          {richiesta.contatto ? (
                            <Box
                              onClick={() => {
                                navigator.clipboard.writeText(richiesta.contatto);
                                setSuccess('Contatto copiato negli appunti!');
                              }}
                              sx={{
                                display: 'inline-block',
                                bgcolor: 'grey.100',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: 'grey.200'
                                }
                              }}
                            >
                              <Typography>{richiesta.contatto}</Typography>
                            </Box>
                          ) : (
                            <Typography color="text.secondary">Non specificato</Typography>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Presentazione:
                          </Typography>
                          <Typography>
                            {richiesta.presentazione || 'Non specificata'}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Requisiti accettati:
                          </Typography>
                          <List dense>
                            {/* Prima i requisiti obbligatori */}
                            {requisiti.filter(r => r.obbligatorio).length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mt: 1, color: 'primary.main', fontWeight: 'bold' }}>
                                  Requisiti Obbligatori ⭐
                                </Typography>
                                {requisiti.filter(r => r.obbligatorio).map(req => (
                                  <ListItem key={req.id}>
                                    <ListItemIcon>
                                      {richiesta.requisiti_accettati.includes(req.id) ? (
                                        <Checkbox checked={true} disabled sx={{ color: 'success.main' }} />
                                      ) : (
                                        <Checkbox checked={false} disabled sx={{ color: 'error.main' }} />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={req.testo}
                                      sx={{
                                        '& .MuiListItemText-primary': {
                                          color: richiesta.requisiti_accettati.includes(req.id) ? 'success.main' : 'error.main'
                                        }
                                      }}
                                    />
                                  </ListItem>
                                ))}
                              </>
                            )}

                            {/* Poi i requisiti facoltativi */}
                            {requisiti.filter(r => !r.obbligatorio).length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mt: 2, color: 'text.secondary', fontWeight: 'bold' }}>
                                  Requisiti Consigliati
                                </Typography>
                                {requisiti.filter(r => !r.obbligatorio).map(req => (
                                  <ListItem key={req.id}>
                                    <ListItemIcon>
                                      {richiesta.requisiti_accettati.includes(req.id) ? (
                                        <Checkbox checked={true} disabled sx={{ color: 'success.main' }} />
                                      ) : (
                                        <Checkbox checked={false} disabled />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={req.testo}
                                      sx={{
                                        '& .MuiListItemText-primary': {
                                          color: richiesta.requisiti_accettati.includes(req.id) ? 'success.main' : 'text.secondary'
                                        }
                                      }}
                                    />
                                  </ListItem>
                                ))}
                              </>
                            )}
                          </List>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                          {richiesta.stato === 'in_attesa' ? (
                            <>
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  setRichiestaSelezionata(richiesta);
                                  setOpenDialog(true);
                                }}
                                startIcon={<DeleteIcon />}
                                sx={{ minWidth: '120px' }}
                              >
                                Rifiuta
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleGestioneRichiesta(richiesta, 'approvata')}
                                startIcon={<CheckCircleIcon />}
                                sx={{ minWidth: '120px' }}
                              >
                                Approva
                              </Button>
                            </>
                          ) : richiesta.stato === 'rifiutata' && (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => handleGestioneRichiesta(richiesta, 'approvata')}
                              startIcon={<CheckCircleIcon />}
                              sx={{ minWidth: '160px' }}
                            >
                              Approva Comunque
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              }
            </Box>
          )}
        </Paper>

        {/* Requisiti per l'iscrizione */}
        <Paper sx={{ p: 3 }}>
          <Accordion 
            expanded={expandedRequisiti} 
            onChange={() => setExpandedRequisiti(!expandedRequisiti)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Requisiti per l'iscrizione
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Descrizione Registrazione */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mr: 1 }}>
                    Descrizione per il form di registrazione
                  </Typography>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setNuovaDescrizione(descrizioneRegistrazione);
                      setEditingDescrizione(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
                {editingDescrizione ? (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={15}
                      value={nuovaDescrizione}
                      onChange={(e) => setNuovaDescrizione(e.target.value)}
                      placeholder="Inserisci una descrizione per il form di registrazione..."
                      sx={{
                        '& .MuiInputBase-root': {
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5
                        }
                      }}
                    />
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setEditingDescrizione(false)}>
                        Annulla
                      </Button>
                      <Button variant="contained" onClick={salvaDescrizione}>
                        Salva
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography 
                    color={descrizioneRegistrazione ? 'text.primary' : 'text.secondary'} 
                    sx={{ mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                  >
                    {descrizioneRegistrazione || 'Nessuna descrizione impostata'}
                  </Typography>
                )}
              </Box>

              {/* Descrizione Presentazione */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mr: 1 }}>
                    Descrizione per il campo presentazione
                  </Typography>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setNuovaDescrizionePresentation(descrizionePresentation);
                      setEditingDescrizionePresentation(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
                {editingDescrizionePresentation ? (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={nuovaDescrizionePresentation}
                      onChange={(e) => setNuovaDescrizionePresentation(e.target.value)}
                      placeholder="Inserisci una descrizione per il campo presentazione..."
                      sx={{
                        '& .MuiInputBase-root': {
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5
                        }
                      }}
                    />
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setEditingDescrizionePresentation(false)}>
                        Annulla
                      </Button>
                      <Button variant="contained" onClick={salvaDescrizionePresentation}>
                        Salva
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography 
                    color={descrizionePresentation ? 'text.primary' : 'text.secondary'} 
                    sx={{ mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                  >
                    {descrizionePresentation || 'Nessuna descrizione impostata'}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Nuovo requisito"
                  value={nuovoRequisito}
                  onChange={(e) => setNuovoRequisito(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAggiungiRequisito();
                    }
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={nuovoRequisitoObbligatorio}
                        onChange={(e) => setNuovoRequisitoObbligatorio(e.target.checked)}
                      />
                    }
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        Requisito obbligatorio
                        <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
                      </Box>
                    }
                  />
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAggiungiRequisito}
                  >
                    Aggiungi Requisito
                  </Button>
                </Box>
              </Box>

              <Box>
                {/* Requisiti Obbligatori */}
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'text.secondary' }}>
                  Requisiti Obbligatori <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                {requisiti.map((requisito, index) => {
                  if (!requisito.obbligatorio) return null;
                  return (
                    <ListItem
                      key={requisito.id}
                      sx={{
                        mb: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'primary.light',
                        bgcolor: 'primary.lighter',
                      }}
                    >
                      {editingRequisitoId === requisito.id ? (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          flexGrow: 1, 
                          gap: 1,
                          width: '100%',
                          p: 1
                        }}>
                          <TextField
                            fullWidth
                            value={editingRequisitoText}
                            onChange={(e) => setEditingRequisitoText(e.target.value)}
                            size="small"
                            autoFocus
                            multiline
                            minRows={2}
                            maxRows={4}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                handleSaveEdit();
                              }
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                backgroundColor: 'background.paper'
                              }
                            }}
                          />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button 
                              size="small" 
                              onClick={handleSaveEdit}
                              variant="contained"
                              sx={{ minWidth: '100px' }}
                            >
                              Salva
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setEditingRequisitoId(null);
                                setEditingRequisitoText('');
                              }}
                              variant="outlined"
                              sx={{ minWidth: '100px' }}
                            >
                              Annulla
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <ListItemText 
                            primary={requisito.testo} 
                            sx={{
                              '& .MuiListItemText-primary': {
                                fontSize: '0.95rem',
                                lineHeight: 1.5
                              }
                            }}
                          />
                          <IconButton
                            edge="end"
                            onClick={(e) => handleOpenRequisitoMenu(e, requisito.id)}
                            sx={{ ml: 1 }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </>
                      )}
                    </ListItem>
                  );
                })}

                {/* Requisiti Facoltativi */}
                <Typography variant="subtitle1" sx={{ mb: 2, mt: 4, fontWeight: 'bold', color: 'text.secondary' }}>
                  Requisiti Facoltativi
                </Typography>
                {requisiti.map((requisito, index) => {
                  if (requisito.obbligatorio) return null;
                  return (
                    <ListItem
                      key={requisito.id}
                      sx={{
                        mb: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {editingRequisitoId === requisito.id ? (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          flexGrow: 1, 
                          gap: 1,
                          width: '100%',
                          p: 1
                        }}>
                          <TextField
                            fullWidth
                            value={editingRequisitoText}
                            onChange={(e) => setEditingRequisitoText(e.target.value)}
                            size="small"
                            autoFocus
                            multiline
                            minRows={2}
                            maxRows={4}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                handleSaveEdit();
                              }
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                backgroundColor: 'background.paper'
                              }
                            }}
                          />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button 
                              size="small" 
                              onClick={handleSaveEdit}
                              variant="contained"
                              sx={{ minWidth: '100px' }}
                            >
                              Salva
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setEditingRequisitoId(null);
                                setEditingRequisitoText('');
                              }}
                              variant="outlined"
                              sx={{ minWidth: '100px' }}
                            >
                              Annulla
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <ListItemText 
                            primary={requisito.testo} 
                            sx={{
                              '& .MuiListItemText-primary': {
                                fontSize: '0.95rem',
                                lineHeight: 1.5
                              }
                            }}
                          />
                          <IconButton
                            edge="end"
                            onClick={(e) => handleOpenRequisitoMenu(e, requisito.id)}
                            sx={{ ml: 1 }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </>
                      )}
                    </ListItem>
                  );
                })}
              </Box>

              {/* Menu per le azioni sui requisiti */}
              <Menu
                anchorEl={requisitoMenuAnchorEl?.element}
                open={Boolean(requisitoMenuAnchorEl)}
                onClose={handleCloseRequisitoMenu}
              >
                <MenuItem 
                  onClick={() => {
                    const requisito = requisiti.find(r => r.id === requisitoMenuAnchorEl?.id);
                    if (requisito) {
                      handleStartEdit(requisito);
                    }
                  }}
                >
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Modifica testo</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    if (requisitoMenuAnchorEl?.id) {
                      handleToggleObbligatorio(requisitoMenuAnchorEl.id);
                    }
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      size="small"
                      checked={requisiti.find(r => r.id === requisitoMenuAnchorEl?.id)?.obbligatorio || false}
                      sx={{ p: 0 }}
                    />
                  </ListItemIcon>
                  <ListItemText>Rendi {requisiti.find(r => r.id === requisitoMenuAnchorEl?.id)?.obbligatorio ? 'facoltativo' : 'obbligatorio'}</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem 
                  onClick={() => {
                    if (requisitoMenuAnchorEl?.id) {
                      handleMoveUp(requisitoMenuAnchorEl.id);
                    }
                  }}
                  disabled={requisiti.findIndex(r => r.id === requisitoMenuAnchorEl?.id) <= 0}
                >
                  <ListItemIcon>
                    <Box component="span" sx={{ transform: 'rotate(-90deg)' }}>
                      ➜
                    </Box>
                  </ListItemIcon>
                  <ListItemText>Sposta su</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    if (requisitoMenuAnchorEl?.id) {
                      handleMoveDown(requisitoMenuAnchorEl.id);
                    }
                  }}
                  disabled={requisiti.findIndex(r => r.id === requisitoMenuAnchorEl?.id) >= requisiti.length - 1}
                >
                  <ListItemIcon>
                    <Box component="span" sx={{ transform: 'rotate(90deg)' }}>
                      ➜
                    </Box>
                  </ListItemIcon>
                  <ListItemText>Sposta giù</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem 
                  onClick={() => {
                    if (requisitoMenuAnchorEl?.id) {
                      handleRimuoviRequisito(requisitoMenuAnchorEl.id);
                      handleCloseRequisitoMenu();
                    }
                  }}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText sx={{ color: 'error.main' }}>Elimina</ListItemText>
                </MenuItem>
              </Menu>
            </AccordionDetails>
          </Accordion>
        </Paper>

        {/* Dialog di conferma rifiuto */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Conferma Rifiuto</DialogTitle>
          <DialogContent>
            <Typography>
              Sei sicuro di voler rifiutare la richiesta di {richiestaSelezionata?.nome}?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
            <Button 
              color="error" 
              variant="contained"
              onClick={() => richiestaSelezionata && handleGestioneRichiesta(richiestaSelezionata, 'rifiutata')}
            >
              Rifiuta
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog per mostrare il PIN generato */}
        <Dialog 
          open={openPinDialog} 
          onClose={() => {
            setOpenPinDialog(false);
            setUltimoPinGenerato(null);
          }}
        >
          <DialogTitle>PIN Generato</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" gutterBottom>
                {ultimoPinGenerato}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Questo è il PIN che il giocatore dovrà utilizzare per accedere.
                Assicurati di comunicarglielo in modo sicuro.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  if (ultimoPinGenerato) {
                    navigator.clipboard.writeText(ultimoPinGenerato.toString());
                    setSuccess('PIN copiato negli appunti!');
                  }
                }}
                fullWidth
              >
                Copia PIN
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setOpenPinDialog(false);
                setUltimoPinGenerato(null);
                setSuccess('Richiesta approvata con successo!');
              }}
            >
              Chiudi
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar per gli errori e i successi */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
        >
          <Alert severity="error">{error}</Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success">{success}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
} 