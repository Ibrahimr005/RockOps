read# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RockOps is a comprehensive mining site management system built with Spring Boot (backend) and React + Vite (frontend). The system manages equipment, HR, procurement, warehouse operations, finance, and maintenance workflows across multiple mining sites with real-time notifications via WebSocket.

**Tech Stack:**
- **Backend:** Java 21, Spring Boot 3.4.5, PostgreSQL, Spring Data JPA, Flyway migrations
- **Frontend:** React 19.1.0, Vite 6.3.5, Sass, React Router v7
- **Storage:** MinIO (local) / Cloudflare R2 (production)
- **Authentication:** JWT with role-based access control (13 roles)
- **Real-time:** WebSocket + STOMP.js
- **Database:** PostgreSQL with Flyway automatic migrations

## Development Commands

### Backend (Spring Boot)

```bash
# Run the backend server
cd backend
./mvnw spring-boot:run

# Clean build
./mvnw clean install

# Run tests
./mvnw test

# Build without tests
./mvnw clean package -DskipTests

# On Windows WSL, use:
cd backend
powershell -Command "./mvnw.cmd spring-boot:run"
```

### Frontend (React + Vite)

```bash
# Install dependencies
cd frontend
npm install

# Run development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Docker Compose

```bash
# Start all services (backend, PostgreSQL, MinIO)
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

### Database

- **Local PostgreSQL:** `jdbc:postgresql://localhost:5432/rockOpsDB`
- **Credentials:** postgres/1234
- **Migrations:** Flyway handles all schema changes automatically from `backend/src/main/resources/db/migration`
- **JPA DDL:** Set to `none` - Flyway manages all schema changes

## High-Level Architecture

### Backend Architecture

**Layered Structure:**
```
Entity (JPA) → Repository (Data Access) → Service (Business Logic) → Controller (REST API) → DTO (Data Transfer)
```

**Key Architectural Patterns:**

1. **Multi-Site Data Isolation:** All entities are site-specific. Users are assigned to specific sites, and data access is validated per site in all operations.

2. **Domain Organization:** Services and controllers are organized by business domain:
   - `equipment/` - Equipment tracking, consumables, maintenance
   - `finance/` - Accounts payable, general ledger, fixed assets, balances
   - `hr/` - Employee management, attendance, leave, promotions
   - `procurement/` - Request orders, offers, purchase orders, deliveries
   - `warehouse/` - Inventory, items, transactions
   - `payroll/` - Payroll processing, attendance integration
   - `notification/` - Real-time WebSocket notifications

3. **DTO Pattern:** Two DTO locations (`dto/` and `dtos/`) - both are valid. DTOs separate internal entity representations from API contracts.

4. **Event-Driven Components:** Equipment type changes trigger events handled by `EquipmentTypeEventListener` for cascading updates.

5. **Custom ID Generation:** Entity IDs use custom sequences via `EntityIdSequence` for human-readable identifiers.

### Frontend Architecture

**Service-Component Pattern:**
```
API Config → Service Layer → Components/Pages → React Context (State)
```

**Critical Frontend Rules:**

1. **Centralized API Configuration:** All API endpoints are defined in `frontend/src/config/api.config.js`. NEVER hard-code fetch/axios calls.

2. **Service Layer Pattern:** All backend communication goes through service classes in `frontend/src/services/`. Services are organized by domain (hr/, procurement/, transaction/, etc.).

3. **Component Organization:**
   - `common/` - Shared reusable components
   - `equipment/`, `procurement/`, etc. - Domain-specific components
   - Components use unique, descriptive class names: `{pageName}-{componentType}-{purpose}`

4. **Styling System:** All styles centralized in `frontend/src/styles/`:
   - `primary-button.scss` - Button styles
   - `modal-styles.scss` - Modal components
   - `status-badges.scss` - Status indicators
   - `theme-variables.css` - CSS custom properties
   - Follow existing Sass patterns, use kebab-case naming

5. **State Management via Contexts:**
   - `AuthContext.jsx` - Authentication and user state
   - `SnackbarContext.jsx` - User notifications and feedback
   - `ThemeContext.jsx` - UI theme
   - `LanguageContext.jsx` - i18next language switching
   - `JobPositionContext.jsx` - Job position management

### Authentication & Authorization

- **Backend:** JWT tokens generated in `backend/src/main/java/com/example/backend/authentication/`
- **Frontend:** `AuthContext.jsx` manages authentication state
- **Roles:** Defined in `frontend/src/utils/roles.js` (13 roles including ADMIN, SITE_ADMIN, EQUIPMENT_MANAGER, HR_MANAGER, etc.)
- **RBAC:** Use `@PreAuthorize("hasRole('ROLE_NAME')")` on backend endpoints
- **Frontend Protection:** Check user roles via `rbac.js` utilities before rendering components

