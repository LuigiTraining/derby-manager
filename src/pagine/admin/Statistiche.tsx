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

  const pieChartData = Object.entries(statistiche.per_tipo).map(([nome, count]) => {
    const derby = derbyStorico.find(d => d.nome === nome);
    return {
      title: nome,
      value: count,
      color: derby?.colore || '#cccccc'
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
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribuzione Derby
                </Typography>
                <Box sx={{ height: 300, position: 'relative' }}>
                  <PieChart
                    data={pieChartData}
                    lineWidth={40}
                    paddingAngle={2}
                    label={({ dataEntry }) => 
                      `${dataEntry.title}\n${Math.round(dataEntry.percentage)}%`
                    }
                    labelStyle={{
                      fontSize: '5px',
                      fontFamily: 'sans-serif',
                    }}
                    labelPosition={70}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Contatori */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Riepilogo
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Totale Derby Completati"
                      secondary={statistiche.totale_derby}
                    />
                  </ListItem>
                  <Divider />
                  {Object.entries(statistiche.per_tipo).map(([nome, count]) => (
                    <ListItem key={nome}>
                      <ListItemText 
                        primary={nome}
                        secondary={`${count} derby`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Cronologia Derby</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {derbyStorico.map((derby) => (
                    <ListItem key={derby.id}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: derby.colore,
                              }}
                            />
                            <Typography variant="subtitle1">
                              {derby.nome}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
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
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Altre Statistiche</Typography>
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