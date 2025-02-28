import React from 'react';
import { Box, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import Layout from '../layout/Layout';

const PaginaInCostruzione: React.FC = () => {
  return (
    <Layout>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        padding={4}
      >
        <ConstructionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Pagina in costruzione
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          Questa sezione è attualmente in fase di sviluppo.
          <br />
          Torneremo presto con nuovi contenuti!
        </Typography>
      </Box>
    </Layout>
  );
};

export default PaginaInCostruzione; 