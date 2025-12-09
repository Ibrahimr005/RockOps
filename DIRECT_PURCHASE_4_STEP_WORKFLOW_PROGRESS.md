# Direct Purchase 4-Step Workflow Redesign - Implementation Progress

**Last Updated:** 2025-12-03
**Status:** In Progress - Phase 2
**Database Migration:** ✅ Completed and Tested

---

## 📋 Implementation Overview

Redesigning Direct Purchase ticket system from 2-auto-generated-step model to a 4-step wizard workflow with enhanced data tracking, proper timeline visibility, and complete user interaction capabilities.

**4 Steps:**
1. **Creation** - Title, description, equipment, items (name + quantity), total expected cost
2. **Purchasing** - Merchant, item expected costs per unit, down payment
3. **Finalize Purchasing** - Actual costs per unit, calculated totals, remaining payment
4. **Transporting** - From/to locations, transport cost, responsible person (Contact OR Employee)

---

## ✅ Phase 1: Backend Foundation - COMPLETED

### Files Created:

1. **`backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseItem.java`**
   - New entity for individual items
   - Fields: itemName, quantity, expectedCostPerUnit, actualCostPerUnit
   - Calculated methods: getTotalExpectedCost(), getTotalActualCost(), getCostDifference()
   - Validation: hasExpectedCost(), hasActualCost(), isOverBudget()

2. **`backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseWorkflowStep.java`**
   - Enum: CREATION, PURCHASING, FINALIZE_PURCHASING, TRANSPORTING, COMPLETED

3. **`backend/src/main/java/com/example/backend/repositories/DirectPurchaseItemRepository.java`**
   - findByDirectPurchaseTicketId()
   - findItemsWithExpectedCostsById()
   - findItemsWithActualCostsById()
   - countByDirectPurchaseTicketId()
   - deleteByDirectPurchaseTicketId()

4. **`backend/src/main/java/com/example/backend/dtos/DirectPurchaseItemDto.java`**
   - DTO for item data transfer with validation

5. **`backend/src/main/java/com/example/backend/dtos/CreationStepDto.java`**
   - Step 1 DTO: title, description, equipmentId, responsibleUserId, items, totalExpectedCost

6. **`backend/src/main/java/com/example/backend/dtos/PurchasingStepDto.java`**
   - Step 2 DTO: merchantId, items (with expected costs), downPayment

7. **`backend/src/main/java/com/example/backend/dtos/FinalizePurchasingStepDto.java`**
   - Step 3 DTO: items (with actual costs), calculated totals, remaining payment

8. **`backend/src/main/java/com/example/backend/dtos/TransportingStepDto.java`**
   - Step 4 DTO: transportFromLocation, transportToSiteId, actualTransportationCost, responsible person (contact OR employee)

9. **`backend/src/main/resources/db/migration/V9__Add_4_step_workflow_to_direct_purchase_tickets.sql`**
   - Created direct_purchase_items table
   - Added 40+ new columns to direct_purchase_tickets
   - Marked ALL existing tickets as legacy (isLegacyTicket = true)
   - Added indexes and constraints
   - Migration TESTED and SUCCESSFUL ✅

### Files Modified:

1. **`backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseTicket.java`**
   - Added: title, isLegacyTicket, currentStep enum
   - Added: Step 1-4 timestamp fields (started/completed)
   - Added: Step 1-4 completion boolean flags
   - Added: downPayment, actualTotalPurchasingCost, remainingPayment
   - Added: transport fields (from, to, cost, responsible contact/employee)
   - Added: items collection (OneToMany with DirectPurchaseItem)
   - Added: 20+ helper methods for calculations, validation, workflow progression
   - Methods include: getTotalExpectedCost(), getTotalActualCost(), allItemsHaveExpectedCosts(), allItemsHaveActualCosts(), progressToNextStep(), getProgressPercentage(), getCompletedStepsCount()
   - Maintains backwards compatibility with legacy fields

2. **`backend/src/main/java/com/example/backend/dtos/DirectPurchaseTicketDetailsDto.java`**
   - Added all new workflow fields
   - Added step timestamps
   - Added items list
   - Added transport responsible person fields
   - Added progress tracking fields

---

## 🔄 Phase 2: Service Layer & API Endpoints - IN PROGRESS

### Current Task: Update DirectPurchaseTicketService

**Location:** `backend/src/main/java/com/example/backend/services/DirectPurchaseTicketService.java`

#### Tasks to Complete:

- [ ] Remove auto-step generation (delete/disable createAutoSteps() method at lines 297-331)
- [ ] Remove call to createAutoSteps() in createTicket() method (line 102)
- [ ] Update createTicket() to support new workflow (Step 1 only)
- [ ] Add createTicketStep1() method for new workflow
- [ ] Add updatePurchasingStep() method for Step 2
- [ ] Add updateFinalizePurchasingStep() method for Step 3
- [ ] Add updateTransportingStep() method for Step 4
- [ ] Add markLegacyTickets() helper method
- [ ] Update convertToDetailsDto() to include new fields
- [ ] Add convertItemToDto() helper method
- [ ] Add validation methods for each step
- [ ] Add cost calculation methods
- [ ] Update getTicketById() to load items
- [ ] Update updateTicket() to handle legacy vs new workflow

### Next Tasks:

1. **Update DirectPurchaseTicketController**
   - Add POST /api/direct-purchase-tickets/{id}/step-2 (purchasing)
   - Add PUT /api/direct-purchase-tickets/{id}/step-3 (finalize purchasing)
   - Add PUT /api/direct-purchase-tickets/{id}/step-4 (transporting)
   - Update existing endpoints to handle legacy vs new workflow

2. **Add DirectPurchaseItemService** (if needed)
   - CRUD operations for items
   - Item validation
   - Cost calculations

