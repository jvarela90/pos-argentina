import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import {
  CheckCircle as InstalledIcon,
  GetApp as InstallIcon,
  Star as PremiumIcon
} from '@mui/icons-material';
import { usePOS } from '../contexts/POSContext';
import { formatCurrency } from '@pos-argentina/shared';

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  trialDays: number;
  features: string[];
  category: 'base' | 'premium' | 'specialized';
  comingSoon?: boolean;
}

function ModuleManager() {
  const { state } = usePOS();

  const modules: ModuleInfo[] = [
    {
      id: 'pos-core',
      name: 'POS Core',
      description: 'Módulo base del sistema - Terminal de ventas básica',
      price: 12000,
      trialDays: 30,
      category: 'base',
      features: [
        'Terminal de venta básica',
        'Carrito de compras',
        'Pago en efectivo',
        'Impresión de tickets',
        'Funcionamiento offline',
        'Hasta 500 productos'
      ]
    },
    {
      id: 'inventory',
      name: 'Inventory-Lite',
      description: 'Gestión básica de productos y stock',
      price: 4000,
      trialDays: 15,
      category: 'base',
      features: [
        'Hasta 2.000 productos',
        'Control básico de stock',
        'Búsqueda por código de barras',
        'Alertas de stock bajo',
        'Backup automático diario'
      ]
    },
    {
      id: 'customers',
      name: 'Customers-Basic',
      description: 'Gestión de clientes y sistema de "fiado"',
      price: 3000,
      trialDays: 15,
      category: 'base',
      features: [
        'Hasta 1.000 clientes',
        'Sistema de cuenta corriente',
        'Límites de crédito',
        'Historial de transacciones',
        'Recordatorios de cobro'
      ]
    },
    {
      id: 'fiscal',
      name: 'Fiscal-Simple',
      description: 'Facturación electrónica AFIP',
      price: 6000,
      trialDays: 7,
      category: 'premium',
      features: [
        'Facturación electrónica B y C',
        'CAE automático',
        'Integración con AFIP',
        'Backup en la nube',
        'Hasta 500 facturas/mes'
      ]
    },
    {
      id: 'payments',
      name: 'Payments-Digital',
      description: 'Pagos digitales y tarjetas',
      price: 5000,
      trialDays: 7,
      category: 'premium',
      features: [
        'MercadoPago integrado',
        'QR interoperable',
        'Procesamiento de tarjetas',
        'Link de pago WhatsApp',
        'Reconciliación automática'
      ]
    },
    {
      id: 'reports',
      name: 'Reports-Basic',
      description: 'Reportes y analytics básicos',
      price: 2500,
      trialDays: 15,
      category: 'base',
      features: [
        'Reportes diarios automáticos',
        'Top 10 productos',
        'Análisis de rentabilidad',
        'Exportación Excel/PDF',
        'Gráficos básicos'
      ]
    }
  ];

  const combos = [
    {
      id: 'kiosco',
      name: 'Combo Kiosco',
      description: 'Perfecto para kioscos y ventas rápidas',
      modules: ['pos-core', 'inventory'],
      originalPrice: 16000,
      price: 18000,
      savings: 2000
    },
    {
      id: 'almacen',
      name: 'Combo Almacén',
      description: 'Ideal para almacenes de barrio con fiado',
      modules: ['pos-core', 'inventory', 'customers', 'reports'],
      originalPrice: 21500,
      price: 21000,
      savings: 500
    },
    {
      id: 'profesional',
      name: 'Combo Profesional',
      description: 'Sistema completo con facturación y pagos',
      modules: ['pos-core', 'inventory', 'customers', 'fiscal', 'payments', 'reports'],
      originalPrice: 32500,
      price: 32000,
      savings: 500
    }
  ];

  const isModuleInstalled = (moduleId: string) => {
    return state.installedModules.includes(moduleId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'base': return 'primary';
      case 'premium': return 'secondary';
      case 'specialized': return 'info';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'base': return 'Básico';
      case 'premium': return 'Premium';
      case 'specialized': return 'Especializado';
      default: return category;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestión de Módulos
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        Personaliza tu sistema POS con módulos específicos para tu negocio.
        Solo paga por lo que necesitas.
      </Typography>

      {/* Combos predefinidos */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Combos Recomendados
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {combos.map((combo) => (
          <Grid item xs={12} md={4} key={combo.id}>
            <Card sx={{ height: '100%', position: 'relative' }}>
              {combo.savings > 0 && (
                <Chip
                  label={`Ahorro ${formatCurrency(combo.savings)}`}
                  color="success"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1
                  }}
                />
              )}
              
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {combo.name}
                </Typography>
                
                <Typography color="text.secondary" paragraph>
                  {combo.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {combo.savings > 0 && (
                    <Typography 
                      variant="body2" 
                      sx={{ textDecoration: 'line-through', color: 'text.disabled' }}
                    >
                      {formatCurrency(combo.originalPrice)}
                    </Typography>
                  )}
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                    {formatCurrency(combo.price)}/mes
                  </Typography>
                </Box>

                <Typography variant="caption" display="block" gutterBottom>
                  Incluye:
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  {combo.modules.map((moduleId) => {
                    const module = modules.find(m => m.id === moduleId);
                    return module ? (
                      <Chip
                        key={moduleId}
                        label={module.name}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ) : null;
                  })}
                </Box>

                <Button variant="contained" fullWidth>
                  Contratar Combo
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Módulos individuales */}
      <Typography variant="h5" gutterBottom>
        Módulos Individuales
      </Typography>

      <Grid container spacing={3}>
        {modules.map((module) => {
          const installed = isModuleInstalled(module.id);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={module.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                {installed && (
                  <Chip
                    icon={<InstalledIcon />}
                    label="Instalado"
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 1
                    }}
                  />
                )}

                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="h6">
                      {module.name}
                    </Typography>
                    <Chip
                      label={getCategoryLabel(module.category)}
                      size="small"
                      color={getCategoryColor(module.category) as any}
                      variant="outlined"
                    />
                  </Box>

                  <Typography color="text.secondary" paragraph>
                    {module.description}
                  </Typography>

                  <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 2 }}>
                    {formatCurrency(module.price)}/mes
                  </Typography>

                  <Typography variant="caption" display="block" gutterBottom>
                    Funcionalidades:
                  </Typography>
                  
                  <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                    {module.features.map((feature, index) => (
                      <Typography 
                        component="li" 
                        variant="body2" 
                        key={index}
                        sx={{ mb: 0.5 }}
                      >
                        {feature}
                      </Typography>
                    ))}
                  </Box>

                  {!installed ? (
                    <Box>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<InstallIcon />}
                        disabled={module.comingSoon}
                        sx={{ mb: 1 }}
                      >
                        {module.comingSoon ? 'Próximamente' : `Probar ${module.trialDays} días gratis`}
                      </Button>
                      
                      {!module.comingSoon && (
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                          Luego {formatCurrency(module.price)}/mes
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      <Button variant="outlined" fullWidth disabled>
                        Instalado y Activo
                      </Button>
                      
                      <Typography variant="caption" color="success.main" display="block" textAlign="center" sx={{ mt: 1 }}>
                        ✓ Funcionando correctamente
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Información adicional */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 ¿Cómo funcionan las pruebas gratuitas?
        </Typography>
        <Typography variant="body2">
          Cada módulo incluye un período de prueba gratuito. Al finalizar, 
          puedes decidir si mantenerlo activo o desinstalarlo sin costo. 
          Los datos se conservan por 30 días en caso de reactivación.
        </Typography>
      </Alert>
    </Box>
  );
}

export default ModuleManager;