# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Run the application:**
```bash
cd src && node index.js
```

**Docker development:**
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or manual Docker build
docker build -t bitaxe-dashboard .
docker run -d --name bitaxe-dashboard -p 3000:3000/tcp -v ./src/config:/app/config bitaxe-dashboard
```

**Testing syntax:**
```bash
# Check JavaScript syntax for specific files
node --check src/index.js
node --check src/public/js/modalService.js
node --check src/backend/services/configurationManager.js
```

## Architecture Overview

### Core Architecture Pattern
This is a **pure Node.js HTTP server** (no Express.js) with a custom routing system. The application follows a **modular MVC-style architecture** with clear separation between frontend/backend and distinct service layers.

### Key Architectural Components

**1. Configuration Management System**
- `configurationManager.js` - Singleton service that enables **dynamic configuration reloading** without server restarts
- `configurationServices.js` - HTTP API endpoints for reading/updating configuration
- Configuration changes apply immediately via `configurationManager.reloadConfig()`

**2. Custom Routing System**
- `src/backend/routers/router.js` - Central HTTP request router with JWT authentication middleware
- `src/backend/routers/apiRouter.js` - API-specific sub-router for `/api/*` endpoints
- `src/backend/routers/demoApiRouter.js` - Demo mode endpoints serving mock data

**3. Modal-Based Configuration UI**
- `modalService.js` - Complex modal system with dynamic form generation
- Supports **three distinct editor types**:
  - `bitaxe_instances_table` - Dynamic add/remove device instances
  - `display_fields_editor` - Nested section/field management for dashboard display
  - Standard form fields (text, checkbox, number, textarea)

**4. Authentication & Security**
- JWT-based session management with configurable expiration
- SHA256 password hashing stored in `access.json`
- Configurable authentication disable for read-only deployments

### Data Flow Architecture

**Configuration Flow:**
1. `config.json` → `configurationManager.loadConfig()` → In-memory config object
2. Frontend configuration modal → `/api/configuration` PATCH → `configurationManager.reloadConfig()`
3. Real-time updates without server restart

**Request Flow:**
1. HTTP Request → `router.js` (auth middleware) → API sub-router → Service controller
2. All requests get fresh config via `configurationManager.getConfig()`

**Frontend Architecture:**
- **Client-side rendering** with vanilla JavaScript (no frameworks)
- `clientDashboard.js` - Main dashboard logic, device polling, UI updates
- `modalService.js` - Self-contained modal system with dynamic form generation
- Dark theme CSS with responsive design

## Critical Configuration Structure

**Dynamic Display Fields:**
```javascript
"display_fields": [
    {"Section Name": [
        {"apiFieldKey": "Human Readable Name"}
    ]}
]
```

**Device Instance Management:**
```javascript
"bitaxe_instances": [
    {"DeviceName": "http://device.ip"}
]
```

## Development Notes

**Modal System Extension:**
When adding new configuration field types, update:
1. `configFormConfig` array in `modalService.js`
2. `generateSettingsFormHtml()` switch statement
3. `handleConfigFormSubmit()` data collection logic
4. CSS styling in `modal.css`

**Authentication System:**
- Uses `subtleCrypto` for client-side SHA256 hashing (requires HTTPS in production)
- JWT tokens stored in HTTP-only cookies
- Configurable via `disable_authentication` and `disable_settings` flags

**Demo Mode:**
- Activated via `demo_mode: true` in config.json
- Overrides device URLs to point to local demo API endpoints
- Mock data served from `src/demo-apis/` JSON files

**Dynamic Configuration:**
- All configuration changes trigger `configurationManager.reloadConfig()`
- Server maintains single source of truth in memory
- No server restart required for configuration changes (port changes excepted)

## Project Structure Context

- `src/config/` - Runtime configuration files (config.json, access.json, jsonWebTokenKey.json)
- `src/backend/pages/html/` - HTML templates for dashboard and login pages
- `src/public/` - Static client-side assets (CSS, JS, images)
- `src/demo-apis/` - Mock JSON data for demo mode