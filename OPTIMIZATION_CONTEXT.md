# RockOps Performance Optimization — Session Log

## Session Date: 2026-03-14
## Objective: Reduce API call count, add caching, fix errors, split JS bundle

---

## Phase 2 Changes (2026-03-14, second session)

### Backend: Fixed Cache-Control Headers
**Problem:** Phase 1's `CacheControlInterceptor` was overwritten by Spring Security's `HeaderWriterFilter`.
**Fix:**
- Created `CacheHeaderFilter.java` (extends `OncePerRequestFilter`) — sets Cache-Control BEFORE filterChain.doFilter()
- Modified `SecurityConfiguration.java` — added `.headers(headers -> headers.cacheControl(cache -> cache.disable()))` and registered CacheHeaderFilter after HeaderWriterFilter
- Reference data endpoints now return `Cache-Control: private, max-age=300`
- Dashboard endpoints return `Cache-Control: private, max-age=60`
- All other endpoints return `no-cache, no-store, max-age=0, must-revalidate`

### Frontend: 4 New Query Hooks Created
- `useOffers(status)` — with variants `useOffersByMultipleStatuses()` and `useCompletedFinanceOffers()`
- `useItemTypes()` — cached item type fetching
- `useWarehouses()` — cached warehouse fetching
- `useDepartments()` — cached department fetching

### Frontend: 21 Components Migrated to Shared Hooks

**useSites() (5 components):**
- `AllSites.jsx` — main sites list
- `EmployeesList.jsx` — sites dropdown filter
- `AttendancePage.jsx` — sites filter
- `ProcurementMerchants.jsx` — sites filter
- `WarehousesList.jsx` — sites filter

**useEmployees() (6 components):**
- `EmployeesList.jsx` — main employee list (also uses useSites)
- `LoanManagement.jsx` — employee dropdown
- `DeductionManagement.jsx` — employee dropdown
- `BonusManagement.jsx` — employee filter
- `CreateSalaryIncreaseModal.jsx` — employee selector
- `CreateDemotionModal.jsx` — employee selector
- `EditPositionForm.jsx` — employee list

**useOffers() (1 parent component — eliminates 16 duplicate calls):**
- `ProcurementOffers.jsx` — migrated from manual fetch to 3 hook variants

**useMerchants() (1 component):**
- `ContactModal.jsx` — merchant dropdown

**useEquipmentTypes() (1 component):**
- `EquipmentItemForm.jsx` — equipment type selector

**usePartners() (1 component):**
- `Partners.jsx` — main partners list

**useDepartments() (3 components):**
- `DepartmentsList.jsx` — main departments list
- `AddPositionForm.jsx` — department dropdown
- `EditPositionForm.jsx` — department dropdown

**useJobPositions() (4 components):**
- `CreateDemotionModal.jsx` — position selector
- `CreateSalaryIncreaseModal.jsx` — position selector
- `AddPositionForm.jsx` — parent position selector
- `EditPositionForm.jsx` — parent position selector

**useItemCategories() (5 components):**
- `ParentCategoriesTable.jsx` — parent category list
- `ChildCategoriesTable.jsx` — parent dropdown
- `ItemTypeModal.jsx` — category selector
- `AddItemModal.jsx` — category + type selectors
- `WarehouseViewItemsCategoriesTable.jsx` — all categories view

**useItemTypes() (2 components):**
- `WarehouseViewItemTypesTable.jsx` — item type list
- `AddItemModal.jsx` — item type selector

### Components Skipped (too complex, 500+ lines)
EquipmentModal, MaintenanceStepModal, RequestOrderModal, CreateLogisticsModal, EmployeeOnboarding, InProgressOffers, InWarehouseItems, TransactionFormModal, and several others. These need individual analysis.

### Estimated Impact
- Offers: 16 calls → ~3 (per-status cached)
- Sites: 6 calls → 1
- Employees: 5 calls → 1
- Merchants: 4 calls → 1
- Job Positions: 4 calls → 1
- Item Types: 4 calls → 1
- Item Categories: 3 calls → 1
- **Total estimated reduction: ~45 duplicate calls eliminated**

---

## Phase 3 Changes (2026-03-15)

### Backend: Inventory-Valuation 500 Error Fixed
- **Root cause:** `LazyInitializationException` in `getSiteBalance()` — accessed `site.getWarehouses()` outside a transaction
- **Fix:** Added `@Transactional`, replaced lazy collection with `warehouseRepository.findBySiteId()`, added null checks on valuation fields

### Backend: @Transactional(readOnly=true) Added to 6 Services
- InventoryValuationService (7 methods)
- OfferFinancialReviewService (5 methods)
- AccountsPayableDashboardService (3 methods)
- PromotionRequestService (5 methods)
- DemotionRequestService (5 methods)
- SiteValuationService (1 method)

### Backend: @Cacheable Added to Statistics + Dashboard
- Salary increase stats → `statisticsCache` (2-min TTL)
- Promotion stats → `statisticsCache` (2-min TTL)
- Demotion stats → `statisticsCache` (2-min TTL)
- Finance dashboard summary → `dashboardCache` (1-min TTL)
- Finance merchant summaries → `dashboardCache` (1-min TTL)
- CacheConfig refactored to SimpleCacheManager with per-cache TTLs

### Backend: Flyway Migration V2026031405
5 new indexes: salary_increase_requests(status), offer(status), offer(finance_validation_status), promotion_requests(status), demotion_requests(status)

### Frontend: 14 More Components Migrated + 1 New Hook

**New hook:** `useInventoryValuations()` — wraps inventoryValuationService.getAllSiteValuations()

**Migrated:**
- useJobPositions: VacancyList, PositionsList, EmployeesList, EmployeeOnboarding (4)
- useAdminUsers: AdminPage (1)
- useItemTypes: PendingTransactionsTable, InProgressOffers, RequestOrderModal, MaintenanceTransactionModal, WarehouseDashboard, InWarehouseItems (6)
- useMerchants: Step2PurchasingForm (1)
- useInventoryValuations: InventoryValuation, AssetValuesView (2)

### Phase 3 Totals
- Components migrated this phase: 14
- Total components migrated across all phases: 36
- Backend services optimized: 6 (new @Transactional)
- Backend caching added: 5 endpoints (statistics + dashboard)
- Errors fixed: inventory-valuation 500 (all original errors now resolved)
- New database indexes: 5

### Remaining (Phase 4 candidates)
- EquipmentModal.jsx (2139 lines) — bundled fetchFormData with 5 sequential fetches
- MaintenanceStepModal.jsx (1334 lines) — complex multi-service
- CreateLogisticsModal.jsx (1117 lines) — complex multi-service
- Components using different service methods (getAllTypes vs getAll, procurementService.getAllMerchants vs merchantService.getAll)

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
