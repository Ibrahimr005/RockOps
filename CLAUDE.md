# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RockOps is a mining site management system built with Spring Boot (backend) and React + Vite (frontend). It manages equipment, HR, procurement, warehouse operations, finance, payroll, maintenance, and secretary/task workflows across multiple mining sites with real-time notifications via WebSocket.

**The app is partially launched** — real users are testing it in production. The production branch deploys to live users. The main branch is the development/staging branch with new features ahead of production.

## Tech Stack

**Backend:** Java 21, Spring Boot 3.4.5, PostgreSQL 17, Spring Data JPA, Hibernate 6.6, Flyway migrations, Caffeine in-process cache, JWT authentication (jjwt 0.12.5)

**Frontend:** React 19.1, Vite 6.3, Sass (SCSS), React Router v7, TanStack React Query v5, i18next (English + Arabic with RTL), Axios

**Storage:** MinIO (local development) / AWS S3 (staging + production)

**Real-time:** WebSocket + STOMP.js + SockJS

**Deployment:**
- Frontend: Vercel (auto-deploy on push)
- Backend: Render (Docker, Frankfurt region, Starter tier 512MB)
- Database: PostgreSQL 16 on Render (Frankfurt region)
- No CI/CD pipeline — auto-deploy on push to respective branches

**Branches:**
- `main` → staging (oretech-test-backend on Render, staging-oretech on Vercel)
- `production` → production (oretech-backend on Render, oretech on Vercel)
- Main is ahead of production with new features

**Team:** 4-6 developers, no formal Git workflow yet (no PR process). One developer is working on setting up test gates.

## Development Commands

### Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run              # Run server (port 8080)
./mvnw clean install                # Clean build
./mvnw test                         # Run tests
./mvnw clean package -DskipTests    # Build without tests
./mvnw clean compile -DskipTests    # Compile check (fast verification)

# Windows:
cd backend
.\mvnw.cmd spring-boot:run
```

### Frontend (React + Vite)

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Docker Compose

```bash
docker-compose up         # Start backend, PostgreSQL, MinIO
docker-compose up -d      # Detached mode
docker-compose down       # Stop
docker-compose up --build # Rebuild and start
```

### Local Database
- URL: `jdbc:postgresql://localhost:5432/rockOpsDB`
- Credentials: `postgres` / `1234`
- Flyway runs migrations automatically on startup

## Architecture

### Backend

```
Entity (JPA) → Repository → Service (business logic) → Controller (REST) → DTO
```

**94 controllers, 121 services, 187 entities, 116 repositories, 283 DTOs** organized by domain: equipment, finance, hr, procurement, warehouse, payroll, notification, maintenance, merchant, site, secretary, contact.

**Key patterns:**
- Multi-site data isolation — all entities are site-specific, access validated per site
- DTOs in two directories: `dto/` (252 files, primary) and `dtos/` (31 files, equipment only) — both valid
- Custom ID generation via `EntityIdSequence`
- Event-driven: `EquipmentTypeEventListener` for cascading updates

### Frontend

```
API Config (api.config.js) → Service Layer (services/) → React Query Hooks (hooks/queries/) → Components/Pages
```

**Critical: The data-fetching pattern has two layers:**

1. **Service layer** (`frontend/src/services/`, 73+ files) — Axios calls using centralized `apiClient.js` with JWT auto-injection. All endpoints defined in `frontend/src/config/api.config.js` (1280 lines).

2. **React Query hooks** (`frontend/src/hooks/queries/`, 13 hooks) — Shared cached wrappers around service calls. These deduplicate requests — when multiple components call `useSites()`, only ONE network request fires.

**When fetching reference data (sites, employees, categories, etc.), ALWAYS use the existing hooks from `hooks/queries/`.** Do NOT write new `useEffect` + `useState` fetching patterns for data that already has a hook.

### Available React Query Hooks

| Hook | Query Key | Stale Time | Service |
|------|-----------|------------|---------|
| `useSites()` | `['sites']` | 5 min | siteService.getAll() |
| `useEmployees()` | `['employees']` | 2 min | employeeService.getAll() |
| `useJobPositions()` | `['jobPositions']` | 5 min | jobPositionService.getAll() |
| `useMerchants()` | `['merchants']` | 5 min | merchantService.getAll() |
| `useEquipmentTypes()` | `['equipmentTypes']` | 5 min | equipmentTypeService.getAllEquipmentTypes() |
| `usePartners()` | `['partners']` | 5 min | partnerService.getAll() |
| `useAdminUsers()` | `['adminUsers']` | 2 min | adminService.getUsers() |
| `useItemTypes()` | `['itemTypes']` | 5 min | itemTypeService.getAll() |
| `useWarehouses()` | `['warehouses']` | 5 min | warehouseService.getAll() |
| `useDepartments()` | `['departments']` | 5 min | departmentService.getAll() |
| `useOffers(status)` | `['offers', status]` | 2 min | offerService methods |
| `useItemCategories()` | `['itemCategories']` | 5 min | itemCategoryService |
| `useInventoryValuations()` | `['inventoryValuations']` | 2 min | inventoryValuationService |

