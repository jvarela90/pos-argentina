import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Button
} from '@mui/material';
import { usePOS } from '../contexts/POSContext';
import { formatCurrency } from '@pos-argentina/shared';

function Reports() {
  const { state } = usePOS();

  // Datos básicos disponibles sin módulo adicional
  const basicStats = React.useMemo(() => {
    if (!state.posCore) return null;

    // Obtener estadísticas básicas del POS Core
    const stats = state.posCore.getSalesStats(7); // Últimos 7 días
    
    return {
      totalSales: stats.totalSales,
      totalAmount: stats.totalAmount,
      averageSale: stats.averageSale,
      productCount: state.products.length,
      lowStockProducts: state.products.filter(p => p.stock <= p.minStock).length
    };
  }, [state.posCore, state.products]);

  const hasReportsModule = state.installedModules.includes('reports');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reportes
      </Typography>

      {/* Estadísticas básicas siempre disponibles */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                {basicStats?.totalSales || 0}
              </Typography>
              <Typography color="text.secondary">
                Ventas (7 días)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                {basicStats ? formatCurrency(basicStats.totalAmount) : formatCurrency(0)}
              </Typography>
              <Typography color="text.secondary">
                Facturación
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                {state.products.length}
              </Typography>
              <Typography color="text.secondary">
                Productos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                color={basicStats && basicStats.lowStockProducts > 0 ? "warning.main" : "success.main"}
                sx={{ fontWeight: 700 }}
              >
                {basicStats?.lowStockProducts || 0}
              </Typography>
              <Typography color="text.secondary">
                Stock Bajo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Módulo de reportes avanzados */}
      {!hasReportsModule ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h5" gutterBottom>
              Desbloquea Reportes Avanzados
            </Typography>
            
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Los reportes básicos están incluidos. Para análisis más detallados, 
              instala el módulo <strong>Reports-Basic</strong> por $2.500 ARS/mes.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                ¿Qué incluye Reports-Basic?
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Reportes diarios automáticos por email</li>
                <li>Top 10 productos más vendidos</li>
                <li>Análisis de rentabilidad por producto</li>
                <li>Exportación a Excel y PDF</li>
                <li>Gráficos de tendencias de ventas</li>
                <li>Comparativas mensuales y anuales</li>
              </ul>
            </Alert>

            <Button 
              variant="contained" 
              size="large"
              href="/modules"
            >
              Ver Módulos Disponibles
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Typography color="text.secondary">
          Reportes avanzados disponibles próximamente...
        </Typography>
      )}
    </Box>
  );
}

export default Reports;