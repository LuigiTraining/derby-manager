import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  Public as PublicIcon,
  PublicOff as PublicOffIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink, useLocation } from 'react-router-dom';
import { useRegolamenti } from '../../componenti/regolamento/RegolamentiContext';
import Layout from '../../componenti/layout/Layout';
import RegolamentiEditor from '../../componenti/regolamento/RegolamentiEditor';
import { RegolamentiSezione } from '../../tipi/regolamento';
import { useAuth } from '../../componenti/autenticazione/AuthContext';

export default function GestioneRegolamenti() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionId } = useParams<{ sectionId?: string }>();
  const {
    sezioni,
    loading,
    error,
    creaNuovaSezione,
    modificaSezione,
    eliminaSezione,
    cambiaOrdineSezione,
    cambiaParentSezione,
    cambiaStatoPubblicazione,
    getSezioniByParent,
    getPercorsoSezione
  } = useRegolamenti();

  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [nuovaSezioneDialogOpen, setNuovaSezioneDialogOpen] = useState(false);
  const [nuovoTitolo, setNuovoTitolo] = useState('');
  const [percorso, setPercorso] = useState<RegolamentiSezione[]>([]);
  const [sezioneSelezionata, setSezioneSelezionata] = useState<RegolamentiSezione | null>(null);
  const [modalitaModifica, setModalitaModifica] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ tipo: 'success' | 'error' | 'info', messaggio: string } | null>(null);
  const [parentIdPerNuovaSezione, setParentIdPerNuovaSezione] = useState<string | null>(null);
  const [confermaEliminazioneOpen, setConfermaEliminazioneOpen] = useState(false);
  const [sezioneIdDaEliminare, setSezioneIdDaEliminare] = useState<string | null>(null);
  
  // Determine if user has edit permissions
  const canEdit = currentUser && ['admin', 'coordinatore', 'moderatore'].includes(currentUser.ruolo);

  // Carica la sezione corrente e il suo percorso
  useEffect(() => {
    if (sectionId) {
      const caricaSezioneEPercorso = async () => {
        try {
          // Trova la sezione selezionata
          const sezione = sezioni.find(s => s.id === sectionId);
          if (sezione) {
            setSezioneSelezionata(sezione);
            // Carica il percorso per la breadcrumb
            const percorsoSezione = await getPercorsoSezione(sectionId);
            setPercorso(percorsoSezione);
          } else {
            // Sezione non trovata
            setAlertMessage({
              tipo: 'error',
              messaggio: 'Sezione non trovata'
            });
            navigate('/regolamento');
          }
        } catch (err) {
          console.error('Errore durante il caricamento della sezione:', err);
          setAlertMessage({
            tipo: 'error',
            messaggio: 'Errore durante il caricamento della sezione'
          });
        }
      };

      caricaSezioneEPercorso();
    } else {
      // Reset per la schermata principale
      setSezioneSelezionata(null);
      setPercorso([]);
    }
  }, [sectionId, sezioni, getPercorsoSezione, navigate]);

  // Gestisce l'espansione/collasso delle sezioni
  const handleSectionToggle = (sectionId: string) => {
    setExpandedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  // Apertura del dialog per nuova sezione
  const handleNuovaSezioneClick = (parentId: string | null = null) => {
    setParentIdPerNuovaSezione(parentId);
    setNuovoTitolo('');
    setNuovaSezioneDialogOpen(true);
  };

  // Crea una nuova sezione
  const handleCreaNuovaSezione = async () => {
    if (!nuovoTitolo.trim()) {
      setAlertMessage({
        tipo: 'error',
        messaggio: 'Il titolo è obbligatorio'
      });
      return;
    }

    try {
      const nuovoId = await creaNuovaSezione(nuovoTitolo, '', parentIdPerNuovaSezione);
      setNuovaSezioneDialogOpen(false);
      setAlertMessage({
        tipo: 'success',
        messaggio: 'Sezione creata con successo'
      });
      navigate(`/regolamento/edit/${nuovoId}`);
    } catch (err) {
      console.error('Errore durante la creazione della sezione:', err);
      setAlertMessage({
        tipo: 'error',
        messaggio: 'Errore durante la creazione della sezione'
      });
    }
  };

  // Salva le modifiche alla sezione
  const handleSalvaModifiche = async (nuovoContenuto: string) => {
    if (!sezioneSelezionata) return;

    try {
      await modificaSezione(sezioneSelezionata.id, sezioneSelezionata.titolo, nuovoContenuto);
      setAlertMessage({
        tipo: 'success',
        messaggio: 'Modifiche salvate con successo'
      });
    } catch (err) {
      console.error('Errore durante il salvataggio delle modifiche:', err);
      setAlertMessage({
        tipo: 'error',
        messaggio: 'Errore durante il salvataggio delle modifiche'
      });
    }
  };

  // Gestisce l'eliminazione di una sezione
  const handleEliminaSezione = async () => {
    if (!sezioneIdDaEliminare) return;

    try {
      await eliminaSezione(sezioneIdDaEliminare);
      setAlertMessage({
        tipo: 'success',
        messaggio: 'Sezione eliminata con successo'
      });
      
      // Naviga al parent o alla home se non esiste un parent
      const sezione = sezioni.find(s => s.id === sezioneIdDaEliminare);
      if (sezione && sezione.parentId) {
        navigate(`/regolamento/${sezione.parentId}`);
      } else {
        navigate('/regolamento');
      }
    } catch (err: any) {
      console.error('Errore durante l\'eliminazione della sezione:', err);
      setAlertMessage({
        tipo: 'error',
        messaggio: err.message || 'Errore durante l\'eliminazione della sezione'
      });
    } finally {
      setConfermaEliminazioneOpen(false);
      setSezioneIdDaEliminare(null);
    }
  };

  // Toggle dello stato di pubblicazione
  const handleTogglePubblicazione = async (id: string, nuovoStato: boolean) => {
    try {
      await cambiaStatoPubblicazione(id, nuovoStato);
      setAlertMessage({
        tipo: 'success',
        messaggio: nuovoStato ? 'Sezione pubblicata' : 'Sezione nascosta'
      });
    } catch (err) {
      console.error('Errore durante il cambio di stato di pubblicazione:', err);
      setAlertMessage({
        tipo: 'error',
        messaggio: 'Errore durante il cambio di stato di pubblicazione'
      });
    }
  };

  // Rendering ricorsivo delle sezioni
  const renderSezioni = (parentId: string | null = null) => {
    const sezioniLocali = getSezioniByParent(parentId);
    
    if (sezioniLocali.length === 0) {
      return (
        <ListItem>
          <ListItemText 
            primary="Nessuna sezione presente" 
            primaryTypographyProps={{ color: 'text.secondary', fontStyle: 'italic' }}
          />
        </ListItem>
      );
    }

    return sezioniLocali.map((sezione) => {
      const hasSottoSezioni = sezioni.some(s => s.parentId === sezione.id);
      const isExpanded = expandedSections.includes(sezione.id);

      return (
        <React.Fragment key={sezione.id}>
          <ListItem 
            component={Paper} 
            elevation={1} 
            sx={{ 
              mb: 1, 
              borderLeft: sezione.pubblicato ? 'none' : '3px solid #ff9800',
              position: 'relative'
            }}
          >
            {hasSottoSezioni && (
              <ListItemIcon onClick={() => handleSectionToggle(sezione.id)}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemIcon>
            )}
            
            <ListItemText
              primary={
                <Box component="span" sx={{ fontWeight: 'bold' }}>
                  {sezione.titolo}
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  {!sezione.pubblicato && (
                    <Chip
                      label="Non pubblicato"
                      size="small"
                      color="warning"
                      sx={{ mr: 1 }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Ultima modifica: {sezione.updatedAt?.toLocaleString()}
                  </Typography>
                </Box>
              }
              onClick={() => navigate(`/regolamento/${sezione.id}`)}
              sx={{ cursor: 'pointer' }}
            />
            
            <ListItemSecondaryAction>
              {canEdit && (
                <>
                  <Tooltip title="Pubblica/Nascondi">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleTogglePubblicazione(sezione.id, !sezione.pubblicato)}
                    >
                      {sezione.pubblicato ? <PublicIcon color="primary" /> : <PublicOffIcon color="warning" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifica">
                    <IconButton 
                      edge="end" 
                      onClick={() => navigate(`/regolamento/edit/${sezione.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton 
                      edge="end" 
                      onClick={() => {
                        setSezioneIdDaEliminare(sezione.id);
                        setConfermaEliminazioneOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {!canEdit && (
                <Tooltip title="Visualizza">
                  <IconButton 
                    edge="end" 
                    onClick={() => navigate(`/regolamento/${sezione.id}`)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemSecondaryAction>
          </ListItem>
          
          {hasSottoSezioni && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 4 }}>
                {renderSezioni(sezione.id)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  };

  // Rendering della visualizzazione dettaglio di una sezione
  const renderDettaglioSezione = () => {
    if (!sezioneSelezionata) return <React.Fragment />;

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {sezioneSelezionata.titolo}
            </Typography>
            <Box>
              {canEdit && (
                <>
                  <Tooltip title="Pubblica/Nascondi">
                    <IconButton 
                      onClick={() => handleTogglePubblicazione(sezioneSelezionata.id, !sezioneSelezionata.pubblicato)}
                      sx={{ mr: 1 }}
                    >
                      {sezioneSelezionata.pubblicato ? <PublicIcon color="primary" /> : <PublicOffIcon color="warning" />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/regolamento/edit/${sezioneSelezionata.id}`)}
                    sx={{ mr: 1 }}
                  >
                    Modifica
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setSezioneIdDaEliminare(sezioneSelezionata.id);
                      setConfermaEliminazioneOpen(true);
                    }}
                  >
                    Elimina
                  </Button>
                </>
              )}
            </Box>
          </Box>
          
          {!sezioneSelezionata.pubblicato && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Questa sezione non è pubblicata e sarà visibile solo agli amministratori.
            </Alert>
          )}

          <Box 
            dangerouslySetInnerHTML={{ __html: sezioneSelezionata.contenuto }} 
            sx={{ 
              mt: 2,
              '& img': {
                maxWidth: '100%',
                height: 'auto'
              }
            }}
          />
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Sottosezioni</Typography>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleNuovaSezioneClick(sezioneSelezionata.id)}
              >
                Nuova sottosezione
              </Button>
            )}
          </Box>
          <List>
            {renderSezioni(sezioneSelezionata.id)}
          </List>
        </Box>
      </Box>
    );
  };

  // Rendering della modalità di modifica
  const renderModificaSezione = () => {
    if (!sezioneSelezionata) return <React.Fragment />;

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Modifica: {sezioneSelezionata.titolo}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/regolamento/${sezioneSelezionata.id}`)}
            >
              Torna alla visualizzazione
            </Button>
          </Box>
          
          <RegolamentiEditor
            initialContent={sezioneSelezionata.contenuto}
            sectionId={sezioneSelezionata.id}
            onSave={handleSalvaModifiche}
          />
        </Paper>
      </Box>
    );
  };

  // Rendering della schermata principale delle sezioni
  const renderSchermataIniziale = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Regolamenti</Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleNuovaSezioneClick(null)}
            >
              Nuova sezione principale
            </Button>
          )}
        </Box>
        
        <Paper sx={{ p: 2 }}>
          <List>
            {renderSezioni(null)}
          </List>
        </Paper>
      </Box>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '300px' 
          }}
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Layout>
    );
  }

  // Determina se siamo in modalità modifica
  const isEditMode = location.pathname.includes('/regolamento/edit/');

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link 
            component={RouterLink} 
            to="/regolamento" 
            color="inherit" 
            underline="hover"
          >
            Regolamenti
          </Link>
          
          {percorso.map((sezione, index) => {
            const isLast = index === percorso.length - 1;
            
            if (isLast) {
              return (
                <Typography key={sezione.id} color="text.primary">
                  {isEditMode ? `Modifica: ${sezione.titolo}` : sezione.titolo}
                </Typography>
              );
            }
            
            return (
              <Link
                key={sezione.id}
                component={RouterLink}
                to={`/regolamento/${sezione.id}`}
                color="inherit"
                underline="hover"
              >
                {sezione.titolo}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      {!sectionId && renderSchermataIniziale()}
      {sectionId && !isEditMode && renderDettaglioSezione()}
      {sectionId && isEditMode && renderModificaSezione()}

      {/* Dialog per creare una nuova sezione */}
      <Dialog open={nuovaSezioneDialogOpen} onClose={() => setNuovaSezioneDialogOpen(false)}>
        <DialogTitle>Crea nuova sezione</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Titolo della sezione"
            type="text"
            fullWidth
            value={nuovoTitolo}
            onChange={(e) => setNuovoTitolo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNuovaSezioneDialogOpen(false)}>Annulla</Button>
          <Button onClick={handleCreaNuovaSezione} variant="contained">Crea</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per confermare l'eliminazione */}
      <Dialog open={confermaEliminazioneOpen} onClose={() => setConfermaEliminazioneOpen(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare questa sezione? Questa azione non può essere annullata.
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Nota: Non è possibile eliminare sezioni che contengono sottosezioni.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfermaEliminazioneOpen(false)}>Annulla</Button>
          <Button onClick={handleEliminaSezione} variant="contained" color="error">Elimina</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar per mostrare messaggi di feedback */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={6000}
        onClose={() => setAlertMessage(null)}
      >
        {alertMessage && (
          <Alert 
            onClose={() => setAlertMessage(null)} 
            severity={alertMessage.tipo} 
            sx={{ width: '100%' }}
          >
            {alertMessage.messaggio}
          </Alert>
        )}
      </Snackbar>
    </Layout>
  );
} 