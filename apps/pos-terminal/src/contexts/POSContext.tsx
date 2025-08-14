import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { POSCoreModule } from '@pos-argentina/pos-core';
import { Product, Sale, SaleItem, Customer } from '@pos-argentina/shared';

// Estado global del POS
interface POSState {
  posCore: POSCoreModule | null;
  currentSale: Sale | null;
  cartItems: SaleItem[];
  cartTotal: number;
  products: Product[];
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  installedModules: string[];
}

// Acciones del reducer
type POSAction = 
  | { type: 'INIT_POS_CORE'; payload: POSCoreModule }
  | { type: 'START_SALE'; payload: Sale }
  | { type: 'ADD_TO_CART'; payload: { item: SaleItem; total: number } }
  | { type: 'REMOVE_FROM_CART'; payload: { itemId: string; total: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'UPDATE_PRODUCTS'; payload: Product[] }
  | { type: 'UPDATE_CUSTOMERS'; payload: Customer[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_MODULES'; payload: string[] };

const initialState: POSState = {
  posCore: null,
  currentSale: null,
  cartItems: [],
  cartTotal: 0,
  products: [],
  customers: [],
  isLoading: true,
  error: null,
  installedModules: ['pos-core']
};

// Reducer para manejar el estado
function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'INIT_POS_CORE':
      return {
        ...state,
        posCore: action.payload,
        isLoading: false
      };

    case 'START_SALE':
      return {
        ...state,
        currentSale: action.payload,
        cartItems: [],
        cartTotal: 0
      };

    case 'ADD_TO_CART':
      return {
        ...state,
        cartItems: [...state.cartItems, action.payload.item],
        cartTotal: action.payload.total
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cartItems: state.cartItems.filter(item => item.id !== action.payload.itemId),
        cartTotal: action.payload.total
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cartItems: [],
        cartTotal: 0,
        currentSale: null
      };

    case 'UPDATE_PRODUCTS':
      return {
        ...state,
        products: action.payload
      };

    case 'UPDATE_CUSTOMERS':
      return {
        ...state,
        customers: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'UPDATE_MODULES':
      return {
        ...state,
        installedModules: action.payload
      };

    default:
      return state;
  }
}

// Context
const POSContext = createContext<{
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
  // Funciones helper
  addProductToCart: (product: Product, quantity?: number) => void;
  removeProductFromCart: (itemId: string) => void;
  startNewSale: () => void;
  processPayment: (paymentMethod: string, amount: number) => Promise<boolean>;
  clearCart: () => void;
} | null>(null);

// Hook para usar el context
export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within POSProvider');
  }
  return context;
}

// Provider component
export function POSProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Inicializar POS Core al montar
  useEffect(() => {
    initializePOSSystem();
  }, []);

  const initializePOSSystem = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Crear instancia del módulo POS Core
      const posCore = new POSCoreModule();
      
      // Activar el módulo
      const activated = await posCore.activate();
      
      if (!activated) {
        throw new Error('Failed to activate POS Core module');
      }

      // Configurar event listeners
      setupEventListeners(posCore);
      
      // Cargar datos iniciales
      await loadInitialData();
      
      dispatch({ type: 'INIT_POS_CORE', payload: posCore });
      
      console.log('✅ POS System initialized successfully');
    } catch (error) {
      console.error('❌ POS System initialization failed:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const setupEventListeners = (posCore: POSCoreModule) => {
    // Escuchar eventos del sistema
    posCore['eventBus'].subscribe('pos-core', 'item.added', (event) => {
      const cartState = posCore.getCartState();
      dispatch({
        type: 'ADD_TO_CART',
        payload: {
          item: event.data.item,
          total: cartState.total
        }
      });
    });

    posCore['eventBus'].subscribe('pos-core', 'item.removed', (event) => {
      const cartState = posCore.getCartState();
      dispatch({
        type: 'REMOVE_FROM_CART',
        payload: {
          itemId: event.data.itemId,
          total: cartState.total
        }
      });
    });

    posCore['eventBus'].subscribe('pos-core', 'sale.started', (event) => {
      const currentSale = posCore.getCurrentSale();
      if (currentSale) {
        dispatch({ type: 'START_SALE', payload: currentSale });
      }
    });

    posCore['eventBus'].subscribe('pos-core', 'sale.completed', () => {
      dispatch({ type: 'CLEAR_CART' });
    });
  };

  const loadInitialData = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      // Cargar productos
      const productsResponse = await fetch(`${apiBaseUrl}/api/v1/products`);
      const productsData = await productsResponse.json();
      if (productsData.success) {
        dispatch({ type: 'UPDATE_PRODUCTS', payload: productsData.data });
      } else {
        throw new Error('Failed to fetch products');
      }

      // Aquí se cargarían también los clientes

    } catch (error) {
      console.error("Error loading initial data:", error);
      dispatch({ type: 'SET_ERROR', payload: 'No se pudieron cargar los datos iniciales.' });
    }
  };

  // Funciones helper para interactuar con el POS
  const addProductToCart = (product: Product, quantity: number = 1) => {
    if (!state.posCore) return;

    if (!state.currentSale) {
      // Iniciar nueva venta si no hay una activa
      startNewSale();
    }

    state.posCore.addProductToCart(product, quantity);
  };

  const removeProductFromCart = (itemId: string) => {
    if (!state.posCore) return;
    state.posCore.removeProductFromCart(itemId);
  };

  const startNewSale = () => {
    if (!state.posCore) return;
    state.posCore.startNewSale();
  };

  const processPayment = async (paymentMethod: string, amount: number): Promise<boolean> => {
    if (!state.posCore) return false;

    try {
      const result = await state.posCore.processPayment({
        method: paymentMethod as any,
        amount
      });

      return result.success;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return false;
    }
  };

  const clearCart = () => {
    if (!state.posCore) return;
    state.posCore.cancelCurrentSale();
  };

  return (
    <POSContext.Provider value={{
      state,
      dispatch,
      addProductToCart,
      removeProductFromCart,
      startNewSale,
      processPayment,
      clearCart
    }}>
      {children}
    </POSContext.Provider>
  );
}