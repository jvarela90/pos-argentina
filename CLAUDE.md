# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains comprehensive documentation for **POS Argentina** - a modular Point of Sale system specifically designed for the Argentine retail market. The system is designed to serve various types of businesses from small kiosks to larger supermarkets, with particular focus on:

- Small neighborhood stores (almacenes de barrio)
- Kiosks and convenience stores
- Grocery stores and produce markets
- General retail establishments

## Project Type and Architecture

This is a **documentation-only repository** containing detailed technical specifications, business requirements, and development guidelines for a modular POS system. **No code implementation exists yet** - this represents the planning and specification phase.

### Core System Characteristics

- **Modular Architecture**: System designed as independent modules that can be installed/uninstalled dynamically
- **Argentina-Specific**: Built for Argentine market needs including AFIP integration, "fiado" (store credit), and local payment methods
- **Offline-First**: Designed to work without internet connectivity with automatic synchronization
- **Progressive Web App**: PWA-based frontend for cross-platform compatibility
- **Multi-Terminal Support**: Can scale from single terminal to multiple synchronized terminals

## System Architecture Overview

### Technology Stack (Planned)
- **Frontend**: React 18 + Next.js + TypeScript for PWA
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (central) + SQLite (local terminals)
- **Synchronization**: PowerSync or similar for offline-first functionality
- **Testing**: Jest + React Testing Library + Cypress
- **Deployment**: Docker + Docker Compose

### Modular System Design

The system consists of independent modules that can be mixed and matched:

#### Core Modules
1. **POS-Core** ($12,000 ARS/month) - Basic sales terminal functionality
2. **Inventory-Lite** (+$4,000 ARS/month) - Basic product and stock management
3. **Customers-Basic** (+$3,000 ARS/month) - Customer management with "fiado" support
4. **Fiscal-Simple** (+$6,000 ARS/month) - AFIP integration for electronic invoicing
5. **Payments-Digital** (+$5,000 ARS/month) - Digital payment methods (MercadoPago, MODO, etc.)
6. **Reports-Basic** (+$2,500 ARS/month) - Basic analytics and reporting

#### Architecture Patterns
- **Base Module Pattern**: All modules extend a common BaseModule class
- **Event-Driven**: Modules communicate through event bus
- **Plugin System**: Hot-swappable modules with real-time installation/uninstallation
- **Offline-First**: Each terminal maintains local SQLite database with sync

## Development Standards and Guidelines

### Code Quality Standards
- **Maximum 200 lines per file**
- **Maximum 4 parameters per function**
- **85% test coverage minimum**
- **0 TypeScript errors**
- **0 ESLint warnings**
- **Functions must be pure when possible**
- **One responsibility per module**

### Development Team Structure
- **Tech Lead**: Architecture and technical decisions
- **Senior Frontend**: PWA development and UI components
- **Senior Backend**: APIs, sync engine, and integrations
- **Full-Stack Semi-Senior**: Complete module development
- **Junior/Semi-Senior**: Component development and testing
- **QA/Tester**: Automated testing and quality assurance

### Development Phases
1. **Week 1-2**: POS-Core MVP development
2. **Week 3**: Inventory-Lite module
3. **Week 4**: Customers-Basic module (including "fiado" system)
4. **Week 5-6**: Fiscal-Simple (AFIP integration)
5. **Week 7**: Payments-Digital module
6. **Week 8**: Reports-Basic and final testing

## Argentina-Specific Requirements

### Regulatory Compliance
- **AFIP Integration**: Electronic invoicing (Factura Electrónica)
- **ARCA Compliance**: Tax authority requirements
- **Fiscal Controllers**: Support for homologated fiscal printers

### Local Business Practices
- **"Fiado" System**: Store credit/account system for regular customers
- **Multiple Payment Methods**: Cash, cards, QR codes (MercadoPago, MODO)
- **Inflation Handling**: Automatic price updates and multi-tier pricing

### Market Segments
- **Kiosks**: Quick transactions, limited inventory
- **Almacenes**: Store credit, bulk sales, customer relationships  
- **Supermarkets**: Multi-terminal, employee management, complex inventory
- **Specialized**: Pharmacies, restaurants with sector-specific needs

## Common Development Commands

Since this is a documentation repository with no implemented code yet, typical development commands would be:

```bash
# When implementation begins, expected commands:
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run test suite
npm run lint        # Run linting
npm run typecheck   # TypeScript type checking
docker-compose up   # Start development environment
```

## Pricing Strategy

The system uses a modular pricing model:
- **Combo Kiosco**: $18,000 ARS/month (POS-Core + Inventory)
- **Combo Almacén**: $21,000 ARS/month (adds Customers + Reports)
- **Combo Profesional**: $32,000 ARS/month (full feature set)

Additional premium modules available separately for specialized needs.

## Key Files in Repository

- `pos_argentina_master_document.md` - Complete project specification
- `pos_development_master_guide.md` - Technical development guide with code examples
- `development_roadmap_modules.md` - Module-by-module development timeline
- `pos_modular_development_practical.md` - Implementation details and pricing
- `advanced_proposals_best_practices.md` - Advanced architectural patterns
- `development_team_structure.md` - Team organization and methodology

## Current Status

This repository contains **comprehensive planning and specification documents** for a POS system. The actual code implementation has not yet begun. When starting development, use these documents as the authoritative reference for:

- Technical architecture decisions
- Module specifications and APIs
- Business requirements and workflows  
- Development standards and practices
- Market-specific requirements for Argentina

## Next Steps for Implementation

1. Set up development environment and repository structure
2. Implement BaseModule system and event bus
3. Develop POS-Core module following specifications
4. Create module installation/licensing system
5. Build additional modules according to roadmap
6. Implement testing and deployment pipelines

The documentation provides detailed code examples, API specifications, and implementation guidelines for each component.