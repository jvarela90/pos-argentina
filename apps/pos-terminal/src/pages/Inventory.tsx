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

function Inventory() {
  const { state } = usePOS();

  const hasInventoryModule = state.installedModules.includes('inventory');

  if (!hasInventoryModule) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ModuleIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 3 }} />
            
            <Typography variant="h5" gutterBottom>
              Módulo de Inventario no instalado
            </Typography>
            
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Para gestionar tu inventario de productos, necesitas instalar el módulo 
              <strong> Inventory-Lite</strong> por $4.000 ARS/mes.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ¿Qué incluye Inventory-Lite?
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Gestión de hasta 2.000 productos</li>
                <li>Control básico de stock</li>
                <li>Búsqueda por nombre o código de barras</li>
                <li>Alertas de stock bajo</li>
                <li>Backup automático diario</li>
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
        Inventario
      </Typography>
      
      <Typography color="text.secondary">
        Módulo de inventario disponible próximamente...
      </Typography>
    </Box>
  );
}

export default Inventory;