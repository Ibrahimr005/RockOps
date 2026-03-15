# RockOps (Oretech) — Optimization & Security Fixes
## Session Report — 2026-03-14

---

## Executive Summary

A 5-agent hierarchical-mesh swarm audited the entire RockOps codebase across backend services, REST controllers, frontend services, infrastructure config, and production-vs-main divergence. The audit found **100+ issues** across performance, security, configuration, and code quality. This session applied **16 fixes** addressing the most critical findings.

---

## Fixes Applied

### FIX 1 — Flyway Deploy Blocker (CRITICAL)
**Problem:** `flyway.baseline-version=2026999999` caused Flyway to skip ALL 107 migrations. New feature tables would never be created on production.
**Fix:** Changed to `baseline-version=0` in `application.properties` and `application-prod.properties`. Added `out-of-order=true` to prod.
**Files:** `application.properties`, `application-prod.properties`
**Status:** DONE

### FIX 2 — HikariCP + Dockerfile + Cold Start Prevention (CRITICAL)
**Problem:** Missing connection pool keepalive settings caused intermittent 500 errors (Render proxy drops idle connections). JVM heap too tight (180MB). No cold start prevention.
**Fix:**
- Added 6 HikariCP settings (keepalive-time, max-lifetime, leak-detection, etc.)
- Updated Dockerfile JVM flags (Xmx220m, TieredStopAtLevel=1 for faster startup, ExitOnOutOfMemoryError)
- Created KeepAliveScheduler.java — pings /actuator/health every 10 min to prevent Render free tier spin-down
**Files:** `application-prod.properties`, `backend/Dockerfile`, `Dockerfile`, `KeepAliveScheduler.java` (new)
**Status:** DONE

### FIX 3 — Dashboard 30+ Queries Per Page Load (HIGH)
**Problem:** DashboardService fired ~35 individual `SELECT COUNT(*)` queries per dashboard load.
**Fix:** Added `countGroupByStatus()` GROUP BY queries to 4 repositories. Rewrote DashboardService to use grouped results. Added `@Transactional(readOnly=true)` to all methods.
**Files:** `DashboardService.java`, `EquipmentRepository.java`, `ItemRepository.java`, `MaintenanceRecordRepository.java`, `TransactionRepository.java`
**Impact:** ~35 queries → ~10 queries per admin dashboard load
**Status:** DONE

### FIX 4A — Attendance N+1 (CRITICAL)
**Problem:** `generateMonthlyAttendanceSheet` fired 1 SELECT per employee + 1 INSERT per missing day. 100 employees × 30 days = ~3,100 queries.
**Fix:** Bulk fetch all attendance with `findByEmployeeIdInAndDateBetween()` (1 query) + batch `saveAll()` (1 query).
**Files:** `AttendanceService.java`
**Impact:** ~3,100 queries → 2 queries
**Status:** DONE

### FIX 4B — PurchaseOrder Full Table Scan (CRITICAL)
**Problem:** `getPurchaseOrderByOffer` called `findAll()` loading entire PO table into memory, then filtered in Java.
**Fix:** Added `findByOfferId()` to PurchaseOrderRepository.
**Files:** `PurchaseOrderRepository.java`, `PurchaseOrderService.java`
**Impact:** Full table load → single indexed lookup
**Status:** DONE

### FIX 4C — Merchant N+1 Queries (HIGH)
**Problem:** `getMerchantTransactions()` fired N queries in a loop. `getMerchantsByType()` loaded ALL merchants then filtered in Java.
**Fix:** Added `findByPurchaseOrderItemMerchantId()` and `findByMerchantType()` repository queries.
**Files:** `DeliveryItemReceiptRepository.java`, `MerchantRepository.java`, `MerchantService.java`
**Impact:** N+1 → 1 query each
**Status:** DONE

### FIX 5A — AdminController Defense-in-Depth (MEDIUM)
**Problem:** AdminController had no `@PreAuthorize` annotation. URL-based security existed in SecurityFilterChain but no method-level defense.
**Fix:** Added `@PreAuthorize("hasRole('ADMIN')")` to AdminController. Added `@EnableMethodSecurity` to SecurityConfiguration.
**Files:** `AdminController.java`, `SecurityConfiguration.java`
**Status:** DONE

### FIX 5B — UserController Exposing Raw Entities (HIGH)
**Problem:** `GET /api/v1/users` returned raw `User` entities including password hashes.
**Fix:** Changed to return `UserDTO` (id, username, firstName, lastName, role, enabled — no password). Verified frontend only needs these fields.
**Files:** `UserController.java`, `UserService.java`
**Status:** DONE

