import React from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface ProgressoBarProps {
  totaleIncarichi: number;
  incarichiCompletati: number;
  incarichiInProgresso: number;
  incarichiAssegnati: number;
}

export default function ProgressoBar({
  totaleIncarichi,
  incarichiCompletati,
  incarichiInProgresso,
  incarichiAssegnati,
}: ProgressoBarProps) {
  const { t } = useTranslation();
  
  // Calcolo della percentuale
  const percentualeCompletati = totaleIncarichi > 0
    ? Math.round((incarichiCompletati / totaleIncarichi) * 100)
    : 0;
  
  // Verifica se tutti gli incarichi sono completati
  const tuttiCompletati = incarichiCompletati === totaleIncarichi && totaleIncarichi > 0;

  // Calcolo percentuale di incarichi assegnati rispetto al totale
  const percentualeAssegnati = totaleIncarichi > 0
    ? Math.round((incarichiAssegnati / totaleIncarichi) * 100)
    : 0;

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 1.5, 
        mb: 3, 
        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
        borderRadius: 2,
        background: tuttiCompletati 
          ? "linear-gradient(to right, rgba(232, 245, 233, 0.6), rgba(220, 237, 222, 0.9))" 
          : "linear-gradient(to right, rgba(240,249,255,0.5), rgba(224,242,254,0.8))",
        border: tuttiCompletati 
          ? "1px solid rgba(76, 175, 80, 0.2)" 
          : "1px solid rgba(29, 144, 243, 0.1)"
      }}
    >
      <Box sx={{ mb: 0.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, alignItems: "center" }}>
          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
            {t('progresso.completamento')}: <span style={{ fontWeight: "bold", color: tuttiCompletati ? "#4caf50" : "#1976d2" }}>{percentualeCompletati}%</span>
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: tuttiCompletati ? "success.main" : "info.main",
              fontWeight: "medium"
            }}
          >
            {incarichiCompletati} / {totaleIncarichi} {t('progresso.incarichi')}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={percentualeCompletati} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: tuttiCompletati ? "rgba(200, 237, 200, 0.5)" : "rgba(200, 230, 255, 0.5)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: tuttiCompletati ? "success.main" : "primary.main",
              backgroundImage: tuttiCompletati 
                ? "linear-gradient(to right, #43a047, #66bb6a)" 
                : "linear-gradient(to right, #1976d2, #2196f3)",
              boxShadow: tuttiCompletati 
                ? "0 1px 3px rgba(76, 175, 80, 0.3)" 
                : "0 1px 3px rgba(33, 150, 243, 0.3)"
            }
          }}
        />
      </Box>
      
      {/* Mostra gli incarichi in progresso */}
      {incarichiInProgresso > 0 && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: "info.main",
            fontWeight: "medium",
            mt: 1
          }}
        >
          {t('progresso.incarichi_in_progresso')}: {incarichiInProgresso}
        </Typography>
      )}
    </Paper>
  );
} 