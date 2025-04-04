import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../configurazione/firebase';
import { DerbyStorico, StatisticheDerby } from '../../tipi/derby';
import Layout from '../../componenti/layout/Layout';
import { PieChart } from 'react-minimal-pie-chart';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Statistiche() {
  const [derbyStorico, setDerbyStorico] = useState<DerbyStorico[]>([]);
  const [statistiche, setStatistiche] = useState<StatisticheDerby>({
    totale_derby: 0,
    per_tipo: {}
  });
  const [hovered, setHovered] = useState<number | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const q = query(
      collection(db, 'derby_storico'),
      orderBy('data_inizio', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storico = snapshot.docs.map(doc => doc.data() as DerbyStorico);
      setDerbyStorico(storico);

      // Calcola le statistiche
      const stats: StatisticheDerby = {
        totale_derby: storico.length,
        per_tipo: {}
      };

      storico.forEach(derby => {
        stats.per_tipo[derby.nome] = (stats.per_tipo[derby.nome] || 0) + 1;
      });

      setStatistiche(stats);
    });

    return () => unsubscribe();
  }, []);

  const pieChartData = Object.entries(statistiche.per_tipo).map(([nome, count], index) => {
    const derby = derbyStorico.find(d => d.nome === nome);
    return {
      title: nome,
      value: count,
      color: derby?.colore || '#cccccc',
      key: index
    };
  });

  return (
    <Layout>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h5" gutterBottom>
          Statistiche Derby
        </Typography>

        <Grid container spacing={3}>
          {/* Grafico a torta */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ 
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': { 
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Distribuzione Derby
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
                  <Box sx={{ 
                    width: isMobile ? '100%' : '60%', 
                    height: isMobile ? 200 : 280,
                    position: 'relative',
                    mb: isMobile ? 2 : 0
                  }}>
                    <PieChart
                      data={pieChartData.map((entry, i) => ({
                        ...entry,
                        color: hovered === i ? theme.palette.primary.light : entry.color,
                      }))}
                      lineWidth={30}
                      paddingAngle={4}
                      rounded
                      animate
                      animationDuration={500}
                      radius={isMobile ? 35 : 40}
                      onMouseOver={(_, index) => setHovered(index)}
                      onMouseOut={() => setHovered(null)}
                      segmentsStyle={{ transition: 'stroke-width 0.2s', cursor: 'pointer' }}
                      segmentsShift={(index) => (hovered === index ? 5 : 0)}
                      viewBoxSize={[100, 100]}
                    />
                  </Box>

                  {/* Legenda */}
                  <Box sx={{ 
                    width: isMobile ? '100%' : '40%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: isMobile ? 0 : 2
                  }}>
                    {pieChartData.map((entry, i) => (
                      <Box 
                        key={i} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          p: 1,
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: hovered === i ? 'rgba(0,0,0,0.04)' : 'transparent',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        }}
                        onMouseOver={() => setHovered(i)}
                        onMouseOut={() => setHovered(null)}
                      >
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          mr: 1.5,
                          backgroundColor: entry.color,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          border: '2px solid white'
                        }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.title}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {entry.value} derby
                            </Typography>
                            <Chip 
                              label={`${Math.round((entry.value / statistiche.totale_derby) * 100)}%`} 
                              size="small" 
                              sx={{ 
                                height: 20, 
                                fontSize: '0.65rem', 
                                fontWeight: 'bold',
                                backgroundColor: hovered === i ? entry.color : 'rgba(0,0,0,0.06)',
                                color: hovered === i ? 'white' : 'text.primary',
                                transition: 'all 0.2s ease',
                                ml: 1
                              }} 
                            />
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Contatori */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ 
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': { 
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Riepilogo
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          Totale Derby Completati
                        </Typography>
                      }
                      secondary={
                        <Chip 
                          label={statistiche.totale_derby} 
                          color="primary" 
                          sx={{ 
                            mt: 0.5,
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }} 
                        />
                      }
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  {Object.entries(statistiche.per_tipo).map(([nome, count], index) => {
                    const derby = derbyStorico.find(d => d.nome === nome);
                    return (
                      <ListItem key={nome} sx={{
                        transition: 'background-color 0.2s',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        borderRadius: 1
                      }}>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: derby?.colore || '#cccccc',
                                  mr: 1.5,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  border: '2px solid white'
                                }}
                              />
                              <Typography variant="body2" fontWeight={600}>
                                {nome}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ ml: 3.5 }}
                            >
                              {count} derby
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12}>
            <Accordion defaultExpanded sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                }}
              >
                <Typography variant="h6" fontWeight={600}>Cronologia Derby</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List sx={{ pt: 0 }}>
                  {derbyStorico.map((derby) => (
                    <ListItem key={derby.id} sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      transition: 'background-color 0.2s',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                    }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: derby.colore,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '2px solid white'
                              }}
                            />
                            <Typography variant="subtitle1" fontWeight={500}>
                              {derby.nome}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
                            {`Dal ${format(derby.data_inizio.toDate(), 'PPP', { locale: it })} al ${
                              derby.data_fine 
                                ? format(derby.data_fine.toDate(), 'PPP', { locale: it })
                                : 'In corso'
                            }`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Spazio per future statistiche */}
          <Grid item xs={12}>
            <Accordion sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                }}
              >
                <Typography variant="h6" fontWeight={600}>Altre Statistiche</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">
                  Sezione predisposta per future statistiche aggiuntive
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
} 