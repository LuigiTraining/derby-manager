import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Button,
  useTheme,
  useMediaQuery,
  AppBar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useAuth } from '../componenti/autenticazione/AuthContext';
import { useAnnunci } from '../componenti/annunci/AnnunciContext';
import Layout from '../componenti/layout/Layout';
import { db } from '../configurazione/firebase';
import { collection, doc, onSnapshot, updateDoc, query, where, orderBy, setDoc, deleteDoc } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WikiEditor from '../componenti/wiki/WikiEditor';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Aggiungo interfaccia per gli annunci
interface Annuncio {
  id: string;
  numero: number;
  contenuto: string;
  data: Date;
  lastModified: Date;
  modifiedBy: string;
  lettoDa: { [userId: string]: Date };
  bozza: boolean;
  visibileLettori?: string[];
}

const StyledTabPanel = styled(Box)({
  '&:first-of-type': {
    marginTop: 0
  }
});

export default function Welcome() {
  const { currentUser } = useAuth();
  const { annunci, annunciDaLeggere, setAnnunciDaLeggere } = useAnnunci();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [tabValue, setTabValue] = useState(0);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [annuncioToDelete, setAnnuncioToDelete] = useState<Annuncio | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aggiungo useEffect per gestire i click sui testi copiabili
  useEffect(() => {
    const handleClickableText = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('clickable-text')) {
        const textToCopy = target.getAttribute('data-copyable');
        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            setSuccess('Copiato!');
          });
        }
      }
    };

    document.addEventListener('click', handleClickableText);
    return () => document.removeEventListener('click', handleClickableText);
  }, []);

  // Rimuovo gli effetti che segnavano automaticamente come letti gli annunci
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'annunci'),
      orderBy('numero', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const annunciData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data.toDate(),
        lastModified: doc.data().lastModified?.toDate() || doc.data().data.toDate()
      })) as Annuncio[];

      // Filtra gli annunci in base alla visibilità
      const annunciFiltrati = annunciData.filter(annuncio => {
        // Se l'annuncio ha visibileLettori, mostralo solo a quegli utenti
        if (annuncio.visibileLettori?.length > 0) {
          return annuncio.visibileLettori.includes(currentUser.id);
        }
        return true; // Se non ha visibileLettori, è visibile a tutti
      });

      // Identifica i nuovi annunci (escludi le bozze)
      const nuovi = annunciFiltrati
        .filter(annuncio => {
          // Ignora SEMPRE gli annunci in bozza
          if (annuncio.bozza) {
            return false;
          }
          
          // Se l'annuncio non è mai stato letto dall'utente
          if (!annuncio.lettoDa?.[currentUser.id]) {
            return true;
          }
          
          // Se l'annuncio è stato modificato dopo l'ultima lettura
          const ultimaLettura = new Date(annuncio.lettoDa[currentUser.id]);
          return annuncio.lastModified > ultimaLettura;
        })
        .map(a => a.id);

      setAnnunciDaLeggere(nuovi);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Funzione per verificare se l'utente può modificare gli annunci
  const canManageAnnouncements = currentUser?.ruolo === 'admin' || currentUser?.ruolo === 'coordinatore';

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNuovoAnnuncio = async () => {
    const now = new Date();
    const nuovoAnnuncio: Annuncio = {
      id: `draft_${Date.now()}`,
      numero: annunci.length + 1,
      contenuto: '<p>Nuovo annuncio...</p>',
      data: now,
      lastModified: now,
      modifiedBy: currentUser.id,
      lettoDa: { [currentUser.id]: now },
      bozza: true
    };

    setEditingContent(nuovoAnnuncio.contenuto);
    setTabValue(1);
  };

  const handleEditAnnuncio = (annuncio: Annuncio) => {
    setEditingContent(annuncio.contenuto);
    setTabValue(1);
  };

  const handleSaveContent = async (content: string) => {
    try {
      const now = new Date();
      const annuncioCorrente = annunci.find(a => a.contenuto === editingContent);
      const isNew = !annuncioCorrente;
      
      const annuncioData: Annuncio = {
        id: isNew ? doc(collection(db, 'annunci')).id : annuncioCorrente!.id,
        numero: isNew ? annunci.length + 1 : annuncioCorrente!.numero,
        contenuto: content,
        data: isNew ? now : annuncioCorrente!.data,
        lastModified: now,
        modifiedBy: currentUser.id,
        lettoDa: { [currentUser.id]: now },
        bozza: false
      };

      if (isNew) {
        await setDoc(doc(db, 'annunci', annuncioData.id), annuncioData);
      } else {
        await updateDoc(doc(db, 'annunci', annuncioCorrente!.id), annuncioData);
      }

      setEditingContent(null);
      setTabValue(0);
      setSuccess('Annuncio salvato con successo');
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setError('Errore nel salvataggio dell\'annuncio');
    }
  };

  const handleDeleteAnnuncio = async () => {
    if (!annuncioToDelete) return;

    try {
      const docRef = doc(db, 'annunci', annuncioToDelete.id);
      await deleteDoc(docRef);
      setSuccess('Annuncio eliminato con successo!');
    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'annuncio:', error);
      setError('Errore durante l\'eliminazione dell\'annuncio');
    }

    setAnnuncioToDelete(null);
    setOpenDeleteDialog(false);
  };

  // Funzione per segnare un annuncio come letto
  const segnaComeLetto = async (annuncioId: string) => {
    if (!currentUser) return;

    try {
      const docRef = doc(db, 'annunci', annuncioId);
      await updateDoc(docRef, {
        [`lettoDa.${currentUser.id}`]: new Date()
      });
      // Aggiorna localmente l'array degli annunci da leggere
      setAnnunciDaLeggere(prev => prev.filter(id => id !== annuncioId));
    } catch (error) {
      console.error('Errore nel segnare l\'annuncio come letto:', error);
    }
  };

  // Effetto per segnare gli annunci come letti quando si naviga o si aggiorna la pagina
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (annunciDaLeggere.length > 0) {
        annunciDaLeggere.forEach(annuncioId => {
          segnaComeLetto(annuncioId);
        });
      }
    };

    // Aggiungi listener per l'evento beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Segna come letti quando il componente viene smontato (navigazione)
      if (annunciDaLeggere.length > 0) {
        annunciDaLeggere.forEach(annuncioId => {
          segnaComeLetto(annuncioId);
        });
      }
    };
  }, [annunciDaLeggere, currentUser]);

  // Effetto per segnare gli annunci come letti quando si cambia tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && annunciDaLeggere.length > 0) {
        annunciDaLeggere.forEach(annuncioId => {
          segnaComeLetto(annuncioId);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [annunciDaLeggere, currentUser]);

  return (
    <Layout>
      <Box sx={{ 
        width: '100%', 
        typography: 'body1',
        // Aggiungo gli stili CSS per i testi copiabili
        '& .clickable-text': {
          backgroundColor: '#f5f5f5',
          padding: '2px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          transition: 'background-color 0.2s',
          display: 'inline-block',
          margin: '0 2px',
          '&:hover': {
            backgroundColor: '#e0e0e0',
          },
          '&:active': {
            backgroundColor: '#d5d5d5',
          }
        }
      }}>
        <TabContext value={tabValue.toString()}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={(_, newValue) => setTabValue(Number(newValue))} aria-label="lab API tabs example">
              <Tab label="Annunci" value="0" />
              {editingContent !== null && <Tab label="Editor" value="1" />}
            </TabList>
          </Box>

          <TabPanel value="0">
            <Stack spacing={2}>
              {canManageAnnouncements && (
                <Button
                  variant="contained"
                  onClick={handleNuovoAnnuncio}
                  startIcon={<AddIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Nuovo Annuncio
                </Button>
              )}

              {annunci.map((annuncio) => (
                <Card key={annuncio.id} sx={{ 
                  position: 'relative',
                  backgroundColor: annuncio.bozza ? alpha(theme.palette.warning.main, 0.1) : 'inherit'
                }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      {annuncio.bozza ? (
                        <Chip label="Bozza" color="warning" size="small" />
                      ) : (
                        annunciDaLeggere.includes(annuncio.id) && (
                          <Chip 
                            label="Nuovo" 
                            color="primary" 
                            size="small"
                            onClick={() => segnaComeLetto(annuncio.id)}
                          />
                        )
                      )}
                    </Stack>
                    <div dangerouslySetInnerHTML={{ __html: annuncio.contenuto }} />
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mt: 1
                    }}>
                      <Chip 
                        label={`#${annuncio.numero}`}
                        size="small"
                        color="primary"
                        sx={{ 
                          height: '20px',
                          '& .MuiChip-label': {
                            fontSize: '0.7rem',
                            px: 1
                          }
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: '0.7rem',
                          opacity: 0.7
                        }}
                      >
                        {new Date(annuncio.lastModified).toLocaleString('it-IT', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </Box>
                  </CardContent>
                  {canManageAnnouncements && (
                    <CardActions>
                      <Button size="small" onClick={() => handleEditAnnuncio(annuncio)}>
                        Modifica
                      </Button>
                      <Button size="small" color="error" onClick={() => {
                        setAnnuncioToDelete(annuncio);
                        setOpenDeleteDialog(true);
                      }}>
                        Elimina
                      </Button>
                    </CardActions>
                  )}
                </Card>
              ))}
            </Stack>
          </TabPanel>

          <TabPanel value="1">
            {editingContent !== null && canManageAnnouncements && (
              <WikiEditor
                initialContent={editingContent}
                pagePath="annunci"
                onSave={handleSaveContent}
              />
            )}
          </TabPanel>
        </TabContext>
      </Box>

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare questo annuncio?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleDeleteAnnuncio}
            color="error"
            variant="contained"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        message={error}
      />
    </Layout>
  );
} 