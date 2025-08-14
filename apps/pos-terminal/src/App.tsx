import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import SalesTerminal from './pages/SalesTerminal';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ModuleManager from './pages/ModuleManager';

function App() {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Header />
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden'
      }}>
        <Navigation />
        
        <Box 
          component="main" 
          sx={{ 
            flex: 1, 
            p: 2, 
            overflow: 'auto',
            backgroundColor: 'background.default'
          }}
        >
          <Routes>
            <Route path="/" element={<SalesTerminal />} />
            <Route path="/sales" element={<SalesTerminal />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/modules" element={<ModuleManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;