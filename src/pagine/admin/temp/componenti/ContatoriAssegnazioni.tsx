import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";

interface ContatoriAssegnazioniProps {
  conteggi: ConteggioAssegnazioni;
  mostraCompletati?: boolean;
}

/**
 * Componente per visualizzare i contatori delle assegnazioni
 * Mostra due chip: uno per le farm attive e uno per le farm inattive
 */
export const ContatoriAssegnazioni: React.FC<ContatoriAssegnazioniProps> = ({
  conteggi,
  mostraCompletati = false,
}) => {
  // Calcola il totale delle assegnazioni attive
  const totaleAttive = conteggi.totaleAttive;
  // Calcola il totale delle assegnazioni inattive
  const totaleInattive = conteggi.totaleInattive;
  // Calcola il totale delle assegnazioni completate attive
  const completateAttive = conteggi.completateAttive;
  // Calcola il totale delle assegnazioni completate inattive
  const completateInattive = conteggi.completateInattive;

  // Calcola il testo da mostrare nei tooltip
  const tooltipAttiviText = mostraCompletati
    ? `${completateAttive} completati su ${totaleAttive} assegnati a farm attive`
    : `${totaleAttive} assegnati a farm attive`;

  const tooltipInattiviText = mostraCompletati
    ? `${completateInattive} completati su ${totaleInattive} assegnati a farm inattive`
    : `${totaleInattive} assegnati a farm inattive`;

  // Calcola il testo da mostrare nei chip
  const chipAttiviText = mostraCompletati
    ? `${completateAttive}/${totaleAttive}`
    : `${totaleAttive}`;

  const chipInattiviText = mostraCompletati
    ? `${completateInattive}/${totaleInattive}`
    : `${totaleInattive}`;

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
      {/* Chip per le farm attive */}
      {totaleAttive > 0 && (
        <Tooltip title={tooltipAttiviText} arrow>
          <Chip
            label={chipAttiviText}
            size="small"
            color="primary"
            sx={{
              height: 20,
              fontSize: "0.7rem",
              "& .MuiChip-label": { px: 1 },
              flexShrink: 0,
              minWidth: 0
            }}
          />
        </Tooltip>
      )}

      {/* Chip per le farm inattive */}
      {totaleInattive > 0 && (
        <Tooltip title={tooltipInattiviText} arrow>
          <Chip
            label={chipInattiviText}
            size="small"
            color="default"
            sx={{
              height: 20,
              fontSize: "0.7rem",
              "& .MuiChip-label": { px: 1 },
              opacity: 0.7,
              flexShrink: 0,
              minWidth: 0
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}; 