// Jest setup file
import '@testing-library/jest-dom';

// Mock de APIs del navegador para testing
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
});

// Mock de navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock de crypto para UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock de indexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockIDBOpenDBRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockIDBDatabase,
};

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn(() => mockIDBOpenDBRequest),
    deleteDatabase: jest.fn(),
  },
});

// Mock de Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve()),
    getRegistration: jest.fn(() => Promise.resolve()),
  },
});

// Mock console para tests más limpios
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Aumentar timeout para tests de integración
jest.setTimeout(30000);

// Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});