### FIX 5C — Auth Token Logged to Console (CRITICAL)
**Problem:** `console.log("token:" + token)` in ProcurementOffers.jsx exposed JWT to browser DevTools.
**Fix:** Removed the console.log line.
**Files:** `ProcurementOffers.jsx`
**Status:** DONE

### FIX 5D — Dead Code + Broken Navigation (MEDIUM)
**Problem:** ProcurementRequestOrderDetails navigated to old broken PurchaseOrderDetails page. Two files had dead axios imports + unused axiosInstance with stale tokens.
**Fix:** Fixed navigation to point to working PurchaseOrderDetailsPage. Removed dead axios code from MaintenanceTransactionModal and EquipmentDashboard.
**Files:** `ProcurementRequestOrderDetails.jsx`, `MaintenanceTransactionModal.jsx`, `EquipmentDashboard.jsx`
**Status:** DONE

### FIX 6A — CORS Configuration (VERIFIED)
**Problem:** Agent flagged potential CORS mismatch between old and new domain names.
**Finding:** Already correctly configured. Both REST and WebSocket CORS read from `cors.allowed.origins` property which resolves per profile.
**Status:** NO CHANGE NEEDED

### FIX 6B — WebSocket Origins (VERIFIED)
**Problem:** Agent flagged removal of `/ws-native` endpoint and origin changes.
**Finding:** `/ws-native` removal was intentional (frontend uses SockJS via `/ws`). Origins dynamically loaded from properties — correct.
**Status:** NO CHANGE NEEDED

### FIX 6C — NotificationController Admin Check (HIGH)
**Problem:** Any authenticated user could send notifications to any user or broadcast to all users. Code had TODO comment "you might want to add admin role check here."
**Fix:** Added `@PreAuthorize("hasRole('ADMIN')")` to `sendNotification` and `broadcastNotification` methods.
**Files:** `NotificationController.java`
**Status:** DONE

### FIX 6D — brandService.js Broken Import (MEDIUM)
**Problem:** `brandService.js` imported non-existent `BRAND_ENDPOINTS`. Would crash if anyone used it.
**Fix:** Changed to use existing `EQUIPMENT_ENDPOINTS.BRANDS` and `EQUIPMENT_ENDPOINTS.BRAND_BY_ID`.
**Files:** `brandService.js`
**Status:** DONE

### BONUS — Staging Profile + Render Config (HIGH)
**Problem:** Both test and production used the same `prod` profile. No way to have different behavior (ddl-auto, logging, etc.).
**Fix:** Created `application-staging.properties` with `ddl-auto=update`, verbose logging, and staging-specific defaults. Updated KeepAliveScheduler to activate on both `prod` and `staging` profiles. Provided step-by-step Render env var instructions.
**Files:** `application-staging.properties` (new), `KeepAliveScheduler.java`
**Status:** DONE (Render env var changes pending user action)

---

## Files Modified (22)

### Backend (19 files)
| File | Change Type |
|------|-------------|
| `application.properties` | Modified — Flyway baseline |
| `application-prod.properties` | Modified — Flyway, HikariCP, logging, health endpoint |
| `application-staging.properties` | **NEW** — Staging profile |
| `backend/Dockerfile` | Modified — JVM flags |
| `Dockerfile` (root) | Modified — JVM flags |
| `KeepAliveScheduler.java` | **NEW** — Self-ping scheduler |
| `SecurityConfiguration.java` | Modified — @EnableMethodSecurity |
| `DashboardService.java` | **REWRITTEN** — GROUP BY queries |
| `EquipmentRepository.java` | Modified — Added countGroupByStatus |
| `ItemRepository.java` | Modified — Added countGroupByItemStatus |
| `MaintenanceRecordRepository.java` | Modified — Added countGroupByStatus |
| `TransactionRepository.java` | Modified — Added countGroupByStatus |
| `AttendanceService.java` | Modified — Bulk fetch + batch save |
| `PurchaseOrderRepository.java` | Modified — Added findByOfferId |
| `PurchaseOrderService.java` | Modified — Use findByOfferId |
| `DeliveryItemReceiptRepository.java` | Modified — Added findByPurchaseOrderItemMerchantId |
| `MerchantRepository.java` | Modified — Added findByMerchantType |
| `MerchantService.java` | Modified — Use new repository queries |
| `AdminController.java` | Modified — @PreAuthorize |
| `UserController.java` | Modified — Return UserDTO |
| `UserService.java` | Modified — Added getAllUserDTOs |
| `NotificationController.java` | Modified — @PreAuthorize on send/broadcast |

