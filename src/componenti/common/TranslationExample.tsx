import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Button, Paper } from "@mui/material";

/**
 * Componente di esempio che mostra come utilizzare le traduzioni con react-i18next
 */
const TranslationExample: React.FC = () => {
  // Ottieni le funzioni di traduzione
  const { t } = useTranslation();

  return (
    <Paper elevation={3} sx={{ p: 3, my: 2 }}>
      <Typography variant="h4" gutterBottom>
        {t("app.titolo")}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        {t("app.sottotitolo")}
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" paragraph>
          Questo è un esempio di come utilizzare le traduzioni nel tuo progetto.
          I testi qui sopra sono tradotti automaticamente in base alla lingua
          selezionata.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button variant="contained" color="primary">
            {t("comune.salva")}
          </Button>

          <Button variant="outlined" color="secondary">
            {t("comune.annulla")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default TranslationExample;
