# RockOps Project Knowledgebase

**Last Updated:** 2026-01-23
**Version:** 1.0
**Purpose:** Comprehensive documentation of the RockOps mining site management system architecture, features, and development history.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Domain Modules](#domain-modules)
5. [Critical Business Workflows](#critical-business-workflows)
6. [Technical Implementations](#technical-implementations)
7. [Database Schema](#database-schema)
8. [API Structure](#api-structure)
9. [Frontend Architecture](#frontend-architecture)
10. [Security & Authentication](#security--authentication)
11. [Integration Points](#integration-points)
12. [Development Patterns](#development-patterns)
13. [Feature History](#feature-history)

---

## Project Overview

RockOps is a comprehensive enterprise resource planning (ERP) system designed specifically for mining site operations. It digitizes and streamlines all aspects of mining site management across multiple locations.

### Core Capabilities
- **Equipment Management**: Track heavy machinery lifecycle, maintenance, and utilization
- **HR & Payroll**: Employee management, attendance, leave, promotions, and automated payroll
- **Procurement**: End-to-end procurement workflow from requisition to delivery
- **Warehouse Management**: Multi-site inventory control with sophisticated transaction system
- **Finance**: Accounts payable, general ledger, fixed assets, and balance management
- **Maintenance Workflows**: Multiple maintenance tracking systems for different use cases
- **Real-time Notifications**: WebSocket-based instant updates across the system

### Business Model
- **Multi-site**: Supports multiple mining sites with data isolation
- **Role-based**: 14 different user roles with granular permissions
- **Audit-first**: Complete audit trails for compliance and accountability
- **Real-time**: Live updates via WebSocket for critical operations

---

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.4.5
- **Language**: Java 21
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA with Hibernate
- **Migration**: Flyway (automatic database versioning)
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: WebSocket with STOMP/SockJS
- **File Storage**: AWS S3 / MinIO (configurable)
- **PDF Generation**: iText 7
- **Build Tool**: Maven
- **API Style**: RESTful

### Frontend
- **Framework**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Styling**: Sass/SCSS with CSS Modules
- **HTTP Client**: Axios (centralized configuration)
- **Routing**: React Router v7
- **WebSocket**: STOMP.js
- **Charts**: Recharts
- **Icons**: Lucide React + React Icons
- **i18n**: i18next (internationalization)
- **Excel**: xlsx (file processing)

### Infrastructure
- **Development**: Docker Compose (PostgreSQL + MinIO + Backend)
- **Local DB**: PostgreSQL 16+
- **Storage**: MinIO (local), Cloudflare R2 (production)
- **Deployment**: Railway (backend), Vercel (frontend)

---

## System Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Frontend)              │
│  React Components, Pages, Services, State Management   │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│              CONTROLLER LAYER (REST API)                │
│  @RestController - Handles HTTP requests/responses     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              SERVICE LAYER (Business Logic)             │
│  @Service - Orchestration, Validation, Workflows       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│           REPOSITORY LAYER (Data Access)                │
│  Spring Data JPA - Database operations                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              PERSISTENCE LAYER (Database)               │
│  PostgreSQL - Relational data storage                   │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **Repository Pattern**: Spring Data JPA repositories for database access
2. **Service Pattern**: Business logic encapsulated in service classes
3. **DTO Pattern**: Data Transfer Objects for API communication
4. **Strategy Pattern**: File storage abstraction (S3 vs MinIO)
5. **Builder Pattern**: Lombok @Builder for entity construction
6. **Observer Pattern**: WebSocket notifications
7. **Event Sourcing**: Offer timeline events for audit trails
8. **Factory Pattern**: Custom ID generation service
9. **Facade Pattern**: Service layer facades for complex operations
10. **Dependency Injection**: Spring's IoC container throughout

### Frontend Architecture Pattern

```
API Config (Centralized endpoints)
    ↓
Service Layer (Domain-specific services)
    ↓
Components/Pages (React components)
    ↓
Context API (Global state: Auth, Snackbar, Theme, Language)
```

---

## Domain Modules

### 1. Equipment Management Domain

**Purpose**: Track and manage heavy machinery, vehicles, and equipment assets.

**Key Entities**:
- `Equipment` - Core asset with serial number, type, brand, site
- `EquipmentType` - Categories (excavator, loader, truck, etc.)
- `EquipmentBrand` - Manufacturer information
- `Consumable` - Fuel, oil, filters tracking per equipment
- `InSiteMaintenance` - On-site maintenance records
- `SarkyLog` - Daily work hour tracking
- `SarkyLogRange` - Batch work hour entries
- `WorkEntry` - Work hours by type (loading, hauling, etc.)
- `WorkType` - Work categories
- `Document` - Equipment-related documents (stored in S3)

**Equipment Status Flow**:
```
AVAILABLE → IN_USE → UNDER_MAINTENANCE → OUT_OF_SERVICE → DISPOSED
```

**Key Features**:
- Driver assignment (main/sub driver) with qualification validation
- Consumable tracking with discrepancy resolution
- Work hour analytics (sarky logs)
- Maintenance history
- Image storage with S3 presigned URLs
- Site-specific assignment
- Equipment transactions (transfers between sites)

**API Endpoints**: `/api/v1/equipment/*`, `/api/equipment/*`

---

### 2. HR Management Domain

**Purpose**: Manage employees, attendance, leave, promotions, and recruitment.

**Key Entities**:
- `Employee` - Core employee with salary, contract, position, employee number (`EMP-YYYY-#####`)
- `JobPosition` - Position definitions with hierarchy
- `Department` - Organizational structure
- `Attendance` - Daily attendance records
- `LeaveRequest` - Vacation/sick leave management
- `PromotionRequest` - Employee promotion workflow
- `VacationBalance` - Leave balance tracking
- `EmployeeDocument` - Employee file storage
- `EmployeeDeduction` - Employee deductions with deduction number (`<CODE>-######`)
- `Vacancy` - Job openings
- `Candidate` - Recruitment applicants

**Key DTOs**:
- `EmployeeResponseDTO` - Full employee response including `employeeNumber`
- `EmployeeSummaryDTO` - Minimal employee data with `employeeNumber` for lists and dropdowns

**Employee Contract Types**:
- `HOURLY` - Paid by hour
- `DAILY` - Paid by day
- `MONTHLY` - Fixed monthly salary

**Salary Calculation**:
```java
// Hourly: baseSalary * hoursWorked
// Daily: baseSalary * daysWorked
// Monthly: baseSalary (fixed)
```

**Promotion Workflow**:
```
PENDING → UNDER_REVIEW → APPROVED → IMPLEMENTED
```

**Entity Number Formats**:
- **Employee Number:** `EMP-YYYY-#####` (e.g., `EMP-2025-00001`)
  - `YYYY` = Year from hire date
  - `#####` = Year-based sequential counter (5 digits, zero-padded)
  - Unique constraint on `employee_number` column
  - Generated in `HREmployeeService.generateEmployeeNumber()`

- **Deduction Number:** `<CODE>-######` (e.g., `TAX-000001`, `LOAN-000012`)
  - `<CODE>` = Deduction type code (from `DeductionType.code`)
  - `######` = Type-based sequential counter (6 digits, zero-padded)
  - Generated in `EmployeeDeductionService` using type code

**Key Features**:
- Multi-contract type support with salary calculations
- Driver qualification system (links to Equipment)
- Promotion eligibility rules (12-month minimum)
- Leave balance integration with payroll
- Attendance tracking (present, absent, late, half-day)
- Document management per employee
- Recruitment workflow (vacancy → candidate → employee)

**API Endpoints**: `/api/v1/hr/*`, `/api/v1/employees/*`

---

### 3. Procurement Domain

**Purpose**: End-to-end procurement from requisition to goods receipt.

**Workflow**: `RequestOrder → Offer → PurchaseOrder → Delivery → Warehouse`

**Key Entities**:
- `RequestOrder` - Purchase requisition from departments
- `RequestOrderItem` - Items requested
- `Offer` - Vendor proposals (multiple per RO)
- `OfferItem` - Pricing per item
- `OfferTimelineEvent` - Complete audit trail (event sourcing)
- `OfferFinancialReview` - Finance validation
- `PurchaseOrder` - Final order to vendor
- `PurchaseOrderItem` - Items ordered
- `DeliverySession` - Goods receipt (supports partial deliveries)
- `DeliveryItemReceipt` - Item-level receipt tracking
- `PurchaseOrderIssue` - Quality/quantity issue tracking

**Offer Status Flow**:
```
UNSTARTED → INPROGRESS → SUBMITTED → MANAGERACCEPTED → FINALIZING → COMPLETED
```

**Finance Integration**:
- Offers require financial validation before PO creation
- `financeValidationStatus`: PENDING → ACCEPTED/REJECTED
- PO automatically creates `PaymentRequest`

**Timeline Event Pattern**:
All offer state changes stored as immutable `OfferTimelineEvent`:
- OFFER_CREATED
- OFFER_SUBMITTED
- MANAGER_ACCEPTED/REJECTED
- FINANCE_ACCEPTED/REJECTED
- PO_CREATED
- RETRY_STARTED

**Key Features**:
- Multiple offers per requisition (competitive bidding)
- Complete audit trail via timeline events
- Finance approval workflow
- Partial delivery support
- Issue resolution workflow (refund, replacement, credit)
- Retry mechanism for rejected offers
- Warehouse integration (creates Items on delivery)

**API Endpoints**: `/api/v1/requestOrders/*`, `/api/v1/offers/*`, `/api/v1/purchaseOrders/*`

---

### 4. Warehouse Management Domain

**Purpose**: Multi-site inventory control with sophisticated tracking.

**Key Entities**:
- `Warehouse` - Physical storage locations (site-specific)
- `Item` - Inventory items with quantity, status, source
- `ItemType` - Master catalog of items
- `ItemCategory` - Item classification
- `ItemResolution` - Discrepancy resolution tracking
- `WarehouseEmployee` - User-warehouse access control (many-to-many)

**Item Status**:
```
AVAILABLE, RESERVED, DAMAGED, IN_TRANSIT, CONSUMED
```

**Item Source Tracking**:
```
PURCHASE_ORDER - From procurement
MANUAL_ENTRY - Manually added
TRANSFER - From another warehouse/equipment
RETURN - Returned from equipment/employee
```

**Key Features**:
- Multi-site isolation (each warehouse belongs to one site)
- Source tracking (PO number, merchant, batch number)
- Transaction integration (items move via Transaction system)
- User assignments (WarehouseEmployee junction table)
- Resolution workflow for damaged/discrepancy items
- Real-time inventory updates

**API Endpoints**: `/api/v1/warehouses/*`, `/api/v1/items/*`

---

### 5. Transaction Domain (Critical Cross-Domain)

**Purpose**: Handle movement of inventory between parties (warehouses, equipment, employees).

**Key Entities**:
- `Transaction` - The movement record
- `TransactionItem` - Individual items in transaction

**Party Types**: `WAREHOUSE`, `EQUIPMENT`, `EMPLOYEE`

**Transaction Purposes**: `GENERAL`, `MAINTENANCE`, `PROJECT`, `EMERGENCY`

**Bidirectional Transaction System**:
```
Warehouse A → Warehouse B
├─ Transaction 1: A sends (sentFirst = A's UUID)
└─ Transaction 2: B receives (sentFirst = B's UUID)
    └─ Auto-match if same batchNumber
```

**Batch Number System**:
- Groups related transactions
- Enables auto-reconciliation
- Both parties use same batch number for matching

**Transaction Flow**:
```
1. Create Transaction (PENDING)
   └─ Deduct from sender's inventory (status: IN_TRANSIT)

2. Receiver accepts/rejects
   ├─ ACCEPTED: Add to receiver's inventory (status: AVAILABLE)
   └─ REJECTED: Return to sender

3. Batch Matching (automatic)
   └─ System matches complementary transactions
   └─ Both marked as ACCEPTED
```

**Partial Acceptance**:
- Receiver can accept different quantities
- `receivedQuantities`: Map<itemId, actualQuantity>
- `itemsNotReceived`: Map<itemId, boolean>
- Creates ItemResolution for discrepancies

**Key Features**:
- Bidirectional (sender or receiver can initiate)
- Batch number grouping and auto-matching
- Partial acceptance support
- Multi-party support (warehouse ↔ warehouse, warehouse → equipment, etc.)
- Maintenance integration (links to maintenance records)
- Real-time notifications

**API Endpoints**: `/api/v1/transactions/*`

---

### 6. Finance Domain

**Purpose**: Complete financial management for mining operations.

#### A. Accounts Payable Submodule

**Key Entities**:
- `PaymentRequest` - Requests for payment processing
- `PaymentRequestItem` - Line items
- `PaymentRequestStatusHistory` - Audit trail
- `AccountPayablePayment` - Actual payments
- `OfferFinancialReview` - Procurement offer validation
- `FinancialTransaction` - Generic financial transactions

**Payment Request Workflow**:
```
DRAFT → SUBMITTED → APPROVED → PAID
```

**Features**:
- Multi-level approval workflow
- Integration with PurchaseOrder
- Offer financial validation
- Dashboard for pending payments

#### B. General Ledger Submodule

**Key Entities**:
- `ChartOfAccount` - Account master (COA)
- `JournalEntry` - Double-entry bookkeeping
- `JournalEntryLine` - Debits and credits
- `AccountingPeriod` - Period management
- `AuditLog` - Complete audit trail

**Features**:
- Double-entry accounting system
- Period-based accounting (monthly/quarterly closing)
- Account hierarchies (parent-child)
- Complete audit trail via `Auditable` interface

#### C. Balances Submodule

**Key Entities**:
- `BankAccount` - Bank account management
- `CashSafe` - Physical cash locations
- `CashWithPerson` - Cash held by employees
- `BalanceTransaction` - Movements between accounts

**Account Types**: `BANK`, `CASH_SAFE`, `CASH_WITH_PERSON`

**Features**:
- Multi-currency support
- Balance tracking across account types
- Transaction approval workflow
- Inter-account transfers

#### D. Fixed Assets Submodule

**Key Entities**:
- `FixedAssets` - Asset register
- `AssetDisposal` - Disposal tracking

**Depreciation Methods**: `STRAIGHT_LINE`, `DECLINING_BALANCE`

**Features**:
- Asset lifecycle management
- Depreciation calculation
- Disposal workflow
- Site-specific asset tracking

**API Endpoints**: `/api/v1/finance/*`

---

### 7. Payroll Domain

**Purpose**: Automated payroll processing with multi-stage workflow and data freezing.

**Key Entities**:
- `Payroll` - Monthly payroll run
- `EmployeePayroll` - Individual employee payroll
- `PayrollAttendanceSnapshot` - Frozen attendance data
- `PayrollDeduction` - Deductions applied
- `Loan` - Employee loans with repayments
- `PayrollPublicHoliday` - Public holidays

**Payroll Status Flow**:
```
DRAFT → ATTENDANCE_IMPORT → LEAVE_REVIEW → OVERTIME_REVIEW → CONFIRMED_AND_LOCKED → PAID
```

**Multi-Stage Workflow**:

**Stage 1: DRAFT**
- Create payroll for period
- Create EmployeePayroll for all active employees

**Stage 2: ATTENDANCE_IMPORT**
- Import attendance from Attendance table
- Create `PayrollAttendanceSnapshot` (frozen copy)
- Calculate: working days, absences, late arrivals, overtime
- Finalize attendance (locks data)

**Stage 3: LEAVE_REVIEW**
- Process approved leave requests
- Calculate unpaid leave deductions
- Paid leave doesn't affect salary
- Finalize leave (locks data)

**Stage 4: OVERTIME_REVIEW**
- Calculate overtime pay
- Overtime rate = regularRate × 1.5
- Flag issues (excessive overtime, missing approvals)
- Finalize overtime (locks data)

**Stage 5: CONFIRMED_AND_LOCKED**
- Calculate final amounts:
  - grossSalary = baseSalary + overtimePay + bonuses
  - totalDeductions = taxes + insurance + loans + unpaidLeave
  - netSalary = grossSalary - totalDeductions
- Lock payroll (prevent changes)
- Generate payslips

**Stage 6: PAID**
- Finance processes payments
- Mark payroll as paid
- Archive data

**Data Freezing Strategy**:
- Attendance snapshots are immutable copies
- Prevents backdated changes affecting payroll
- Each stage must be finalized before proceeding
- Null-safe flags with @PostLoad initialization

**Key Features**:
- Multi-contract type support (hourly, daily, monthly)
- Attendance integration with snapshots
- Leave balance integration
- Loan deduction automation
- Public holiday support
- Re-import capability before finalization
- Complete audit trail

**API Endpoints**: `/api/v1/payroll/*`

---

### 8. Maintenance Workflows Domain

**Purpose**: Track equipment maintenance across multiple workflow types.

#### A. In-Site Maintenance (Equipment Domain)

**Entity**: `InSiteMaintenance`

**Features**:
- On-site repairs and servicing
- Linked to Equipment
- Transaction integration for parts
- MaintenanceConsumable tracking
- Cost tracking

**Status**: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`

#### B. Maintenance Records System

**Entities**:
- `MaintenanceRecord` - Multi-step maintenance
- `MaintenanceStep` - Individual workflow steps
- `MaintenanceStepMerchantItem` - Items purchased per step
- `StepType` - Configurable step types

**Features**:
- Flexible multi-step workflow
- External contact assignment
- Cost tracking per step and total
- Status: `ACTIVE`, `COMPLETED`, `ON_HOLD`, `CANCELLED`

#### C. Direct Purchase Tickets (4-Step Workflow)

**Entity**: `DirectPurchaseTicket`

**Purpose**: Streamlined workflow for direct equipment part purchases

**4-Step Workflow**:

**Step 1: CREATION**
- Define: Equipment, issue, expected cost
- Fields: title, initialIssueDescription, expectedCost
- Complete → step1Completed = true

**Step 2: PURCHASING**
- Select merchant, create purchase items
- Fields: merchant, downPayment, DirectPurchaseItem list
- Complete → step2Completed = true

**Step 3: TRANSPORTING**
- Transport items to site
- Fields: transportationCompany, transportationCost
- Complete → step3Completed = true

**Step 4: FINALIZING**
- Complete work, document final costs
- Fields: finalTotalCost, actualCompletionDate
- Complete → step4Completed = true → COMPLETED

**Key Features**:
- Fixed 4-step workflow (linear progression)
- Timestamp tracking per step
- Legacy ticket support (old tickets bypass workflow)
- Cost evolution: expected → down payment → final
- Image attachments per step
- Site tracking via Equipment

**API Endpoints**: `/api/maintenance/*`, `/api/direct-purchase-tickets/*`

---

### 9. Notification Domain

**Purpose**: Real-time notifications via WebSocket.

**Key Entities**:
- `Notification` - Notification records
- `NotificationType`: SUCCESS, ERROR, WARNING, INFO

**Notification Types**:

**User-specific (GREEN)**:
- `notification.user != null`
- Sent to specific user
- Deleted when dismissed
- Delivered to: `/user/{userId}/queue/notifications`

**Broadcast (BLUE)**:
- `notification.user == null`
- Sent to all users
- Hidden per-user (not deleted)
- `hiddenByUsers` JSON field
- Delivered to: `/topic/notifications`

**Read Tracking**:
- User-specific: `notification.read` boolean
- Broadcast: `readByUsers` JSON field (UUID array)

**WebSocket Architecture**:
- Protocol: STOMP over SockJS
- Endpoint: `/ws` (with SockJS fallback)
- Native: `/ws-native`
- Heartbeat: 10 seconds (server & client)

**Role-based Targeting**:
- `sendNotificationToWarehouseUsers()`
- `sendNotificationToEquipmentUsers()`
- `sendNotificationToFinanceUsers()`
- `sendNotificationToHRUsers()`
- `sendNotificationToProcurementUsers()`

**Action URLs**:
- Navigate to relevant screens
- Format: `/warehouses/transactions/123`
- `relatedEntity`: For filtering (e.g., "TRANSACTION_123")

**API Endpoints**: `/api/notifications/*`, WebSocket: `/ws`

---

### 10. Site Management Domain

**Purpose**: Multi-site organization and data isolation.

**Key Entity**: `Site`

**Relationships**:
- OneToMany: Equipment, Warehouse, Employee, FixedAssets
- ManyToMany: Merchant (via SitePartner junction)

**Data Isolation Strategy**:
Most entities have `@ManyToOne Site` for multi-tenant support:
- Equipment → Site
- Warehouse → Site
- Employee → Site
- Merchant ↔ Site (many-to-many)

**Features**:
- Physical and company address tracking
- Site photo storage
- Partner associations
- Transient counts (equipmentCount, employeeCount, warehouseCount)

**Query Filtering**:
```java
List<Equipment> findBySiteId(UUID siteId);
// Service layer checks user access to site
```

**API Endpoints**: `/api/v1/site/*`, `/siteadmin/*`

---

### 11. Contact Management Domain

**Purpose**: External contacts for maintenance, logistics, vendors.

**Key Entities**:
- `Contact` - External contact information
- `ContactType` - Categories of contacts
- `ContactLog` - Communication history

**Features**:
- Specialization tracking
- Emergency contact flagging
- Active/inactive status
- Merchant associations
- Assignment tracking

**API Endpoints**: `/api/contacts/*`

---

### 12. Merchant/Partner Domain

**Purpose**: Vendor and partner management.

**Key Entities**:
- `Merchant` - Vendors/suppliers
- `Partner` - Business partners
- `MerchantType`: SUPPLIER, CONTRACTOR, SERVICE_PROVIDER

**Features**:
- Multi-site associations (many-to-many)
- Transaction history tracking
- Performance metrics
- Contact information

**API Endpoints**: `/api/v1/merchants/*`, `/api/v1/partner/*`

---

## Critical Business Workflows

### 1. Equipment Lifecycle Workflow

```
Purchase/Acquisition
    ↓
AVAILABLE (ready for use)
    ↓ Assign driver
IN_USE (operational)
    ↓ Create maintenance
UNDER_MAINTENANCE (being serviced)
    ├─ Transaction for parts (Warehouse → Equipment)
    ├─ Track consumables used
    └─ Complete maintenance
    ↓
AVAILABLE / IN_USE (back to service)
    ↓ Major damage or pending disposal
OUT_OF_SERVICE
    ↓ Final disposition
DISPOSED (end of life)
    └─ Create AssetDisposal record
```

**Key Validations**:
- Driver assignment requires qualification check: `employee.canDrive(equipmentType)`
- Maintenance requires equipment to be UNDER_MAINTENANCE status
- Disposal is irreversible final state

**Integration Points**:
- HR: Driver qualification validation
- Warehouse: Parts requisition via Transaction
- Finance: Asset tracking via FixedAssets
- Maintenance: Multiple maintenance systems

---

### 2. Procurement Workflow (End-to-End)

```
Step 1: REQUISITION
Department creates RequestOrder
    ├─ Define items needed
    ├─ Set deadline
    └─ Status: PENDING → APPROVED

Step 2: COMPETITIVE BIDDING
Procurement creates multiple Offers
    ├─ Offer 1: Merchant A, Timeline tracking
    ├─ Offer 2: Merchant B, Timeline tracking
    └─ Offer 3: Merchant C, Timeline tracking

Each Offer workflow:
    UNSTARTED → INPROGRESS (fill details)
        → SUBMITTED (to manager)
        → MANAGERACCEPTED (manager approves)

Step 3: FINANCE VALIDATION
Selected Offer goes to Finance
    ├─ Create OfferFinancialReview
    ├─ Finance validates budget
    └─ financeValidationStatus: ACCEPTED/REJECTED

Step 4: PURCHASE ORDER CREATION
If finance accepts:
    ├─ Create PurchaseOrder from Offer
    ├─ Generate PO number (PO000123)
    ├─ Create PaymentRequest
    └─ Send to merchant

Step 5: DELIVERY
Merchant delivers (supports partial deliveries)
    ├─ Create DeliverySession
    ├─ Create DeliveryItemReceipt per item
    ├─ Quality check
    │   ├─ If OK → Create warehouse Items
    │   └─ If issue → Create PurchaseOrderIssue
    └─ Process resolution if needed

Step 6: COMPLETION
    ├─ All items received and QC passed
    ├─ All issues resolved
    ├─ PO status: COMPLETED
    ├─ Process payment via PaymentRequest
    └─ RequestOrder: COMPLETED
```

**Timeline Event Tracking**:
Every offer state change creates an `OfferTimelineEvent`:
- Who made the change
- What changed
- When it happened
- Why it happened (comments)

**Retry Mechanism**:
- Rejected offers can be retried
- `currentAttemptNumber` increments
- Timeline shows all attempts
- Max retries configurable

---

### 3. Warehouse Transaction Workflow

```
Scenario: Transfer items from Warehouse A to Warehouse B

SENDER SIDE (Warehouse A):
1. Create Transaction
   ├─ Type: WAREHOUSE → WAREHOUSE
   ├─ Batch: Auto-generated or manual (e.g., 12345)
   ├─ sentFirst: A's UUID
   ├─ Status: PENDING
   └─ Items: Oil (50L), Filters (50 units)

2. Deduct from A's inventory
   └─ Items status: IN_TRANSIT

3. Notification sent to Warehouse B

RECEIVER SIDE (Warehouse B):
Option 1: Accept existing transaction
4a. B views pending transaction
5a. B clicks "Accept"
    ├─ Can modify received quantities
    ├─ Can mark items as not received
    └─ Creates ItemResolution for discrepancies

Option 2: B independently logs receipt
4b. B creates new transaction
    ├─ "Received from A"
    ├─ Same batch: 12345
    ├─ sentFirst: B's UUID
    └─ Status: PENDING

AUTO-MATCHING:
5b. System detects same batch number
    ├─ Matches: A→B (sentFirst=A) with A→B (sentFirst=B)
    ├─ Auto-accepts both transactions
    └─ Notifications to both parties

COMPLETION:
6. Items added to B's inventory
   ├─ Status: AVAILABLE
   ├─ itemSource: TRANSFER
   └─ sourceReference: "BATCH_12345"

7. Both parties notified of completion
```

**Batch Matching Logic**:
```java
if (sameWarehousePair && sameBatchNumber && oppositeSentFirst) {
    autoMatch(); // Both transactions marked ACCEPTED
}
```

**Partial Acceptance**:
- Receiver can accept different quantities than sent
- Missing items flagged with `itemsNotReceived`
- Creates ItemResolution for investigation
- Sender gets notification with discrepancies

---

### 4. Payroll Processing Workflow

```
MONTH START: Create Payroll (DRAFT)
    ├─ Define period: month, year, start/end dates
    ├─ Create EmployeePayroll for all active employees
    └─ Initialize all amounts to zero

STAGE 1: ATTENDANCE_IMPORT
    ├─ Import attendance from Attendance table
    ├─ For each employee:
    │   ├─ Query attendance records in period
    │   ├─ Create PayrollAttendanceSnapshot (frozen copy)
    │   └─ Calculate: days, absences, late arrivals, overtime
    ├─ HR reviews attendance data
    ├─ Multiple imports allowed (attendanceImportCount)
    └─ Finalize attendance → attendanceFinalized = true (LOCKS)

STAGE 2: LEAVE_REVIEW
    ├─ Query approved LeaveRequests in period
    ├─ For each employee with leave:
    │   ├─ Calculate leave days
    │   ├─ Paid leave: No deduction
    │   └─ Unpaid leave: Create PayrollDeduction
    ├─ HR reviews leave data
    └─ Finalize leave → leaveFinalized = true (LOCKS)

STAGE 3: OVERTIME_REVIEW
    ├─ Calculate overtime from snapshots
    ├─ overtimeRate = regularRate × 1.5
    ├─ overtimePay = overtimeHours × overtimeRate
    ├─ Flag issues (excessive, missing approvals)
    ├─ HR reviews overtime data
    └─ Finalize overtime → overtimeFinalized = true (LOCKS)

STAGE 4: CONFIRMED_AND_LOCKED
    ├─ All data locked (attendance, leave, overtime)
    ├─ Calculate final amounts:
    │   ├─ grossSalary = base + overtime + bonuses
    │   ├─ deductions = tax + insurance + loans + unpaidLeave
    │   └─ netSalary = gross - deductions
    ├─ Calculate payroll totals
    ├─ Generate payslips (PDF)
    └─ Lock payroll → lockedAt, lockedBy

STAGE 5: PAID
    ├─ Finance processes payments
    ├─ Mark as paid → paidAt, paidBy
    └─ Archive payroll data
```

**Critical Rules**:
- Each stage must be finalized before next stage
- Attendance snapshots are immutable (prevent backdating)
- Re-import allowed before finalization
- Once locked, NO changes allowed
- Public holidays excluded from working days

**Salary Calculation by Contract Type**:
```
HOURLY: baseSalary × hoursWorked (from snapshots)
DAILY: baseSalary × daysWorked (from snapshots)
MONTHLY: baseSalary (fixed)
```

---

### 5. Direct Purchase 4-Step Workflow

```
STEP 1: CREATION
Equipment manager identifies issue
    ├─ Select equipment
    ├─ Describe issue
    ├─ Estimate expected cost
    ├─ Set expected end date
    └─ Complete step → step1Completed = true

STEP 2: PURCHASING
Maintenance team purchases parts
    ├─ Select merchant
    ├─ Add DirectPurchaseItem entries
    │   ├─ Item name, description
    │   ├─ Quantity, unit price, total price
    │   └─ Multiple items supported
    ├─ Pay down payment (optional)
    └─ Complete step → step2Completed = true

STEP 3: TRANSPORTING
Logistics handles delivery
    ├─ Assign transportation company
    ├─ Record transportation cost
    ├─ Track delivery date
    ├─ Add transport notes
    └─ Complete step → step3Completed = true

STEP 4: FINALIZING
Complete installation and close
    ├─ Install parts / complete work
    ├─ Record final total cost
    ├─ Document actual completion date
    ├─ Add final notes and images
    └─ Complete step → step4Completed = true
        └─ currentStep = COMPLETED

TIMESTAMP TRACKING:
Each step tracks:
    ├─ step{N}StartedAt - When step began
    └─ step{N}CompletedAt - When step finished
```

**Cost Evolution**:
- Expected cost (Step 1)
- Down payment (Step 2)
- Transportation cost (Step 3)
- Final total cost (Step 4)

**Legacy Support**:
- Old tickets: `isLegacyTicket = true` bypasses workflow
- New tickets: Must complete steps in order

---

## Technical Implementations

### 1. Authentication & Authorization (JWT)

**Authentication Flow**:
```
1. User Login: POST /api/v1/auth/authenticate
   ├─ Validate username/password
   ├─ Generate JWT token (16.7 hour expiry)
   └─ Response: { token, role, firstName, lastName, username }

2. Subsequent Requests
   ├─ Client: Authorization: Bearer <token>
   ├─ JwtAuthenticationFilter intercepts
   ├─ Extract username from token
   ├─ Load user from database
   ├─ Validate token
   ├─ Set SecurityContext
   └─ Proceed to controller
```

**JWT Configuration**:
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 1000 × 60 × 1000 ms = ~16.7 hours
- **Secret**: 512-character Base64-encoded (in JwtService)
- **Claims**: Subject (username), IssuedAt, Expiration

**User Roles (14 total)**:
```
USER - Basic user
SITE_ADMIN - Site administrator
PROCUREMENT - Procurement team
WAREHOUSE_MANAGER - Warehouse management
WAREHOUSE_EMPLOYEE - Warehouse staff
SECRETARY - Administrative staff
EQUIPMENT_MANAGER - Equipment management
HR_MANAGER - HR management
HR_EMPLOYEE - HR staff
FINANCE_MANAGER - Finance management
FINANCE_EMPLOYEE - Finance staff
MAINTENANCE_EMPLOYEE - Maintenance staff
MAINTENANCE_MANAGER - Maintenance management
ADMIN - System administrator
```

**Authorization Patterns**:
```java
// Controller level
@PreAuthorize("hasRole('ADMIN')")

// Service level
if (!user.canAccessSite(siteId) && user.getRole() != Role.ADMIN) {
    throw new AccessDeniedException();
}
```

**Security Configuration**:
```
Public endpoints (no auth):
- / (health check)
- /api/v1/auth/** (login/register)
- /actuator/** (health endpoints)
- /ws/** (WebSocket - authenticated after connect)

Protected endpoints:
- /api/v1/admin/** → ADMIN role required
- All other /api/** → Authenticated user required
```

**Session Management**: STATELESS (no server-side sessions)

---

### 2. WebSocket Notification System

**Architecture**:
```
Backend: STOMP over SockJS
    ├─ Endpoint: /ws (with SockJS fallback)
    ├─ Native: /ws-native (no SockJS)
    └─ Broker: Simple in-memory

Message Channels:
    ├─ Broadcast: /topic/notifications → All users
    └─ User-specific: /user/{userId}/queue/notifications → Single user

Heartbeat:
    ├─ Server → Client: 10 seconds
    ├─ Client → Server: 10 seconds
    └─ SockJS heartbeat: 25 seconds
```

**Connection Tracking**:
```java
// WebSocketController
Map<UUID, StompSession> userSessions;

isUserConnected(UUID userId) // Check if user online
```

**Notification Delivery**:
```
1. Notification created in database (persistent)
2. If user connected → Send via WebSocket (real-time)
3. If user offline → Waits in database
4. On user connect → Client fetches from database
```

**Frontend Integration**:
```javascript
// Connect to WebSocket
const stompClient = new Client({
    brokerURL: 'ws://localhost:8080/ws-native',
    onConnect: () => {
        // Subscribe to user notifications
        stompClient.subscribe(`/user/${userId}/queue/notifications`, (message) => {
            const notification = JSON.parse(message.body);
            showSnackbar(notification.message, notification.type);
        });

        // Subscribe to broadcast notifications
        stompClient.subscribe('/topic/notifications', (message) => {
            const notification = JSON.parse(message.body);
            showSnackbar(notification.message, notification.type);
        });
    }
});
```

---

### 3. File Storage Strategy Pattern

**Interface**: `FileStorageService`

**Implementations**:
1. **S3ServiceImpl** - AWS S3 (production)
2. **MinioService** - Local MinIO (development)

**Configuration Switch**:
```properties
storage.type=minio  # or "s3"
aws.s3.enabled=true
aws.s3.bucket-name=rockops
```

**Bean Configuration**:
```java
@Bean
@Primary
public FileStorageService fileStorageService() {
    if ("s3".equalsIgnoreCase(storageType)) {
        return new S3ServiceImpl(s3Client, s3Presigner);
    } else {
        return new MinioService(s3Client, s3Presigner);
    }
}
```

**Storage Use Cases**:
- Equipment images: `equipment.imageStorageKey`
- Employee documents: `EmployeeDocument.storageKey`
- Equipment documents: `Document.storageKey`
- Warehouse photos: `warehouse.photoUrl`
- Site photos: `site.photoUrl`

**Presigned URLs**:
- Generated on-demand for downloads
- Time-limited (15-60 minutes)
- No authentication required for presigned URL
- Format: `https://bucket.s3.region.amazonaws.com/key?X-Amz-...`

**Migration Support**:
- `EquipmentImageMigrationRunner` - Bootstrap runner
- Migrates legacy URLs to S3 storage keys

---

### 4. Database Migration (Flyway)

**Configuration**:
```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-version=99
spring.jpa.hibernate.ddl-auto=none  # Flyway manages schema
```

**Migration File Naming**:
```
V{version}__{description}.sql

Examples:
V1__Add_resolved_column_to_consumable.sql
V100__Step_Types_Complete_Migration.sql
V20250101__add_merchant_to_contacts.sql
```

**Migration Strategy**:
1. **Flyway manages schema** (Hibernate does NOT)
2. **Baseline version: 99** (existing databases start here)
3. **New migrations** numbered sequentially after baseline
4. **Version control** for database schema

**Migration Types**:
- Schema changes (ADD COLUMN, CREATE TABLE, ALTER CONSTRAINT)
- Data migrations (INSERT, UPDATE master data)
- Constraint fixes (case sensitivity, unique constraints)

**Development vs Production**:
```properties
# Production
spring.jpa.hibernate.ddl-auto=none  # Flyway only

# Development (optional)
spring.jpa.hibernate.ddl-auto=update  # Generate DDL for reference
spring.jpa.show-sql=true
```

---

### 5. Custom ID Generation

**System**: `EntityIdGeneratorService` with database-backed sequences

**Configuration**: `EntityTypeConfig` enum
```java
MERCHANT("MCH", 6)           // MCH000001
PURCHASE_ORDER("PO", 6)      // PO000001
PAYMENT_REQUEST("PR", 6)     // PR000001
JOURNAL_ENTRY("JE", 6)       // JE000001
FIXED_ASSET("FA", 6)         // FA000001
```

**Database Table**: `entity_id_sequences`
```sql
CREATE TABLE entity_id_sequences (
    entity_type VARCHAR(50) PRIMARY KEY,
    current_sequence BIGINT NOT NULL,
    version BIGINT  -- Optimistic locking
);
```

**Usage**:
```java
String poNumber = entityIdGeneratorService.generateNextId(
    EntityTypeConfig.PURCHASE_ORDER
);
// Returns: "PO000001", "PO000002", etc.
```

**Features**:
- Thread-safe (@Transactional + @Version)
- Configurable padding per entity type
- Auto-initialization (creates sequence if missing)
- Database-backed (survives restarts)
- Centralized management

**Domain-Specific ID Formats** (Not using EntityIdGeneratorService):

**Employee Number**: `EMP-YYYY-#####`
```java
// Repository query
@Query(value = "SELECT MAX(CAST(SUBSTRING(e.employee_number, 10) AS BIGINT)) " +
       "FROM employee e WHERE e.employee_number LIKE CONCAT('EMP-', :year, '-%')", nativeQuery = true)
Long getMaxEmployeeNumberSequenceByYear(@Param("year") String year);

// Service method
private String generateEmployeeNumber(LocalDate hireDate) {
    int year = hireDate != null ? hireDate.getYear() : LocalDate.now().getYear();
    String yearStr = String.valueOf(year);
    Long maxSequence = employeeRepository.getMaxEmployeeNumberSequenceByYear(yearStr);
    long nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
    return String.format("EMP-%s-%05d", yearStr, nextSequence);
}
```

**Employee Deduction Number**: `<CODE>-######`
```java
// Repository query
@Query(value = "SELECT MAX(CAST(SUBSTRING(ed.deduction_number, LENGTH(:typeCode) + 2) AS BIGINT)) " +
       "FROM employee_deductions ed WHERE ed.deduction_number LIKE CONCAT(:typeCode, '-%')", nativeQuery = true)
Long getMaxDeductionNumberSequenceByTypeCode(@Param("typeCode") String typeCode);

// Generation method
public static String generateDeductionNumber(String typeCode, long sequenceNumber) {
    return String.format("%s-%06d", typeCode, sequenceNumber);
}
```

---

### 6. Multi-Site Data Isolation

**Implementation Pattern**:
```java
// Most entities have Site relationship
@ManyToOne
@JoinColumn(name = "site_id")
private Site site;

// Queries filter by site
List<Equipment> findBySiteId(UUID siteId);

// Service layer validates access
if (!user.canAccessSite(siteId) && user.getRole() != Role.ADMIN) {
    throw new AccessDeniedException();
}
```

**Site Context Determination**:
```
User → Employee → Site (regular employees)
User → WarehouseEmployee → Warehouse → Site (warehouse staff)
User (ADMIN role) → Access all sites (admins bypass)
```

**Inherited Site Context**:
```
Site
├─ Equipment (direct)
├─ Warehouse (direct)
├─ Employee (direct)
├─ InSiteMaintenance → Equipment → Site (inherited)
├─ Transaction → Warehouse → Site (inherited)
├─ Item → Warehouse → Site (inherited)
└─ Consumable → Equipment → Site (inherited)
```

**Merchant Exception**:
- Merchants are many-to-many with Sites
- One merchant can serve multiple sites
- Junction table: `site_partner`

---

## Database Schema

### Entity Relationships Overview

**One-to-One**:
- Equipment ↔ Employee (mainDriver)
- PurchaseOrder ↔ Offer

**Many-to-One** (Most common):
- Equipment → Site
- Warehouse → Site
- Employee → Site
- Transaction → InSiteMaintenance
- Item → Warehouse

**One-to-Many**:
- Site → Equipment
- Offer → OfferTimelineEvent (ordered by eventTime)
- Payroll → EmployeePayroll (cascade, orphanRemoval)

**Many-to-Many**:
- Merchant ↔ Site (junction: site_partner)
- User ↔ Warehouse (junction: warehouse_employee)

**Self-referencing**:
- ChartOfAccount → parentAccount
- JobPosition → parentPosition

### Core Tables

**Users & Authentication**:
- `users` - User accounts
- `user_roles` - Role assignments

**Sites & Organization**:
- `sites` - Mining site locations
- `site_partner` - Site-merchant associations
- `departments` - Organizational structure
- `job_positions` - Position hierarchy

**Equipment**:
- `equipment` - Equipment assets
- `equipment_types` - Equipment categories
- `equipment_brands` - Manufacturers
- `consumables` - Fuel/oil tracking
- `consumable_resolutions` - Discrepancy resolution
- `in_site_maintenance` - Maintenance records
- `maintenance_consumables` - Parts used
- `sarky_logs` - Work hour tracking
- `sarky_log_ranges` - Batch hour entries
- `work_entries` - Work by type
- `work_types` - Work categories
- `documents` - Equipment documents

**HR**:
- `employees` - Employee master
- `attendance` - Daily attendance
- `leave_requests` - Vacation/sick leave
- `promotion_requests` - Promotions
- `vacation_balances` - Leave balances
- `employee_documents` - Employee files
- `vacancies` - Job openings
- `candidates` - Applicants

**Payroll**:
- `payroll` - Payroll runs
- `employee_payroll` - Individual payroll
- `payroll_attendance_snapshots` - Frozen attendance
- `payroll_deductions` - Deductions applied
- `loans` - Employee loans
- `payroll_public_holidays` - Holidays

**Procurement**:
- `request_orders` - Purchase requisitions
- `request_order_items` - Requested items
- `offers` - Vendor proposals
- `offer_items` - Pricing
- `offer_timeline_events` - Audit trail
- `offer_financial_reviews` - Finance validation
- `purchase_orders` - Final orders
- `purchase_order_items` - Ordered items
- `delivery_sessions` - Goods receipt
- `delivery_item_receipts` - Item-level receipt
- `purchase_order_issues` - Quality issues

**Warehouse**:
- `warehouses` - Storage locations
- `items` - Inventory
- `item_types` - Item catalog
- `item_categories` - Classification
- `item_resolutions` - Issue tracking
- `warehouse_employees` - Access control
- `transactions` - Inventory movements
- `transaction_items` - Items transferred

**Finance**:
- `chart_of_accounts` - COA
- `journal_entries` - Double-entry
- `journal_entry_lines` - Debits/credits
- `accounting_periods` - Period management
- `audit_logs` - Audit trail
- `payment_requests` - Payment processing
- `payment_request_items` - Line items
- `payment_request_status_history` - Status tracking
- `account_payable_payments` - Payments
- `offer_financial_reviews` - Offer validation
- `financial_transactions` - Generic transactions
- `bank_accounts` - Bank accounts
- `cash_safes` - Cash locations
- `cash_with_persons` - Cash with employees
- `balance_transactions` - Balance movements
- `fixed_assets` - Asset register
- `asset_disposals` - Disposal tracking
- `invoices` - Vendor invoices
- `payments` - Invoice payments

**Maintenance**:
- `maintenance_records` - Multi-step maintenance
- `maintenance_steps` - Workflow steps
- `maintenance_step_merchant_items` - Items per step
- `step_types` - Step categories
- `direct_purchase_tickets` - 4-step workflow
- `direct_purchase_steps` - Step tracking
- `direct_purchase_items` - Items purchased

**Contacts & Merchants**:
- `contacts` - External contacts
- `contact_types` - Contact categories
- `contact_logs` - Communication history
- `merchants` - Vendors
- `merchant_types` - Vendor categories

**Notifications**:
- `notifications` - Notification records
- `notification_types` - Categories

**System**:
- `entity_id_sequences` - Custom ID generation

### Database Conventions

**Primary Keys**: UUID (GenerationType.AUTO)

**Timestamps**:
```java
@CreationTimestamp
private LocalDateTime createdAt;

@UpdateTimestamp
private LocalDateTime updatedAt;
```

**Soft Delete** (where applicable):
```java
private Boolean active = true;
private LocalDateTime deletedAt;
```

**Optimistic Locking**:
```java
@Version
private Long version;
```

**Audit Fields**:
```java
private String createdBy;
private String updatedBy;
```

---

## API Structure

### REST API Conventions

**Base URL**: `/api/v1/{domain}`

**Standard Endpoints**:
```
GET    /{domain}           - List all
GET    /{domain}/{id}      - Get by ID
POST   /{domain}           - Create
PUT    /{domain}/{id}      - Update
DELETE /{domain}/{id}      - Delete
```

**Domain Endpoints**:

**Equipment**: `/api/v1/equipment/*`, `/api/equipment/*`
- GET `/api/v1/equipment` - All equipment
- GET `/api/v1/equipment/{id}` - By ID
- GET `/api/v1/equipment/type/{typeId}` - By type
- GET `/api/equipment/{id}/consumables` - Consumables
- GET `/api/equipment/{id}/maintenance` - Maintenance
- POST `/api/equipment/{id}/send-transaction` - Send items

**HR**: `/api/v1/hr/*`, `/api/v1/employees/*`
- GET `/api/v1/employees` - All employees
- GET `/api/v1/employees/drivers` - Drivers
- GET `/api/v1/hr/dashboard/salary-statistics` - Salary stats

**Procurement**: `/api/v1/requestOrders/*`, `/api/v1/offers/*`, `/api/v1/purchaseOrders/*`
- GET `/api/v1/offers` - All offers
- GET `/api/v1/offers/{id}/timeline` - Timeline events
- POST `/api/v1/offers/{id}/continue-and-return` - Retry offer
- POST `/api/v1/purchaseOrders/{id}/process-delivery` - Process delivery

**Warehouse**: `/api/v1/warehouses/*`, `/api/v1/items/*`
- GET `/api/v1/warehouses` - All warehouses
- GET `/api/v1/items/warehouse/{id}` - Warehouse items
- POST `/api/v1/items/resolve-discrepancy` - Resolve issue

**Transactions**: `/api/v1/transactions/*`
- POST `/api/v1/transactions/create` - Create transaction
- POST `/api/v1/transactions/{id}/accept` - Accept
- POST `/api/v1/transactions/{id}/reject` - Reject

**Finance**: `/api/v1/finance/*`
- POST `/api/v1/finance/payment-requests` - Payment request
- GET `/api/v1/finance/dashboard/summary` - Dashboard
- POST `/api/v1/journal-entries` - Journal entry

**Payroll**: `/api/v1/payroll/*`
- POST `/api/v1/payroll` - Create payroll
- POST `/api/v1/payroll/{id}/import-attendance` - Import
- POST `/api/v1/payroll/{id}/finalize-attendance` - Lock attendance

**Notifications**: `/api/notifications/*`
- GET `/api/notifications/unread` - Unread notifications
- POST `/api/notifications/{id}/read` - Mark as read

**Auth**: `/api/v1/auth/*`
- POST `/api/v1/auth/authenticate` - Login
- POST `/api/v1/auth/register` - Register
- GET `/api/v1/auth/me` - Current user

### Response Format

**Success Response**:
```json
{
  "id": "uuid",
  "name": "value",
  "createdAt": "2026-01-16T10:30:00"
}
```

**List Response**:
```json
[
  { "id": "uuid1", "name": "value1" },
  { "id": "uuid2", "name": "value2" }
]
```

**Error Response**:
```json
{
  "timestamp": "2026-01-16T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/equipment"
}
```

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── equipment/      # Equipment-specific
│   └── procurement/    # Procurement-specific
├── pages/              # Page components
│   ├── admin/
│   ├── dashboards/
│   ├── equipment/
│   ├── finance/
│   ├── HR/
│   ├── maintenance/
│   ├── payroll/
│   ├── procurement/
│   └── warehouse/
├── services/           # API service classes
│   ├── hr/
│   ├── procurement/
│   └── *.js files
├── styles/             # Sass/SCSS files
│   ├── primary-button.scss
│   ├── modal-styles.scss
│   ├── status-badges.scss
│   └── theme-variables.css
├── contexts/           # React contexts
│   ├── AuthContext.jsx
│   ├── SnackbarContext.jsx
│   ├── ThemeContext.jsx
│   └── LanguageContext.jsx
├── utils/              # Utility functions
│   ├── apiClient.js
│   ├── errorHandler.js
│   ├── rbac.js
│   └── roles.js
├── config/
│   └── api.config.js   # Centralized API endpoints
├── constants/
│   └── documentTypes.js
├── assets/             # Static assets
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── i18n.jsx            # i18n configuration
```

### Service Layer Pattern

**All API calls go through service classes**:

```javascript
// services/equipmentService.js
import api from '../config/api.config';

class EquipmentService {
    static async getEquipment() {
        const response = await api.get('/api/v1/equipment');
        return response.data;
    }

    static async createEquipment(data) {
        const response = await api.post('/api/v1/equipment', data);
        return response.data;
    }
}

export default EquipmentService;
```

**Usage in components**:
```javascript
import EquipmentService from '../services/equipmentService';

const EquipmentList = () => {
    const [equipment, setEquipment] = useState([]);

    useEffect(() => {
        const loadEquipment = async () => {
            const data = await EquipmentService.getEquipment();
            setEquipment(data);
        };
        loadEquipment();
    }, []);
};
```

### State Management

**React Contexts**:

1. **AuthContext** - Authentication state
```javascript
const { user, login, logout, isAuthenticated } = useContext(AuthContext);
```

2. **SnackbarContext** - User notifications
```javascript
const { showError, showSuccess, showInfo, showWarning } = useContext(SnackbarContext);

// Usage
showSuccess('Equipment created successfully');
showError('Failed to save equipment');
```

3. **ThemeContext** - UI theme
```javascript
const { theme, toggleTheme } = useContext(ThemeContext);
```

4. **LanguageContext** - i18n language
```javascript
const { language, changeLanguage } = useContext(LanguageContext);
```

### Styling System

**Centralized Sass files** in `src/styles/`:
- `primary-button.scss` - Button styles
- `modal-styles.scss` - Modal components
- `status-badges.scss` - Status indicators
- `theme-variables.css` - CSS custom properties
- `tabs.scss` - Tab components
- `textarea-styles.scss` - Form inputs

**Naming Convention**: kebab-case
- Component: `EquipmentCard.jsx`
- Style: `equipment-card.scss`

**Class Naming Pattern**: `{page}-{component}-{purpose}`
```
equipment-list-container
maintenance-form-wrapper
dashboard-stats-card
```

### Error Handling Pattern

**ALL user feedback via SnackbarContext**:

```javascript
try {
    setLoading(true);
    const result = await EquipmentService.createEquipment(data);
    showSuccess('Equipment created successfully');
} catch (error) {
    if (error.response?.status === 409) {
        showError('Equipment serial number already exists');
    } else if (error.response?.status === 400) {
        showError(error.response.data.message || 'Invalid input');
    } else if (error.response?.status === 403) {
        showError('You don\'t have permission to create equipment');
    } else {
        showError('Failed to create equipment. Please try again.');
    }
} finally {
    setLoading(false);
}
```

**Never show raw server errors to users**

---

## Security & Authentication

### JWT Token Flow

```
1. Login Request
   POST /api/v1/auth/authenticate
   Body: { username, password }

2. Server Validates
   ├─ Check username/password
   ├─ Generate JWT token
   └─ Response: { token, role, user details }

3. Client Stores Token
   └─ localStorage.setItem('token', token)

4. Subsequent Requests
   ├─ Include: Authorization: Bearer {token}
   ├─ Server validates token
   └─ Extracts user from token

5. Token Expiry
   └─ 16.7 hours (configurable)
```

### Role-Based Access Control (RBAC)

**Frontend RBAC**:
```javascript
import { hasRole, hasAnyRole } from '../utils/rbac';

// Check single role
if (hasRole(user, 'ADMIN')) {
    // Show admin menu
}

// Check multiple roles
if (hasAnyRole(user, ['FINANCE_MANAGER', 'FINANCE_EMPLOYEE'])) {
    // Show finance features
}
```

**Backend Authorization**:
```java
// Controller level
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Void> deleteEquipment(@PathVariable UUID id) {
    // Only ADMIN can delete
}

// Service level
if (!SecurityUtils.hasRole(user, Role.EQUIPMENT_MANAGER)) {
    throw new AccessDeniedException();
}
```

### CORS Configuration

**Allowed Origins**:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (React dev alternative)
- `https://dev-rock-ops.vercel.app` (Dev deployment)
- `https://rock-ops.vercel.app` (Production)
- `https://rockops.vercel.app` (Production alternative)

**Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS

**Credentials**: Allowed (cookies, authorization headers)

---

## Integration Points

### 1. Procurement → Finance
- Offers require financial validation before PO
- `OfferFinancialReview` entity
- Finance can ACCEPT/REJECT offers
- PO creation triggers `PaymentRequest`

### 2. Procurement → Warehouse
- PO delivery creates warehouse `Items`
- `DeliverySession` → `DeliveryItemReceipt` → `Item`
- Item source tracking: `PURCHASE_ORDER`
- Source reference: PO number

### 3. Warehouse → Equipment
- Transaction system moves parts to equipment
- Creates `Consumable` records
- Equipment maintenance can request parts
- Transaction purpose: `MAINTENANCE`

### 4. Equipment → Maintenance
- Equipment status drives maintenance workflows
- `UNDER_MAINTENANCE` status required for maintenance
- Three maintenance systems:
  - InSiteMaintenance (equipment domain)
  - MaintenanceRecord (flexible multi-step)
  - DirectPurchaseTicket (4-step workflow)

### 5. HR → Payroll
- Attendance data frozen in payroll snapshots
- `PayrollAttendanceSnapshot` immutable copies
- Leave requests integrated with payroll
- Prevents backdated changes

### 6. Finance → All Domains
- Payment requests from procurement
- Payroll payment processing
- Equipment purchase tracking (FixedAssets)
- General ledger for all transactions

### 7. Notifications → All Domains
- Equipment transactions
- Procurement status changes
- Payroll stage completions
- Maintenance updates
- Finance approvals

---

## Development Patterns

### Backend Development Pattern

```
1. Entity (JPA)
   └─ Create in models/{domain}/

2. Repository (Data Access)
   └─ Extend JpaRepository in repositories/

3. Service (Business Logic)
   └─ Implement in services/{domain}/
   └─ Add error handling
   └─ Validation logic

4. Controller (REST API)
   └─ Create in controllers/{domain}/
   └─ Handle HTTP requests/responses

5. DTO (Data Transfer)
   └─ Create in dto/{domain}/
   └─ Separate from entities

6. Tests
   └─ Write in src/test/
```

### Frontend Development Pattern

```
1. API Config
   └─ Add endpoints to config/api.config.js

2. Service
   └─ Create service in services/{domain}Service.js
   └─ Add error handling

3. Component
   └─ Create in components/{domain}/
   └─ Use React hooks
   └─ Integrate SnackbarContext

4. Page
   └─ Create in pages/{domain}/
   └─ Use services (no direct API calls)
   └─ Handle loading states

5. Styles
   └─ Use existing or create in styles/
   └─ Follow kebab-case naming
```

### Multi-Developer Safety Rules

**Backend**:
1. Never modify existing entity fields without migration
2. Never change service method signatures
3. Create new methods instead of modifying existing
4. Maintain backward compatibility
5. Always write tests for new features

**Frontend**:
1. Never modify existing component interfaces
2. Never change existing service method signatures
3. Create new components instead of modifying shared ones
4. Use SnackbarContext for ALL user feedback
5. Never skip error handling

### Task Isolation Rules

**Domain Boundaries**:
- Working on equipment? Don't touch warehouse/, hr/, finance/
- Working on procurement? Don't modify payroll/, merchant/
- Working on HR? Don't change equipment/, warehouse/

**Exceptions**:
- Shared utilities (after team approval)
- Cross-domain features (with explicit requirements)
- Bug fixes affecting multiple domains

---

## Feature History

### Version 1.0 (Current)

**Initial Release** - 2026-01-16

**Core Features Implemented**:

1. **Equipment Management**
   - Equipment lifecycle tracking
   - Driver assignment with qualification
   - Consumable tracking
   - Work hour tracking (sarky logs)
   - Maintenance integration
   - Image storage (S3/MinIO)

2. **HR & Payroll**
   - Employee management
   - Attendance tracking
   - Leave management
   - Promotion workflow
   - Multi-contract payroll system
   - 6-stage payroll workflow
   - Data freezing mechanism

3. **Procurement**
   - Request order workflow
   - Offer management with timeline events
   - Finance validation
   - Purchase order creation
   - Delivery processing
   - Issue resolution

4. **Warehouse**
   - Multi-site inventory
   - Item tracking with source
   - Transaction system (bidirectional)
   - Batch matching
   - Resolution workflow

5. **Finance**
   - Accounts payable
   - General ledger
   - Balance management
   - Fixed assets
   - Payment requests

6. **Maintenance**
   - In-site maintenance
   - Maintenance records
   - Direct purchase 4-step workflow

7. **System Features**
   - JWT authentication
   - WebSocket notifications
   - Multi-site data isolation
   - Custom ID generation
   - Flyway migrations
   - File storage (S3/MinIO)

**Technical Achievements**:
- Fully layered architecture
- Complete audit trails
- Real-time notifications
- Multi-tenant support
- Comprehensive error handling
- Responsive UI

---

## Upcoming Features

*This section will be updated as new features are planned and implemented*

### Planned Enhancements

**Short-term**:
- [ ] Mobile app development
- [ ] Advanced reporting module
- [ ] Export functionality (Excel, PDF)
- [ ] Email notifications
- [ ] Dashboard customization

**Mid-term**:
- [ ] Predictive maintenance (ML)
- [ ] Advanced analytics
- [ ] Mobile-first UI redesign
- [ ] API documentation (Swagger)
- [ ] Performance optimization

**Long-term**:
- [ ] Multi-currency support
- [ ] Multi-language UI
- [ ] Third-party integrations
- [ ] Advanced workflow engine
- [ ] Blockchain for audit trails

---

## Development Notes

### Known Issues
*To be documented as they arise*

### Performance Considerations
- Lazy loading for large lists
- Pagination for all list endpoints
- WebSocket connection pooling
- Database indexing on foreign keys
- Query optimization for reports

### Best Practices
1. Always use service layer for API calls
2. Always use SnackbarContext for user feedback
3. Always handle errors gracefully
4. Always validate input on both frontend and backend
5. Always write migrations for schema changes
6. Always test cross-domain integrations
7. Always document new features in this file

---

## Change Log

### 2026-01-16 - Initial Knowledgebase Creation
- Documented complete system architecture
- Added all domain modules
- Documented critical workflows
- Added technical implementation details
- Created comprehensive reference document

### 2026-01-23 - Employee Number & Deduction Number System
**Backend Changes:**
- `EmployeeRepository.java` - Added `getMaxEmployeeNumberSequenceByYear()` native query for year-based employee number generation
- `HREmployeeService.java` - Added `generateEmployeeNumber(LocalDate hireDate)` method with format `EMP-YYYY-#####`
- `EmployeeDeductionRepository.java` - Added `getMaxDeductionNumberSequenceByTypeCode()` native query for type-based deduction numbers
- `EmployeeDeduction.java` - Updated `generateDeductionNumber(String typeCode, long sequenceNumber)` to use type code prefix
- `EmployeeResponseDTO.java` - Added `employeeNumber` field
- `EmployeeSummaryDTO.java` - Added `employeeNumber` field and updated `fromEntity()` mapper
- `EmployeeController.java` - Added `employeeNumber` to response map

**Frontend Changes:**
- `EmployeesList.jsx` - Added "Employee #" column with monospace styling
- `EmployeeDetails.jsx` - Updated subtitle to display employee number instead of UUID
- `EmployeesList.scss` - Added `.employee-number` styling (monospace font, primary color, badge styling)

**Database Migrations:**
- `V2026012306__Populate_employee_numbers.sql` - Populates existing employee numbers with format `EMP-YYYY-#####` based on hire year
- `V2026012307__Fix_deduction_numbers_format.sql` - Fixes existing `DED-XXXX` format to `<CODE>-XXXXXX` using deduction type codes
- `V2026012308__Fix_existing_employee_numbers_format.sql` - Additional migration for any remaining employee numbers

**Key Technical Details:**
- Employee numbers are year-partitioned (each year starts from 00001)
- Deduction numbers use the deduction type code as prefix (e.g., TAX, LOAN, INS)
- All migrations include backup tables for rollback capability
- Unique constraint on `employee_number` column ensures no duplicates

---

**End of Knowledgebase v1.0**

*This document should be updated with every significant feature addition, architectural change, or system enhancement.*