### WebSocket Integration

- **Backend Config:** `backend/src/main/java/com/example/backend/config/notification/WebSocketConfig.java`
- **Frontend:** Use STOMP.js client for connections
- **Topics:**
  - `/user/queue/notifications` - Personal notifications
  - `/topic/notifications` - Broadcast notifications
- **Notification Context:** `frontend/src/contexts/SnackbarContext.jsx` handles display
- **Connection Management:** Implement reconnection logic and handle connection errors gracefully

### Error Handling Pattern

**Backend:**
- Custom exceptions in `backend/src/main/java/com/example/backend/exceptions/`
- Throw meaningful exceptions for business logic violations
- Return specific error responses with HTTP status codes

**Frontend:**
- ALL user feedback goes through `SnackbarContext`
- Methods: `showError()`, `showSuccess()`, `showInfo()`, `showWarning()`
- NEVER show raw server errors (500, 400) to users
- Transform technical errors to user-friendly messages
- Example: "Serial number must be unique" instead of "UNIQUE_CONSTRAINT_VIOLATION"

### Multi-Developer Safety Rules

These rules prevent breaking changes in a multi-developer environment:

1. **Never Modify Shared Component Interfaces:** Create new components or wrappers instead
2. **Never Change Service Method Signatures:** Add new methods rather than modifying existing ones
3. **Maintain Backward Compatibility:** Old code must continue working after changes
4. **Task Isolation:** Only modify files relevant to the current domain
   - Working on equipment? Don't touch hr/, warehouse/, or finance/ files
   - Working on procurement? Don't modify payroll/ or merchant/ files
5. **Create, Don't Modify:** When extending functionality, create new implementations

### Frontend-Backend Integration

**Integration Pattern:**
1. Backend changes (Entity → Repository → Service → Controller → DTO)
2. Update frontend service in `services/` to match new API
3. Update frontend components using the changed service
4. Ensure error handling covers new scenarios
5. Test end-to-end integration

**Synchronization Checklist:**
- API endpoints match between frontend services and backend controllers
- Data structures (DTOs) consistent between frontend and backend
- Validation rules synchronized (frontend validation matches backend)
- Error responses properly handled in frontend
- Loading states implemented for async operations

## Database Schema Management

- **Migration Tool:** Flyway (automatic on application startup)
- **Migration Location:** `backend/src/main/resources/db/migration`
- **Naming Convention:** `V{version}__{description}.sql` (e.g., `V1__initial_schema.sql`)
- **Schema Changes:** ALWAYS create a new Flyway migration, never modify entities expecting JPA to update schema
- **Baseline Version:** 99 (configured in `application.properties`)

## File Storage

- **Local Development:** MinIO at `http://localhost:9000`
- **Production:** Cloudflare R2 (S3-compatible)
- **Configuration:** `backend/src/main/java/com/example/backend/config/S3Config.java` (replacing MinioConfig)
- **Max File Size:** 10MB (configurable in `application.properties`)
- **Storage Type:** Controlled via `storage.type` property (minio/s3)

## Business Logic Patterns

### Equipment Management
- Status flow: AVAILABLE → IN_MAINTENANCE → AVAILABLE
- Equipment operations are site-specific
- Track location and assignment history
- Driver assignment must be compatible with equipment type

### Maintenance Workflow
1. Create MaintenanceRecord with validation
2. Add MaintenanceSteps with assigned technicians
3. Update equipment status during maintenance
4. Complete maintenance and return equipment to service
5. Send real-time notifications for status changes

### Direct Purchase Workflow
4-step workflow tracked in `DirectPurchaseTicket`:
1. Creation - Define items and requirements
2. Purchasing - Select merchant and finalize purchase
3. Transporting - Track delivery
4. Completion - Final verification

### Procurement Workflow
RequestOrder → Offer (with finance review) → PurchaseOrder → Delivery → Warehouse Receipt

## Code Quality Standards

### Backend (Java)
- Use Spring annotations correctly (`@Service`, `@Controller`, `@Entity`, `@Repository`)
- Implement proper exception handling using custom exceptions
- Use dependency injection, not static methods
- Follow REST conventions (GET, POST, PUT, DELETE)
- Validate input using Bean Validation annotations (`@NotNull`, `@NotBlank`, etc.)
- Write tests for business-critical functionality in `backend/src/test/`

### Frontend (React)
- Use React 19 features (automatic batching, concurrent features)
- Implement comprehensive error handling for all API calls
- Use `SnackbarContext` for ALL user feedback
- Show loading states during async operations
- Use React Router v7 for navigation
- Leverage existing Sass styles before creating new ones
- Use React hooks appropriately (useState, useEffect, useContext, useMemo)
- Handle WebSocket connection states gracefully