**Usage pattern:**
```jsx
import { useSites } from '../../hooks/queries';

const MyComponent = () => {
  const { data: sites = [], isLoading, isError } = useSites();
  if (isLoading) return <LoadingSpinner />;
  // use sites...
};
```

### Backend Caching (Caffeine)

Reference data services use `@Cacheable` to avoid repeated database queries. Cache is in-process (no Redis needed for single-instance deployment).

| Cache | TTL | Services |
|-------|-----|----------|
| sites, departments, itemCategories, equipmentTypes, measuringUnits, workTypes, paymentTypes, merchants, partners, jobPositions, employees | 5 min | Various reference data services |
| statisticsCache | 2 min | Salary increase, promotion, demotion statistics |
| dashboardCache | 1 min | Finance dashboard summary + merchant summaries |

**When adding write methods (create/update/delete) for cached data, add `@CacheEvict(value = "cacheName", allEntries = true)` to keep cache fresh.**

### HTTP Cache Headers

`CacheHeaderFilter.java` sets `Cache-Control` headers:
- Reference data endpoints → `private, max-age=300` (5 min)
- Dashboard endpoints → `private, max-age=60` (1 min)
- All other endpoints → `no-cache, no-store`

### Code Splitting

All 106 page routes use `React.lazy()` for on-demand loading. Heavy vendor libraries (recharts 420KB, jspdf 419KB, xlsx 283KB) are split into separate chunks via Vite config.

## State Management

6 React Contexts (no Redux/Zustand):

| Context | Purpose | Key Methods |
|---------|---------|-------------|
| AuthContext | JWT auth, user profile, session | `login()`, `logout()`, `hasRole()`, `hasAnyRole()` |
| SnackbarContext | Toast notifications | `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`, `showConfirmation()` |
| NotificationContext | WebSocket notifications | `showToast()`, `refreshUnreadCount()` |
| ThemeContext | Light/dark theme | `toggleTheme()` |
| LanguageContext | i18n language switching | `switchLanguage()`, RTL support |
| JobPositionContext | Job positions CRUD | `getAllJobPositions()`, `createJobPosition()` |

## Authentication & Authorization

- **Backend:** JWT tokens via `authentication/` package. `@PreAuthorize("hasRole('ROLE_NAME')")` on controllers (187 annotations across the codebase).
- **Frontend:** `AuthContext.jsx` manages auth state. `RoleRoute` component for route protection. `rbac.js` for granular permission checks.
- **14 Roles:** ADMIN, USER, SITE_ADMIN, PROCUREMENT, WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, SECRETARY, EQUIPMENT_MANAGER, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER, FINANCE_EMPLOYEE, MAINTENANCE_MANAGER, MAINTENANCE_EMPLOYEE

## User Feedback Patterns

**For notifications/toasts:** Use `SnackbarContext` — `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`

**For confirmations before destructive actions:** Use the `ConfirmationDialog` component from `components/common/` — it supports 6 type variants with icons and optional text input.

**NEVER show raw `err.message` to users.** Transform technical errors to user-friendly messages.

## Styling

- **Approach:** Sass (SCSS) files + CSS custom properties (100+ variables in `:root` and `[data-theme="dark"]`)
- **Location:** `frontend/src/styles/` (11 files: theme-variables.css, primary-button.scss, modal-styles.scss, status-badges.scss, form-validation.scss, tabs.scss, etc.)
- **Naming:** kebab-case with BEM-like patterns: `{page}-{component}-{purpose}`
- **Rule:** ALWAYS check existing styles in `frontend/src/styles/` before creating new CSS. Reuse existing patterns.
- **Themes:** Light and dark mode via `ThemeContext` + CSS custom properties

## Internationalization

- **Config:** `frontend/src/i18n.jsx` (949 lines)
- **Languages:** English (en) and Arabic (ar) with automatic RTL support
- **300+ translation keys** organized by domain (common, auth, admin, roles, site, equipment, warehouse, etc.)
- Components use `useTranslation()` hook from react-i18next

## Database Schema Management

- **Tool:** Flyway (auto-runs on startup)
- **Location:** `backend/src/main/resources/db/migration/` (112 migrations)
- **Latest version:** V2026031405
- **Naming:** `V{version}__{description}.sql`
- **DDL-auto:** `update` on local/staging (JPA auto-creates tables), `validate` on production (Flyway only)
- **Rule:** ALWAYS create a Flyway migration for schema changes. Do NOT rely on JPA `ddl-auto=update` for production.

## File Storage

- **Local:** MinIO at `http://localhost:9000`
- **Staging/Production:** AWS S3
- **Config:** `storage.type` property controls backend (minio/s3)
- **Max file size:** 10MB

## WebSocket

- **Backend:** `WebSocketConfig.java` — SockJS endpoint at `/ws`
- **Frontend:** STOMP.js client via `NotificationContext`
- **Topics:** `/user/queue/notifications` (personal), `/topic/notifications` (broadcast)

## Reusable Components (components/common/)

