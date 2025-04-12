import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Layout from '../../componenti/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from '../../configurazione/firebase';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    giocatoriTotali: 0,
    farmAttive: 0,
    farmInattive: 0,
    puntiDerby: 0,
    assegnazioni: {
      citta: 0,
      cesti: 0,
      incarichi: 0
    }
  });
  const [ultimiIncarichi, setUltimiIncarichi] = useState<any[]>([]);
  const [giocatoriAttivi, setGiocatoriAttivi] = useState<any[]>([]);

  // Effetto per caricare le statistiche dei giocatori
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'utenti'), (snapshot) => {
      let totaleGiocatori = 0;
      let farmAttive = 0;
      let farmInattive = 0;

      snapshot.docs.forEach(doc => {
        const giocatore = doc.data();
        if (giocatore.ruolo !== 'admin') {
          totaleGiocatori++;
          giocatore.farms?.forEach((farm: any) => {
            if (farm.stato === 'attivo') {
              farmAttive++;
            } else {
              farmInattive++;
            }
          });
        }
      });

      setStats(prev => ({
        ...prev,
        giocatoriTotali: totaleGiocatori,
        farmAttive,
        farmInattive
      }));
    });

    return () => unsubscribe();
  }, []);

  // Effetto per caricare le assegnazioni
  useEffect(() => {
    const loadAssegnazioni = async () => {
      // Carica assegnazioni città
      const cittaSnapshot = await getDocsWithRateLimit(collection(db, 'citta'));
      let assegnazioniCitta = 0;
      cittaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.incarichi) {
          data.incarichi.forEach((inc: any) => {
            if (inc.contatore && typeof inc.contatore === 'string') {
              const [assegnati] = inc.contatore.split('/').map(Number);
              if (!isNaN(assegnati)) {
                assegnazioniCitta += assegnati;
              }
            }
          });
        }
      });

      // Carica assegnazioni cesti
      const cestiSnapshot = await getDocsWithRateLimit(collection(db, 'cesti'));
      let assegnazioniCesti = 0;
      cestiSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.incarichi) {
          data.incarichi.forEach((inc: any) => {
            if (inc.contatore && typeof inc.contatore === 'string') {
              const [assegnati] = inc.contatore.split('/').map(Number);
              if (!isNaN(assegnati)) {
                assegnazioniCesti += assegnati;
              }
            }
          });
        }
      });

      // Carica assegnazioni incarichi
      const incarichiSnapshot = await getDocsWithRateLimit(collection(db, 'incarichi'));
      let assegnazioniIncarichi = 0;
      incarichiSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.contatore && typeof data.contatore === 'string') {
          const [assegnati] = data.contatore.split('/').map(Number);
          if (!isNaN(assegnati)) {
            assegnazioniIncarichi += assegnati;
          }
        }
      });

      setStats(prev => ({
        ...prev,
        assegnazioni: {
          citta: assegnazioniCitta,
          cesti: assegnazioniCesti,
          incarichi: assegnazioniIncarichi
        }
      }));
    };

    loadAssegnazioni();
    
    // Imposta un listener per gli aggiornamenti in tempo reale
    const unsubscribeCitta = onSnapshot(collection(db, 'citta'), () => loadAssegnazioni());
    const unsubscribeCesti = onSnapshot(collection(db, 'cesti'), () => loadAssegnazioni());
    const unsubscribeIncarichi = onSnapshot(collection(db, 'incarichi'), () => loadAssegnazioni());
    
    return () => {
      unsubscribeCitta();
      unsubscribeCesti();
      unsubscribeIncarichi();
    };
  }, []);

  // Effetto per caricare gli ultimi incarichi completati
  useEffect(() => {
    const loadUltimiIncarichi = async () => {
      const q = query(
        collection(db, 'incarichi_completati'),
        orderBy('data_completamento', 'desc'),
        limit(5)
      );

      const snapshot = await getDocsWithRateLimit(q);
      const incarichi = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const giocatoreDoc = await getDocsWithRateLimit(query(collection(db, 'utenti'), where('id', '==', data.giocatore_id)));
        const giocatore = giocatoreDoc.docs[0]?.data();
        
        return {
          id: doc.id,
          ...data,
          giocatore: giocatore
        };
      }));

      setUltimiIncarichi(incarichi);
    };

    loadUltimiIncarichi();
  }, []);

  // Effetto per caricare i giocatori più attivi
  useEffect(() => {
    const loadGiocatoriAttivi = async () => {
      const q = query(collection(db, 'utenti'), where('ruolo', '!=', 'admin'));
      const snapshot = await getDocsWithRateLimit(q);
      
      const giocatori = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          farmAttive: doc.data().farms?.filter((f: any) => f.stato === 'attivo').length || 0
        }))
        .sort((a, b) => b.farmAttive - a.farmAttive)
        .slice(0, 5);

      setGiocatoriAttivi(giocatori);
    };

    loadGiocatoriAttivi();
  }, []);

  const statCards = [
    {
      title: 'Giocatori',
      value: stats.giocatoriTotali,
      icon: <GroupIcon sx={{ fontSize: 32 }} />,
      action: () => navigate('/giocatori'),
      color: '#1976d2',
      chips: [
        { value: stats.farmAttive, label: 'Farm Attive', color: 'success' },
        { value: stats.farmInattive, label: 'Farm Inattive', color: 'default' }
      ]
    },
    {
      title: 'Assegnazioni',
      value: stats.assegnazioni.citta + stats.assegnazioni.cesti + stats.assegnazioni.incarichi,
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      action: () => navigate('/admin/assegnazioni'),
      color: '#2e7d32',
      chips: [
        { value: stats.assegnazioni.citta, label: 'Città', color: 'default' },
        { value: stats.assegnazioni.cesti, label: 'Cesti', color: 'default' },
        { value: stats.assegnazioni.incarichi, label: 'Incarichi', color: 'default' }
      ]
    }
  ];

  return (
    <Layout>
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          {statCards.map((stat) => (
            <Grid item xs={12} sm={6} key={stat.title}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'auto',
                  minHeight: 140,
                  bgcolor: '#fff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: stat.color,
                      borderRadius: '50%',
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" sx={{ ml: 2, fontSize: '1.1rem' }}>
                    {stat.title}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                  {stat.value}
                </Typography>
                </Box>

                {stat.chips && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1, 
                    mb: 2
                  }}>
                    {stat.chips.map((chip, index) => (
                      <Box
                        key={index}
                        sx={{
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          py: 0.5,
                          px: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {chip.label}
                        </Typography>
                        <Typography variant="body2" color="text.primary" fontWeight="medium">
                          {chip.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ mt: 'auto' }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="small"
                  onClick={stat.action}
                    sx={{ 
                      bgcolor: stat.color,
                      '&:hover': { bgcolor: stat.color }
                    }}
                >
                    VISUALIZZA DETTAGLI
                </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                  Giocatori Più Attivi
                </Typography>
                {giocatoriAttivi.length > 0 ? (
                  <List>
                    {giocatoriAttivi.map((giocatore, index) => (
                      <React.Fragment key={giocatore.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar src={giocatore.immagine}>
                              {giocatore.nome?.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={giocatore.nome}
                            secondary={`${giocatore.farmAttive} farm attive`}
                          />
                          <Chip
                            size="small"
                            label={`${giocatore.farmAttive} farm`}
                            color={giocatore.farmAttive > 0 ? 'success' : 'default'}
                          />
                        </ListItem>
                        {index < giocatoriAttivi.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                <Typography variant="body2" color="text.secondary">
                  Nessun giocatore attivo
                </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/giocatori')}
                >
                  VEDI TUTTI
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
