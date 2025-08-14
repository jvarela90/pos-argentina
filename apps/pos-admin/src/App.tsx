import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box, CssBaseline } from '@mui/material'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const drawerWidth = 240

function App() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Navigation open={true} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default App