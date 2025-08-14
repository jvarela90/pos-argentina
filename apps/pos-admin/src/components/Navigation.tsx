import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  Badge
} from '@mui/material'
import {
  Dashboard,
  Inventory,
  People,
  Receipt,
  Assessment,
  Settings,
  Store,
  Warning
} from '@mui/icons-material'

const drawerWidth = 240

interface NavigationProps {
  open: boolean
  onClose?: () => void
}

const Navigation: React.FC<NavigationProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/',
      badge: null
    },
    {
      text: 'Productos',
      icon: <Inventory />,
      path: '/products',
      badge: { count: 2, color: 'warning' as const, tooltip: 'Stock bajo' }
    },
    {
      text: 'Clientes',
      icon: <People />,
      path: '/customers',
      badge: null
    },
    {
      text: 'Ventas',
      icon: <Receipt />,
      path: '/sales',
      badge: null
    },
    {
      text: 'Reportes',
      icon: <Assessment />,
      path: '/reports',
      badge: null
    },
    {
      text: 'Configuración',
      icon: <Settings />,
      path: '/settings',
      badge: null
    }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    if (onClose) {
      onClose()
    }
  }

  const drawerContent = (
    <Box>
      <Toolbar>
        <Store sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6" noWrap component="div">
          POS Argentina
        </Typography>
      </Toolbar>
      
      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText'
                  }
                }
              }}
            >
              <ListItemIcon>
                {item.badge ? (
                  <Badge 
                    badgeContent={item.badge.count} 
                    color={item.badge.color}
                    title={item.badge.tooltip}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      {/* Estado del sistema */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
          Estado del Sistema
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'success.main'
            }}
          />
          <Typography variant="body2">
            Online
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'warning.main'
            }}
          />
          <Typography variant="body2">
            2 alertas de stock
          </Typography>
        </Box>
        
        <Typography variant="caption" color="textSecondary">
          Última sync: hace 2 min
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}

export default Navigation