import React, { useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";
import { IncaricoCitta } from "../../../../tipi/incarico";
import { Assegnazione } from "../../../../tipi/assegnazione";
import { useTranslation } from "react-i18next";
import IncaricoGiocatoreCard from "./IncaricoGiocatoreCard";

// Estensione dell'interfaccia Assegnazione per aggiungere la proprietà quantita
interface AssegnazioneEstesa extends Assegnazione {
  quantita?: number;
}

// Estensione dell'interfaccia IncaricoCitta per aggiungere le proprietà mancanti
interface IncaricoCittaEsteso extends IncaricoCitta {
  livello?: number;
  categoria?: string;
  descrizione?: string;
  requisiti?: string;
  ricompense?: string;
  cesto_id?: string;
  cesto_nome?: string;
  quantita_cesto?: number;
}

interface ListaIncarichiCittaProps {
  incarichiCitta: IncaricoCittaEsteso[];
  assegnazioni: AssegnazioneEstesa[];
  progressi: Map<string, number>;
  searchQuery: string;
  mostraSoloAssegnati: boolean;
  elementoEvidenziato: { tipo: 'incarico' | 'incaricoCitta' | 'cesto'; id: string } | null;
  onToggleCompletamento: (incaricoId: string, completato: boolean) => void;
  onUpdateQuantita: (incaricoId: string, quantita: number) => void;
  onEvidenziazioneFine: () => void;
  getQuantitaIncarico?: (incarico: IncaricoCittaEsteso) => number;
  livelloFarmSelezionata?: number;
  expandedIncarichi?: string[];
  onIncaricoExpand?: (incaricoId: string, isExpanded: boolean) => void;
  getProgressoCorrente?: (incaricoId: string) => number;
  trovaCestoPerIncarico?: (incaricoId: string) => any;
  getQuantitaIncaricoCesto?: (cestoId: string, incaricoId: string) => number;
  onNavigateToCesto?: (cestoId: string) => void;
}

export default function ListaIncarichiCitta({
  incarichiCitta,
  assegnazioni,
  progressi,
  searchQuery,
  mostraSoloAssegnati,
  elementoEvidenziato,
  onToggleCompletamento,
  onUpdateQuantita,
  onEvidenziazioneFine,
  getQuantitaIncarico,
  livelloFarmSelezionata = 0,
  expandedIncarichi,
  onIncaricoExpand,
  getProgressoCorrente = (incaricoId: string) => progressi.get(incaricoId) || 0,
  trovaCestoPerIncarico,
  getQuantitaIncaricoCesto,
  onNavigateToCesto,
}: ListaIncarichiCittaProps) {
  const { t } = useTranslation();

  // Funzione per trovare l'assegnazione di un incarico
  const trovaAssegnazione = (incaricoId: string) => {
    return assegnazioni.find(a => a.riferimento_id === incaricoId);
  };

  // Funzione per trovare il progresso di un incarico
  const trovaProgresso = (incaricoId: string) => {
    return getProgressoCorrente(incaricoId);
  };

  // Funzione per tradurre i nomi degli incarichi
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
      ns: "common"
    });
    return traduzione;
  };

  // Funzione wrapper per getQuantitaIncarico che adatta il tipo
  const getQuantitaIncaricoWrapper = (incarico: any) => {
    if (getQuantitaIncarico) {
      return getQuantitaIncarico(incarico as IncaricoCittaEsteso);
    }
    return incarico.quantita || 0;
  };

  // Filtraggio degli incarichi città in base alla ricerca e alle opzioni selezionate
  const incarichiCittaFiltrati = useMemo(() => {
    let incarichiFiltratiTemp = incarichiCitta.filter(incarico => {
      // Filtraggio per ricerca
      if (searchQuery && !incarico.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filtraggio per incarichi assegnati
      if (mostraSoloAssegnati) {
        const assegnazione = trovaAssegnazione(incarico.id);
        return !!assegnazione;
      }
      
      return true;
    });
    
    return incarichiFiltratiTemp;
  }, [incarichiCitta, searchQuery, mostraSoloAssegnati, assegnazioni]);

  // Dividi gli incarichi per tipo
  const incarichiVisitatori = useMemo(() => {
    return incarichiCittaFiltrati
      .filter(incarico => incarico.tipo === 'visitatore')
      .sort((a, b) => a.nome.localeCompare(b.nome)); // Ordine alfabetico per i visitatori
  }, [incarichiCittaFiltrati]);

  const incarichiEdifici = useMemo(() => {
    return incarichiCittaFiltrati
      .filter(incarico => incarico.tipo === 'edificio')
      .sort((a, b) => (a.livello_minimo || 0) - (b.livello_minimo || 0)); // Ordine per livello per gli edifici
  }, [incarichiCittaFiltrati]);

  // Funzione per renderizzare un gruppo di incarichi
  const renderIncarichi = (incarichi: IncaricoCittaEsteso[], tipo: 'edificio' | 'visitatore') => {
    if (incarichi.length === 0) {
      return null;
    }

    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        mt: 0,
        width: '100%',
        // Rimuovo qualsiasi padding o margin che potrebbe causare spazi
        '& > *': { 
          mb: 0, 
          borderRadius: 0,
          width: '100%'
        }
      }}>
        {incarichi.map((incarico, index) => {
          const assegnazione = trovaAssegnazione(incarico.id);
          const progresso = trovaProgresso(incarico.id);
          const isEvidenziato = elementoEvidenziato?.tipo === 'incaricoCitta' && elementoEvidenziato.id === incarico.id;
          
          // Adatta l'incarico città al formato dell'incarico normale
          const incaricoAdattato = {
            ...incarico,
            edificio_id: incarico.tipo === 'edificio' ? "edificio_citta" : "visitatore_citta", // Assegna un edificio fittizio per compatibilità
            edificio: incarico.tipo === 'edificio' ? "Edificio" : "Visitatore", // Nome dell'edificio per visualizzazione
            // Aggiungi campi mancanti per soddisfare l'interfaccia IncaricoEsteso
            usato_in_cesti: incarico.usato_in_cesti || false,
          };
          
          return (
            <IncaricoGiocatoreCard
              key={incarico.id}
              incarico={incaricoAdattato}
              assegnazione={assegnazione}
              progresso={progresso}
              onToggleCompletamento={onToggleCompletamento}
              onUpdateQuantita={onUpdateQuantita}
              evidenziato={isEvidenziato}
              onEvidenziazioneFine={onEvidenziazioneFine}
              getQuantitaIncarico={getQuantitaIncaricoWrapper}
              livelloFarmSelezionata={livelloFarmSelezionata}
              expanded={expandedIncarichi?.includes(incarico.id)}
              onIncaricoExpand={onIncaricoExpand}
              trovaCestoPerIncarico={trovaCestoPerIncarico}
              getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
              onNavigateToCesto={onNavigateToCesto}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {incarichiCittaFiltrati.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: "center", my: 4 }}>
          {t('derby.nessun_incarico_citta_trovato')}
        </Typography>
      ) : (
        <Box sx={{ width: '100%' }}>
          {/* Sezione VISITATORI */}
          {incarichiVisitatori.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', px: 2, pt: 1, pb: 0.5 }}>
                VISITATORI
              </Typography>
              {renderIncarichi(incarichiVisitatori, 'visitatore')}
            </Box>
          )}

          {/* Divisore tra VISITATORI e EDIFICI */}
          {incarichiVisitatori.length > 0 && incarichiEdifici.length > 0 && (
            <Divider sx={{ my: 1, borderColor: 'rgba(0, 0, 0, 0.12)' }} />
          )}

          {/* Sezione EDIFICI */}
          {incarichiEdifici.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', px: 2, pt: 1, pb: 0.5 }}>
                EDIFICI
              </Typography>
              {renderIncarichi(incarichiEdifici, 'edificio')}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 