### Frontend (5 files)
| File | Change Type |
|------|-------------|
| `ProcurementOffers.jsx` | Modified — Removed token console.log |
| `ProcurementRequestOrderDetails.jsx` | Modified — Fixed navigation path |
| `MaintenanceTransactionModal.jsx` | Modified — Removed dead axios code |
| `EquipmentDashboard.jsx` | Modified — Removed dead axios code |
| `brandService.js` | Modified — Fixed broken import |

---

## Pending Actions (User)

### Render Environment Variables
1. **oretech-test-backend:** Change `SPRING_PROFILES_ACTIVE` from `prod` to `staging`. Remove redundant env vars (SPRING_JPA_HIBERNATE_DDL_AUTO, SPRING_FLYWAY_ENABLED, PORT, DB_HOST/NAME/PORT/USERNAME/PASSWORD).
2. **oretech-backend:** Remove redundant env vars (same list minus profile change).
3. See detailed steps provided in conversation.

### Credential Rotation (URGENT)
Database passwords and AWS access key were shared in conversation and must be rotated:
- Production DB password
- Test DB password
- AWS access key AKIAZZYGLRU5U4XB4LP4

---

## Known Issues NOT Fixed (Deferred)

### From Performance Audit (Agent 1)
- 50+ read-only methods still missing `@Transactional(readOnly=true)` across all services
- `HREmployeeService.getSalaryStatistics()` uses `findAll()` for aggregates (should use SQL)
- `HREmployeeService.getEmployeeDistribution()` uses `findAll()` for GROUP BY counts
- `MerchantService.getAllMerchants()` has 10+ System.out.println per merchant
- `PurchaseOrderService.convertToDTO()` has System.out.println + flush in loop
- `EquipmentService` uses jakarta.transaction.Transactional instead of Spring's
- Missing database indexes on equipment.status, maintenance_record.status, item.item_status

### From Controller Audit (Agent 4)
- 84 of 90 controllers have no `@PreAuthorize` (role-based access planned as separate task)
- 26+ controllers return raw entities instead of DTOs
- 40+ list endpoints have no pagination
- 19 controller methods contain business logic
- 12+ controllers have System.out.println debug logging
- 6 controllers directly inject repositories (bypass service layer)
- 3 conflicting CORS patterns across controller-level annotations
- Inconsistent API versioning (/api/v1/ vs /api/ vs no prefix)

### From Frontend Audit (Agent 5)
- 17 files show raw `err.message` to users (should use SnackbarContext with friendly messages)
- 80+ console.log statements in production code
- 6 duplicate service files (same service in two locations)
- God components: ReceivingTab2.jsx (1,660 lines), RequestOrderModal.jsx (1,236 lines)
- 3 files with inconsistent snackbar argument order
- Typo in directory name: DocuementsTab (should be DocumentsTab)

### From Production-vs-Main Diff (Agent 2)
- Batch transaction matching (warehouse-to-warehouse) removed on main
- Equipment-initiated transactions removed on main
- Dual-perspective inventory adjustments removed on main
- 2 new entities (Task, MeasuringUnit) have no Flyway migration — rely on ddl-auto=update
- Inventory valuation recalculate endpoints removed
- Navbar/theme toggle removed from layout

### From Infrastructure Audit (Agent 3)
- Hardcoded AWS RDS password in application-aws.properties
- Hardcoded admin password "admin123" in DataInitializer.java
- DataInitializer runs heavy queries on every cold start (should be conditional)
- No graceful shutdown configuration
- Root Dockerfile still exists alongside backend/Dockerfile (potential confusion)

---

## Performance Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| Dashboard queries per load | ~35 | ~10 |
| Attendance sheet generation (100 emp, 30 days) | ~3,100 queries | 2 queries |
| PurchaseOrder by offer lookup | Full table scan | 1 indexed query |
| Merchant transactions lookup | N queries (loop) | 1 query |
| Merchant by type lookup | Full table + N+1 | 1 query |
| JVM cold start time | 30-60s (estimated) | 20-40s (with TieredStopAtLevel=1) |
| Connection drop 500 errors | Frequent (no keepalive) | Rare (2-min keepalive ping) |
| Render spin-down | After 15 min idle | Prevented (10-min self-ping) |
