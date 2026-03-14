# RockOps Performance Optimization — Session Log

## Session Date: 2026-03-14
## Objective: Reduce API call count, add caching, fix errors, split JS bundle

---

## Changes Made

### 1. Backend: Caffeine In-Process Caching
**Files created:**
- `backend/src/main/java/com/example/backend/config/CacheConfig.java` — Caffeine cache manager with 11 named caches (5-min default TTL, max 500 entries)
- `backend/src/main/java/com/example/backend/config/CacheControlInterceptor.java` — HTTP Cache-Control headers for reference endpoints (5-min for reference data, 1-min for dashboards)
- `backend/src/main/java/com/example/backend/config/WebMvcConfig.java` — Registers the cache interceptor

**Files modified (added @Cacheable/@CacheEvict):**
- `SiteService.java` — @Cacheable("sites") on getAllSites()
- `ItemCategoryService.java` — @Cacheable("itemCategories") on getAllCategories(), getParentCategories(); @CacheEvict on add/update/delete
- `EquipmentTypeService.java` — @Cacheable("equipmentTypes") on getAllEquipmentTypes(); @CacheEvict on create/update/delete
- `MerchantService.java` — @Cacheable("merchants") on getAllMerchants()
- `PartnerService.java` — @Cacheable("partners") on getAllPartners(); @CacheEvict on save/update/delete; added @Transactional(readOnly=true)
- `DepartmentService.java` — @Cacheable("departments") on getAllDepartments(), getAllDepartmentsAsMap(); @CacheEvict on all write methods
- `JobPositionService.java` — @Cacheable("jobPositions") on getAllJobPositionDTOs()

**Dependencies added to pom.xml:**
- `spring-boot-starter-cache`
- `com.github.ben-manes.caffeine:caffeine`

### 2. Backend: Database Performance Indexes
**File created:**
- `backend/src/main/resources/db/migration/V2026031404__Add_transaction_purchaseorder_indexes.sql`
  - `idx_transaction_status ON transaction(status)`
  - `idx_purchase_order_offer_id ON purchase_order(offer_id)`

### 3. Bug Fixes — 5 API Errors on Every Page Load
**Error 1: `/api/v1/job-positions` → HTTP 500 (3 times)**
- Root cause: `LazyInitializationException` — `getAllJobPositionDTOs()` accessed lazy relationships outside a transaction
- Fix: Added `@org.springframework.transaction.annotation.Transactional(readOnly = true)` to the method
- File: `backend/.../services/hr/JobPositionService.java`

**Error 2: `/api/v1/payroll/bonuses?siteId=` → HTTP 400**
- Root cause: Frontend sent empty siteId string, backend requires valid UUID
- Fix: Added guard `if (!siteId) return { data: [] }` before API call
- File: `frontend/src/services/payroll/bonusService.js`

**Error 3: `/api/v1/vacation-balance/low-balance?year[year]=2026` → HTTP 400**
- Root cause: Frontend passed object `{year, threshold}` as single arg; service expects two separate args
- Fix: Changed from `getEmployeesWithLowBalance({year, threshold})` to `getEmployeesWithLowBalance(year, threshold)`
- File: `frontend/src/pages/HR/VacationBalance/VacationBalancePage.jsx`

### 4. Frontend: React Query (TanStack Query) for API Deduplication
**Files created:**
- `frontend/src/config/queryClient.js` — Shared QueryClient (5-min staleTime, 10-min gcTime, no refetch on focus)
- `frontend/src/hooks/queries/useSites.js`
- `frontend/src/hooks/queries/useEmployees.js`
- `frontend/src/hooks/queries/useJobPositions.js`
- `frontend/src/hooks/queries/useItemCategories.js`
- `frontend/src/hooks/queries/useMerchants.js`
- `frontend/src/hooks/queries/useEquipmentTypes.js`
- `frontend/src/hooks/queries/usePartners.js`
- `frontend/src/hooks/queries/useAdminUsers.js`
- `frontend/src/hooks/queries/index.js` — Barrel export

**Dependency added:**
- `@tanstack/react-query` (installed via npm)

**QueryClientProvider** added to App.jsx wrapping the entire component tree.

### 5. Frontend: Route-Based Code Splitting
**File modified: `frontend/src/App.jsx`**
- Converted ~95 static page imports to `React.lazy()` dynamic imports
- Kept static: Login, Sidebar, LoadingPage, layout components (HRLayout, PayrollLayout, MaintenanceLayout, SitesLayout), contexts, utilities
- Added `<Suspense fallback={<LoadingFallback />}>` around Routes

**File created:**
- `frontend/src/components/common/LoadingFallback/LoadingFallback.jsx` — Lightweight spinner with inline styles

### 6. Frontend: Vite Build Optimization
**File modified: `frontend/vite.config.js`**
- Split from 2 vendor chunks to 8 domain-specific chunks:
  - `vendor-react` (react, react-dom, react-router-dom)
  - `vendor-query` (@tanstack/react-query)
  - `vendor-i18n` (i18next ecosystem)
  - `vendor-axios` (axios)
  - `vendor-charts` (recharts ~420KB)
  - `vendor-pdf` (jspdf ~419KB)
  - `vendor-xlsx` (xlsx ~283KB)
  - `vendor-websocket` (@stomp/stompjs, sockjs-client)

---

## New Dependencies

| Package | Version | What it does | Why chosen |
|---------|---------|-------------|------------|
| `spring-boot-starter-cache` | (managed) | Spring Cache abstraction | Required for @Cacheable |
| `caffeine` | (managed) | In-process Java cache | Zero infrastructure, ~5MB overhead, perfect for single-instance Render deployment |
| `@tanstack/react-query` | latest | Client-side request deduplication and caching | Eliminates duplicate API calls, shares data across components |

## Architecture Decisions

**Caffeine over Redis:** Single backend instance on Render Starter (512MB). Caffeine is in-process (~5MB), zero cost, zero latency. Redis would need a separate $10/month service. Switch to Redis when scaling to multiple instances.

**React Query over SWR:** React Query has better devtools, mutation support, and cache management. Better fit for the existing service-layer pattern.

**Code splitting at route level:** Each page loads its own JS chunk on demand. Heavy vendor libraries (recharts 420KB, jspdf 419KB, xlsx 283KB) are isolated so they only load when needed.

---

## Verification

```bash
# Backend
cd backend && ./mvnw clean compile -DskipTests  # ✅ BUILD SUCCESS

# Frontend
cd frontend && npm run build                      # ✅ Built in 9.77s
```

## Known Issues Remaining
- The query hooks are created but components haven't been refactored yet to USE them (components still use useEffect+useState pattern). This is Phase 2 work — requires touching 30+ component files.
- Heavy vendor chunks (recharts 420KB, jspdf 419KB, xlsx 283KB) should ideally be lazy-imported within components, not just chunk-split. This is Phase 3.

## Rollback Instructions
1. Remove `@tanstack/react-query` from package.json and run `npm install`
2. Revert App.jsx to static imports (remove React.lazy, Suspense, QueryClientProvider)
3. Remove `frontend/src/hooks/queries/` directory
4. Remove `frontend/src/config/queryClient.js`
5. Remove `frontend/src/components/common/LoadingFallback/`
6. Revert vite.config.js manual chunks
7. Remove backend CacheConfig.java, CacheControlInterceptor.java, WebMvcConfig.java
8. Remove @Cacheable/@CacheEvict annotations from services
9. Remove caffeine/spring-boot-starter-cache from pom.xml
10. Delete migration V2026031404 (only if not yet applied to production DB)