52 shared components including:
- **BaseModal** — accessible modal with ESC key + scroll lock
- **ConfirmationDialog** — confirmation prompts with 6 variants
- **DataTable** — sorting, filtering, pagination, Excel export
- **LoadingSpinner** — size variants for inline loading
- **LoadingPage** — full-page loading with logo
- **LoadingFallback** — lightweight Suspense fallback
- **PageHeader / SubPageHeader** — consistent page headers
- **Button** — multiple variants
- **Tabs** — tabbed navigation
- **StatisticsCards** — dashboard metric cards
- **EmptyState** — empty data placeholder
- **ContentLoader** — skeleton loading
- **Sidebar** — role-based navigation menu

## Multi-Developer Safety Rules

1. **Never modify shared component interfaces** — create new components or wrappers
2. **Never change service method signatures** — add new methods instead
3. **Maintain backward compatibility** — old code must still work
4. **Task isolation** — only modify files relevant to your domain (equipment work shouldn't touch HR files)
5. **Use existing hooks for data fetching** — check `hooks/queries/` before writing new `useEffect` patterns
6. **Use existing styles** — check `frontend/src/styles/` before creating new CSS
7. **Use ConfirmationDialog for confirmations** — not Snackbar
8. **Use SnackbarContext for notifications** — `showSuccess()`, `showError()`, etc.
9. **Never hardcode API URLs** — use `api.config.js` and the service layer
10. **Add `@CacheEvict` when writing to cached data** — or the cache goes stale

## When Adding New Features

### Backend
1. Entity in `models/` → Repository in `repositories/` → Service in `services/` → Controller in `controllers/` → DTO in `dto/`
2. Add `@Transactional(readOnly = true)` on read-only service methods (use `org.springframework.transaction.annotation.Transactional`)
3. Consider `@Cacheable` for reference data that rarely changes
4. Add `@PreAuthorize` for role-based access
5. Create Flyway migration for schema changes (never rely on ddl-auto)
6. Use `@Slf4j` for logging — never `System.out.println`

### Frontend
1. Add endpoint to `frontend/src/config/api.config.js`
2. Create/update service in `frontend/src/services/`
3. If fetching reference data, create a React Query hook in `hooks/queries/`
4. Create page/component using existing styles and common components
5. Use `React.lazy()` for new page routes in `App.jsx`
6. Handle errors with SnackbarContext — never show raw errors
7. Support both English and Arabic translations

## Important File Locations

### Backend
- Main: `backend/src/main/java/com/example/backend/BackendApplication.java`
- Config: `backend/.../config/` (SecurityConfiguration, CacheConfig, CacheHeaderFilter, WebSocketConfig, S3Config, etc.)
- Properties: `backend/src/main/resources/application.properties` (+ -prod, -staging, -dev, -docker, -aws variants)
- Migrations: `backend/src/main/resources/db/migration/`
- Controllers: `backend/.../controllers/` (94 files, 12 subdirectories)
- Services: `backend/.../services/` (121 files, 14 subdirectories)

### Frontend
- Entry: `frontend/src/main.jsx`
- App + Routes: `frontend/src/App.jsx`
- API Config: `frontend/src/config/api.config.js`
- Query Client: `frontend/src/config/queryClient.js`
- Query Hooks: `frontend/src/hooks/queries/`
- Services: `frontend/src/services/` (73+ files, 10 subdirectories)
- Contexts: `frontend/src/contexts/` (6 files)
- Common Components: `frontend/src/components/common/` (52 files)
- Styles: `frontend/src/styles/` (11 files)
- Roles/RBAC: `frontend/src/utils/roles.js`, `frontend/src/utils/rbac.js`
- i18n: `frontend/src/i18n.jsx`
- Optimization Log: `OPTIMIZATION_CONTEXT.md` (root)

## What NOT to Do

- DON'T write `useEffect` + `useState` for data that has a React Query hook — use the hook
- DON'T hardcode API URLs — use `api.config.js` and the service layer
- DON'T use `System.out.println` — use `@Slf4j`
- DON'T create inline styles — use `styles/` folder
- DON'T modify shared component interfaces without team discussion
- DON'T show raw server errors to users — use SnackbarContext with friendly messages
- DON'T use `jakarta.transaction.Transactional` — use `org.springframework.transaction.annotation.Transactional`
- DON'T modify files outside your current task domain
- DON'T skip `@CacheEvict` on write methods for cached entities
- DON'T add new pages without `React.lazy()` in App.jsx
- DON'T use Snackbar for confirmation dialogs — use ConfirmationDialog component
- DON'T forget RTL support when adding new UI — the app supports Arabic

## Known Technical Debt

- 257 instances of raw `err.message` shown to users across 118 files
- 56 backend files with `System.out.println` instead of proper logging
- 35 `console.log` statements in frontend production code
- `JobPositionContext.jsx` uses raw `fetch()` bypassing the centralized apiClient
- Dual DTO directories (`dto/` and `dtos/`) with inconsistent naming
- No CI/CD pipeline (auto-deploy only, no test gates yet)
- Several commented-out files and 28 TODO/FIXME comments