## Important File Locations

### Backend
- **Main Application:** `backend/src/main/java/com/example/backend/BackendApplication.java`
- **Configuration:** `backend/src/main/java/com/example/backend/config/`
- **Database Config:** `backend/src/main/resources/application.properties`
- **Flyway Migrations:** `backend/src/main/resources/db/migration/`
- **Controllers:** `backend/src/main/java/com/example/backend/controllers/`
- **Services:** `backend/src/main/java/com/example/backend/services/`
- **Models/Entities:** `backend/src/main/java/com/example/backend/models/`
- **Repositories:** `backend/src/main/java/com/example/backend/repositories/`
- **DTOs:** `backend/src/main/java/com/example/backend/dto/` and `dtos/`

### Frontend
- **API Configuration:** `frontend/src/config/api.config.js`
- **Services:** `frontend/src/services/`
- **Components:** `frontend/src/components/`
- **Pages:** `frontend/src/pages/`
- **Styles:** `frontend/src/styles/`
- **Contexts:** `frontend/src/contexts/`
- **Utilities:** `frontend/src/utils/`
- **Entry Point:** `frontend/src/main.jsx`
- **App Component:** `frontend/src/App.jsx`

## Development Workflow Best Practices

### When Adding New Features

1. **Backend First:**
   - Create/update Entity in `models/`
   - Create/update Repository in `repositories/`
   - Implement Service in `services/` with business logic
   - Create Controller in `controllers/` with REST endpoints
   - Create DTOs in `dto/` or `dtos/`
   - Write tests in `backend/src/test/`

2. **Frontend Second:**
   - Add endpoints to `frontend/src/config/api.config.js`
   - Create/update service in `frontend/src/services/`
   - Create/update components in `frontend/src/components/`
   - Create/update pages in `frontend/src/pages/`
   - Use existing styles or create new Sass files in `frontend/src/styles/`
   - Implement error handling with SnackbarContext

3. **Testing Integration:**
   - Test API endpoints with Postman or similar
   - Test frontend-backend integration end-to-end
   - Verify error scenarios are handled gracefully

### When Modifying Existing Features

1. Read the existing code first - NEVER propose changes without understanding current implementation
2. Check if changes affect shared components or services
3. If modifying shared code, create new wrapper/version instead
4. Maintain backward compatibility
5. Update both frontend and backend atomically
6. Test that existing functionality still works

## Critical Rules from .cursorrules

1. **API Integration:** NEVER hard-code fetch requests. ALWAYS use centralized API config and service classes.

2. **Styling Consistency:** ALWAYS use existing styles from `frontend/src/styles/`. Check before creating new CSS.

3. **Component Reusability:** Create components in `frontend/src/components/` for reusable functionality. Organize by domain.

4. **Team Safety:** NEVER modify existing shared component interfaces without team approval. Create wrappers instead.

5. **Task Isolation:** Only modify files relevant to current task domain. Equipment work shouldn't touch warehouse files.

6. **Error Handling:** ALWAYS handle errors gracefully. Use SnackbarContext for user feedback. Translate technical errors to user-friendly messages.

7. **Frontend Element Identification:** Use unique, descriptive class names following pattern: `{pageName}-{componentType}-{purpose}`

8. **Testing:** Backend changes require tests in `backend/src/test/`

9. **Frontend-Backend Sync:** When backend APIs change, update corresponding frontend services and components. Never leave them out of sync.

10. **Multi-Site Architecture:** ALL entities must be site-specific. Validate site access in all operations.

## What NOT to Do

- DON'T hard-code API URLs (use api.config.js)
- DON'T create inline styles (use styles/ folder)
- DON'T modify shared component interfaces without team approval
- DON'T skip input validation on API endpoints
- DON'T show raw server errors to users
- DON'T modify files outside current task domain
- DON'T forget to provide user feedback via SnackbarContext
- DON'T use generic class names without context
- DON'T skip testing for backend changes
- DON'T ignore site-specific data isolation

## Environment Configuration

### Local Development
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432/rockOpsDB`
- MinIO: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

### Environment Variables
See `backend/src/main/resources/application.properties` for full configuration.

Key properties:
- `spring.datasource.url` - Database connection
- `aws.s3.bucket-name` - S3/MinIO bucket
- `storage.type` - Storage backend (minio/s3)
- `spring.flyway.enabled` - Enable/disable migrations

### Production Configuration
Use `application-prod.properties` for production-specific settings. Environment variables can override properties in Docker deployments.