3. **Implement Timeline Tracking**
   - Create timeline entries for each step transition
   - Store who did what and when
   - Display timeline in UI

---

## 📝 Phase 3: Frontend Wizard Modal - PENDING

### Files to Create:

1. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/DirectPurchaseWizardModal.jsx`**
   - Main wizard component with 4 tabs
   - Visual stepper showing progress
   - Free navigation between steps
   - "Previous", "Next", "Save", "Complete Step" buttons
   - Auto-advance on step completion
   - Warning when editing completed steps
   - Permission checks

2. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/Step1Creation.jsx`**
   - Title input
   - Description textarea
   - Equipment dropdown
   - Total expected cost input
   - Items list with inline add/remove
   - Validation

3. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/Step2Purchasing.jsx`**
   - Merchant dropdown
   - Items table with expected cost per unit inputs
   - Add more items functionality
   - Down payment input
   - Show calculated total

4. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/Step3FinalizePurchasing.jsx`**
   - Items table with expected cost (read-only) and actual cost inputs
   - Real-time calculations display
   - Show: Actual Total, Down Payment, Remaining Payment

5. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/Step4Transporting.jsx`**
   - From location text input
   - To site dropdown (defaulted to equipment site)
   - Transportation cost input
   - Smart responsible person selector (contacts + employees)

6. **`frontend/src/components/maintenance/DirectPurchaseWizardModal/DirectPurchaseWizardModal.scss`**
   - Styling for wizard modal

### Files to Modify:

1. **`frontend/src/pages/maintenance/DirectPurchaseDetail/DirectPurchaseDetailView.jsx`**
   - Auto-open wizard modal when currentStep !== COMPLETED
   - Pass currentStep prop to wizard
   - Add timeline display component
   - Update cost summary for 4-step workflow
   - Show 4 steps with completion status
   - Remove old 2-step logic for new tickets
   - Keep 2-step display for legacy tickets

2. **`frontend/src/components/maintenance/MaintenanceCard/MaintenanceCard.jsx`**
   - Line 221: Change "Issue" to "Description" for direct purchase tickets
   - Add current step indicator
   - Show progress (X/4 steps completed)

3. **`frontend/src/pages/maintenance/MaintenanceRecords/MaintenanceRecords.jsx`**
   - Ensure proper display of "Description" not "Issue"
   - Show proper responsible person
   - Show 4-step progress

4. **`frontend/src/services/directPurchaseService.js`**
   - Add savePurchasingStep(ticketId, data) method
   - Add saveFinalizePurchasingStep(ticketId, data) method
   - Add saveTransportingStep(ticketId, data) method

---

## 🔧 Phase 4: Integration & Polish - PENDING

### Tasks:

1. **Timeline Display**
   - Create timeline component showing all step transitions
   - Display: ticket created, step starts/completions, assignments, cost updates

2. **Notifications**
   - Ticket created → creator, assigned user, managers
   - Each step completed → responsible person, managers
   - Cost exceeds expected → creator, managers
   - Ticket completed → all stakeholders
   - Step edited after completion → managers

3. **Permission Controls**
   - Any maintenance team: create, edit own incomplete tickets
   - Admin/Manager: edit any ticket, edit completed steps, delete, reassign

4. **Legacy Support**
   - Display legacy badge
   - Keep existing 2-step display for legacy tickets
   - Don't force migration

5. **Testing**
   - End-to-end workflow testing
   - Legacy ticket compatibility testing
   - Permission testing
   - Cost calculation validation
   - Timeline accuracy

---

## 📊 Implementation Statistics

- **Backend Files Created:** 9
- **Backend Files Modified:** 2
- **Database Tables Created:** 1 (direct_purchase_items)
- **Database Columns Added:** 40+
- **Frontend Files to Create:** ~10
- **Frontend Files to Modify:** ~5
- **Lines of Code Added:** ~2000+

---

## 🎯 Current Session Progress

**Session Start:** 2025-12-03
**Current Phase:** Phase 2 - Service Layer & API Endpoints
**Current Task:** Updating DirectPurchaseTicketService
**Next Task:** Update DirectPurchaseTicketController

---

## 🚀 How to Resume Work

If this session terminates, resume with:

```
Please continue the Direct Purchase 4-Step Workflow implementation.
Check the progress file: D:\RockOps\DIRECT_PURCHASE_4_STEP_WORKFLOW_PROGRESS.md

Current status: Phase 2 in progress - updating DirectPurchaseTicketService
Next task: [Check the "Current Task" section above]
```

---

## ⚠️ Important Notes

1. **Database Migration Successful:** V9 migration has been applied successfully
2. **All Existing Tickets Marked as Legacy:** No breaking changes to existing data
3. **Backwards Compatibility Maintained:** Legacy tickets continue working with 2-step workflow
4. **No Auto-Generation for New Tickets:** Must implement 4-step wizard
5. **Flexible Transport Assignment:** Can use Contact OR Employee (not User)
6. **Item-Level Cost Tracking:** Expected and actual costs tracked per item
7. **Title Field is New:** Separate from sparePart (which is now deprecated for new tickets)

---

## 📞 Key Design Decisions

1. **Legacy Flag Approach:** All existing tickets marked as legacy, new tickets use new workflow
2. **Items as Separate Entity:** Better data integrity and flexibility
3. **Transport Responsible Person:** Flexible - either Contact or Employee (with constraint)
4. **Step Timestamps:** Both start and completion times tracked for timeline
5. **Completion Flags:** Boolean flags for each step plus overall workflow step enum
6. **Cost Calculations:** Done in entity helper methods for consistency
7. **Title vs SparePart:** Title is general summary, sparePart deprecated for new tickets

---

## 📝 End of Progress Document

**This file will be updated continuously as implementation progresses.**
