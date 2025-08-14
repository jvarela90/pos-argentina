import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Typography,
  Badge
} from '@mui/material';
import {
  PointOfSale as SalesIcon,
  Inventory as InventoryIcon,
  People as CustomersIcon,
  Assessment as ReportsIcon,
  Extension as ModulesIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { usePOS } from '../../contexts/POSContext';

const drawerWidth = 240;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredModule?: string;
  badge?: number;
}

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = usePOS();

  const navigationItems: NavigationItem[] = [
    {
      id: 'sales',
      label: 'Terminal de Ventas',
      icon: <SalesIcon />,
      path: '/',
      requiredModule: 'pos-core'
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: <InventoryIcon />,
      path: '/inventory',
      requiredModule: 'inventory',
      badge: state.products.filter(p => p.stock <= p.minStock).length
    },
    {
      id: 'customers',
      label: 'Clientes',
      icon: <CustomersIcon />,
      path: '/customers',
      requiredModule: 'customers'
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: <ReportsIcon />,
      path: '/reports',
      requiredModule: 'reports'
    },
    {
      id: 'modules',
      label: 'Módulos',
      icon: <ModulesIcon />,
      path: '/modules'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: <SettingsIcon />,
      path: '/settings'
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isItemAvailable = (item: NavigationItem) => {
    if (!item.requiredModule) return true;
    return state.installedModules.includes(item.requiredModule);
  };

  const isItemActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/sales';
    }
    return location.pathname === path;
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'grey.50',
          borderRight: '1px solid',
          borderColor: 'grey.200',
          position: 'relative', // Para que no sea fixed
        },
      }}
    >
      {/* Header del drawer */}
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
          Navegación
        </Typography>
      </Box>

      <Divider />

      {/* Items principales */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navigationItems.map((item) => {
          const available = isItemAvailable(item);
          const active = isItemActive(item.path);

          return (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={() => available && handleNavigation(item.path)}
                disabled={!available}
                selected={active}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&.Mui-disabled': {
                    opacity: 0.5,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: active ? 'inherit' : 'action.active',
                  }}
                >
                  {item.badge && item.badge > 0 ? (
                    <Badge 
                      badgeContent={item.badge} 
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          right: -3,
                          top: 3,
                        }
                      }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: active ? 600 : 400,
                  }}
                />
                {!available && item.requiredModule && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.6rem',
                      opacity: 0.7,
                      textTransform: 'uppercase'
                    }}
                  >
                    Módulo
                  </Typography>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Estado del sistema */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Módulos activos: {state.installedModules.length}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Productos: {state.products.length}
        </Typography>
        {state.cartItems.length > 0 && (
          <Typography variant="caption" color="primary.main" display="block" sx={{ fontWeight: 600 }}>
            Carrito: {state.cartItems.length} items
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}

export default Navigation;