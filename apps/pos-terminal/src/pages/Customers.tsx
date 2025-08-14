import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button
} from '@mui/material';
import { Extension as ModuleIcon } from '@mui/icons-material';
import { usePOS } from '../contexts/POSContext';

function Customers() {
  const { state } = usePOS();

  const hasCustomersModule = state.installedModules.includes('customers');

  if (!hasCustomersModule) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ModuleIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 3 }} />
            
            <Typography variant="h5" gutterBottom>
              Módulo de Clientes no instalado
            </Typography>
            
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Para gestionar clientes y el sistema de "fiado", necesitas instalar el módulo 
              <strong> Customers-Basic</strong> por $3.000 ARS/mes.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ¿Qué incluye Customers-Basic?
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Registro de hasta 1.000 clientes</li>
                <li>Sistema de cuenta corriente ("fiado")</li>
                <li>Límites de crédito configurables</li>
                <li>Historial de transacciones</li>
                <li>Recordatorios de cobro automático</li>
              </ul>
            </Alert>

            <Button 
              variant="contained" 
              size="large"
              href="/modules"
            >
              Instalar Módulo
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Clientes
      </Typography>
      
      <Typography color="text.secondary">
        Módulo de clientes disponible próximamente...
      </Typography>
    </Box>
  );
}

export default Customers;