# Direct Purchase Ticket Workflow - System Analysis

**Date:** December 3, 2025
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

The Direct Purchase ticket system has a **partially implemented 4-step workflow**. The backend entity and DTOs are ready, but the service layer and frontend are still using the **legacy 2-step auto-generation model**. This analysis identifies what exists, what's broken, and what needs to be implemented.

---

## Current System State

### ✅ What's Already Implemented (Backend)

#### 1. **DirectPurchaseTicket Entity** - FULLY READY
Location: `backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseTicket.java`

The entity has ALL fields needed for the 4-step workflow:
- **Workflow tracking:**
  - `currentStep` enum (CREATION, PURCHASING, FINALIZE_PURCHASING, TRANSPORTING, COMPLETED)
  - `isLegacyTicket` flag for backwards compatibility
  - Step completion flags and timestamps for all 4 steps

- **Step 1 - Creation fields:**
  - `title` (new field)
  - `description`
  - `step1StartedAt`, `step1CompletedAt`, `step1Completed`

- **Step 2 - Purchasing fields:**
  - `merchant` (already exists)
  - `downPayment`
  - `step2StartedAt`, `step2CompletedAt`, `step2Completed`

- **Step 3 - Finalize Purchasing fields:**
  - `actualTotalPurchasingCost`
  - `remainingPayment`
  - `step3StartedAt`, `step3CompletedAt`, `step3Completed`

- **Step 4 - Transporting fields:**
  - `transportFromLocation`
  - `transportToSite`
  - `actualTransportationCost`
  - `transportResponsibleContact` (merchant contact)
  - `transportResponsibleEmployee` (site employee)
  - `step4StartedAt`, `step4CompletedAt`, `step4Completed`

- **Helper methods:**
  - Cost calculations
  - Workflow progression
  - Step validation
  - Progress percentage calculations

#### 2. **DirectPurchaseItem Entity** - FULLY READY
Location: `backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseItem.java`

Already exists as a separate entity (NOT JSON) with:
- `itemName`, `quantity`
- `expectedCostPerUnit` (for Step 2)
- `actualCostPerUnit` (for Step 3)
- Calculated methods: `getTotalExpectedCost()`, `getTotalActualCost()`, `hasExpectedCost()`, `hasActualCost()`

#### 3. **DirectPurchaseWorkflowStep Enum** - READY
Location: `backend/src/main/java/com/example/backend/models/maintenance/DirectPurchaseWorkflowStep.java`

```java
public enum DirectPurchaseWorkflowStep {
    CREATION,           // Step 1
    PURCHASING,         // Step 2
    FINALIZE_PURCHASING, // Step 3
    TRANSPORTING,       // Step 4
    COMPLETED           // All done
}
```

#### 4. **DirectPurchaseTicketDetailsDto** - FULLY READY
Location: `backend/src/main/java/com/example/backend/dtos/DirectPurchaseTicketDetailsDto.java`

Already has all 4-step workflow fields ready to be populated.

#### 5. **DirectPurchaseItemDto** - READY
Location: `backend/src/main/java/com/example/backend/dtos/DirectPurchaseItemDto.java`

Complete with all necessary fields.

---

### ❌ What's Using Legacy 2-Step Model

#### 1. **DirectPurchaseTicketService** - NEEDS UPDATE
Location: `backend/src/main/java/com/example/backend/services/DirectPurchaseTicketService.java`

**Problem:** Line 102 - `createAutoSteps(savedTicket, responsibleUser);`

The service still auto-generates 2 legacy steps:
- Step 1: "Purchasing" (DirectPurchaseStep entity - OLD)
- Step 2: "Transporting" (DirectPurchaseStep entity - OLD)

These use the **old DirectPurchaseStep entity** (2-step model), not the new 4-step workflow fields.

**What needs to change:**
- Remove auto-generation of 2 steps
- Implement new service methods for each workflow step
- Populate the new 4-step workflow fields on the ticket entity

#### 2. **CreateDirectPurchaseTicketDto** - NEEDS UPDATE
Location: `backend/src/main/java/com/example/backend/dtos/CreateDirectPurchaseTicketDto.java`

**Problem:** Still using legacy fields:
- `sparePart` (should be items list)
- `expectedPartsCost` (should be calculated from items)
- `expectedTransportationCost` (should be in Step 4)
- No `title` field
- No `items` list

**What needs to change:**
Create new DTOs for each step:
- `CreateDirectPurchaseStep1Dto` (title, description, equipmentId, items with name+quantity)
- `UpdateDirectPurchaseStep2Dto` (merchantId, items with expectedCostPerUnit, downPayment)
- `UpdateDirectPurchaseStep3Dto` (items with actualCostPerUnit)
- `UpdateDirectPurchaseStep4Dto` (transportFromLocation, transportToSiteId, transportCost, responsiblePerson)

#### 3. **DirectPurchaseTicketController** - NEEDS NEW ENDPOINTS
Location: `backend/src/main/java/com/example/backend/controllers/DirectPurchaseTicketController.java`

**Problem:** No endpoints for the 4-step workflow

**What needs to be added:**
```java
POST   /api/direct-purchase-tickets               // Step 1: Create with basic info
PUT    /api/direct-purchase-tickets/{id}/step-2   // Step 2: Add purchasing info
PUT    /api/direct-purchase-tickets/{id}/step-3   // Step 3: Finalize purchasing
PUT    /api/direct-purchase-tickets/{id}/step-4   // Step 4: Add transport and complete
GET    /api/direct-purchase-tickets/{id}          // Get full details (already exists)
```

#### 4. **DirectPurchaseModalOLD.jsx** - NEEDS COMPLETE REDESIGN
Location: `frontend/src/pages/maintenance/MaintenanceRecords/DirectPurchaseModalOLD.jsx`

**Problem:** Still using legacy creation model with all fields at once

**What needs to change:**
- Replace with new `DirectPurchaseWizardModal.jsx`
- 4-step wizard interface
- Step-by-step navigation
- Free navigation between steps
- Auto-open on current step when incomplete
- Only show detail view when completed

#### 5. **DirectPurchaseDetailView.jsx** - NEEDS WIZARD INTEGRATION
Location: `frontend/src/pages/maintenance/DirectPurchaseDetail/DirectPurchaseDetailView.jsx`

**Problem:** Shows legacy 2-step display

**What needs to change:**
- Auto-open wizard modal when ticket is incomplete
- Show 4-step progress
- Display new 4-step timeline
- Show all cost breakdowns (expected per item, actual per item, down payment, remaining)
- Handle legacy tickets separately

#### 6. **MaintenanceCard.jsx** - TERMINOLOGY FIX NEEDED
Location: `frontend/src/components/maintenance/MaintenanceCard/MaintenanceCard.jsx`

**Problem:** Line 221 - Shows "Issue" for all ticket types

```jsx
<div className="info-label">Issue</div>
<div className="info-value">{record.initialIssueDescription}</div>
```

**Fix needed:**
```jsx
<div className="info-label">
    {record.ticketType === 'DIRECT_PURCHASE' ? 'Description' : 'Issue'}
</div>
<div className="info-value">{record.initialIssueDescription}</div>
```

---

## Problems Identified

### 1. ✅ Responsible User Not Being Recorded - FALSE ALARM
**Status:** Actually working correctly

The service DOES save responsible user (line 61-79 in DirectPurchaseTicketService.java):
- Defaults to current authenticated user if not provided
- Validates user has appropriate role
- Saves to `ticket.setResponsibleUser(responsibleUser)`

If it's not showing in the UI, the problem is likely in:
- The DTO mapping (check if responsibleUserId is being populated)
- The frontend display logic

### 2. ❌ Timeline Data Not Visible - CONFIRMED ISSUE
**Status:** Timeline not implemented

**Problem:** No timeline functionality exists for direct purchase tickets

**What needs to be implemented:**
- Timeline tracking for all step transitions
- Timeline entries for:
  - Ticket creation
  - Each step start/completion
  - Merchant selection
  - Items added/removed
  - Cost updates
  - Assignments
  - Step edits
- Timeline display component in DirectPurchaseDetailView

### 3. ❌ "Issue" vs "Description" Terminology - CONFIRMED BUG
**Status:** Bug in MaintenanceCard.jsx line 221

**Fix:** Change label based on ticket type

---

## Implementation Roadmap

### Phase 1: Backend - New Service Methods (Priority: HIGH)

**File:** `DirectPurchaseTicketService.java`

1. **Remove legacy auto-step generation**
   - Delete or disable `createAutoSteps()` method
   - Update `createTicket()` to NOT call it

2. **Implement Step 1: Creation**
```java
public DirectPurchaseTicketDetailsDto createTicketStep1(CreateStep1Dto dto) {
    // Create ticket with title, description, equipment, responsibleUser
    // Add items (name + quantity only)
    // Set step1StartedAt = now
    // Set currentStep = CREATION
    // Save and return
}

public DirectPurchaseTicketDetailsDto completeStep1(UUID ticketId) {
    // Validate: title, description, equipment, at least 1 item
    // Set step1Completed = true, step1CompletedAt = now
    // Progress to PURCHASING
    // Set step2StartedAt = now
    // Save and return
}
```

3. **Implement Step 2: Purchasing**
```java
public DirectPurchaseTicketDetailsDto updateStep2(UUID ticketId, UpdateStep2Dto dto) {
    // Set merchant
    // Update items with expectedCostPerUnit
    // Add new items if provided
    // Set downPayment
    // Calculate total expected cost
    // Save (don't complete yet)
}

public DirectPurchaseTicketDetailsDto completeStep2(UUID ticketId) {
    // Validate: merchant selected, all items have expectedCostPerUnit
    // Set step2Completed = true, step2CompletedAt = now
    // Progress to FINALIZE_PURCHASING
    // Set step3StartedAt = now
    // Save and return
}
```

4. **Implement Step 3: Finalize Purchasing**
```java
public DirectPurchaseTicketDetailsDto updateStep3(UUID ticketId, UpdateStep3Dto dto) {
    // Update items with actualCostPerUnit
    // Calculate actualTotalPurchasingCost
    // Calculate remainingPayment
    // Save (don't complete yet)
}

public DirectPurchaseTicketDetailsDto completeStep3(UUID ticketId) {
    // Validate: all items have actualCostPerUnit
    // Set step3Completed = true, step3CompletedAt = now
    // Progress to TRANSPORTING
    // Set step4StartedAt = now
    // Save and return
}
```

5. **Implement Step 4: Transporting**
```java
public DirectPurchaseTicketDetailsDto updateStep4(UUID ticketId, UpdateStep4Dto dto) {
    // Set transportFromLocation
    // Set transportToSite (default to equipment's site)
    // Set actualTransportationCost
    // Set transportResponsibleContact OR transportResponsibleEmployee
    // Save (don't complete yet)
}

public DirectPurchaseTicketDetailsDto completeStep4(UUID ticketId) {
    // Validate: from location, to site, transport cost, responsible person
    // Set step4Completed = true, step4CompletedAt = now
    // Set currentStep = COMPLETED
    // Set completedAt = now
    // Set status = COMPLETED
    // Send completion notification
    // Save and return
}
```

### Phase 2: Backend - New DTOs (Priority: HIGH)

Create new DTO files:

1. **CreateDirectPurchaseStep1Dto.java**
```java
- String title (required)
- String description (required)
- UUID equipmentId (required)
- UUID responsibleUserId (optional - defaults to current user)
- List<ItemBasicDto> items (name + quantity)
```

2. **UpdateDirectPurchaseStep2Dto.java**
```java
- UUID merchantId (required)
- List<ItemWithExpectedCostDto> items (with expectedCostPerUnit)
- BigDecimal downPayment (optional)
```

3. **UpdateDirectPurchaseStep3Dto.java**
```java
- List<ItemWithActualCostDto> items (with actualCostPerUnit)
```

4. **UpdateDirectPurchaseStep4Dto.java**
```java
- String transportFromLocation (required)
- UUID transportToSiteId (required)
- BigDecimal actualTransportationCost (required)
- UUID transportResponsibleContactId (optional)
- UUID transportResponsibleEmployeeId (optional)
```

### Phase 3: Backend - New Controller Endpoints (Priority: HIGH)

**File:** `DirectPurchaseTicketController.java`

Add new endpoints:
```java
@PostMapping("/step-1")
POST /api/direct-purchase-tickets/step-1

@PutMapping("/{id}/complete-step-1")
PUT /api/direct-purchase-tickets/{id}/complete-step-1

@PutMapping("/{id}/step-2")
PUT /api/direct-purchase-tickets/{id}/step-2

@PutMapping("/{id}/complete-step-2")
PUT /api/direct-purchase-tickets/{id}/complete-step-2

@PutMapping("/{id}/step-3")
PUT /api/direct-purchase-tickets/{id}/step-3

@PutMapping("/{id}/complete-step-3")
PUT /api/direct-purchase-tickets/{id}/complete-step-3

@PutMapping("/{id}/step-4")
PUT /api/direct-purchase-tickets/{id}/step-4

@PutMapping("/{id}/complete-step-4")
PUT /api/direct-purchase-tickets/{id}/complete-step-4
```

### Phase 4: Frontend - DirectPurchaseWizardModal Component (Priority: HIGH)

**New File:** `frontend/src/pages/maintenance/DirectPurchaseDetail/DirectPurchaseWizardModal.jsx`

**Structure:**
```jsx
<DirectPurchaseWizardModal
  isOpen={isOpen}
  ticketId={ticketId}
  currentStep={currentStep}
  onClose={onClose}
  onStepComplete={onStepComplete}
>
  <StepIndicator currentStep={1} totalSteps={4} />

  {currentStep === 1 && <Step1Creation />}
  {currentStep === 2 && <Step2Purchasing />}
  {currentStep === 3 && <Step3FinalizePurchasing />}
  {currentStep === 4 && <Step4Transporting />}

  <WizardNavigation
    onPrevious={goToPreviousStep}
    onNext={goToNextStep}
    onSave={saveCurrentStep}
    onComplete={completeCurrentStep}
  />
</DirectPurchaseWizardModal>
```

**Features:**
- Stepper UI showing 4 steps
- Free navigation (click any step)
- "Save" button (saves without completing)
- "Complete Step" button (validates, saves, advances)
- Warning when editing completed steps
- Permission checks (only Admin/Manager can edit completed)

### Phase 5: Frontend - Individual Step Components (Priority: HIGH)

#### **Step1CreationForm.jsx**
Fields:
- Title (text input)
- Description (textarea)
- Equipment (dropdown)
- Items (inline add/remove)
  - Item name
  - Quantity
  - Add/Remove buttons
- Total Expected Cost (calculated from items when they have costs in Step 2)

Validation:
- Title required
- Description required
- Equipment required
- At least 1 item with quantity > 0

#### **Step2PurchasingForm.jsx**
Fields:
- Merchant (dropdown)
- Items table (from Step 1):
  - Item name (read-only)
  - Quantity (read-only)
  - Expected cost per unit (input)
  - Total expected (calculated)
- Add more items (optional)
- Down payment (input)
- Total expected purchasing cost (calculated)

Validation:
- Merchant required
- Expected cost per unit for ALL items > 0

#### **Step3FinalizePurchasingForm.jsx**
Fields:
- Items table:
  - Item name (read-only)
  - Quantity (read-only)
  - Expected cost per unit (read-only, from Step 2)
  - Actual cost per unit (input)
  - Total actual (calculated)
- Actual total purchasing cost (calculated sum)
- Down payment (read-only, from Step 2)
- Remaining payment (calculated: actual - down)

Validation:
- Actual cost per unit for ALL items > 0

#### **Step4TransportingForm.jsx**
Fields:
- From location (text input)
- To site (dropdown, pre-populated with equipment's site)
- Transportation cost (number input)
- Responsible person selector:
  - Type: Contact or Employee (radio buttons)
  - If Contact: dropdown of merchant's contacts
  - If Employee: dropdown of site employees

Validation:
- From location required
- To site required
- Transportation cost >= 0
- Responsible person required (either contact or employee)

### Phase 6: Frontend - Update DirectPurchaseDetailView (Priority: MEDIUM)

**File:** `DirectPurchaseDetailView.jsx`

**Changes:**
1. Add logic to auto-open wizard modal:
```jsx
useEffect(() => {
  if (ticket && !ticket.isLegacyTicket && ticket.currentStep !== 'COMPLETED') {
    setWizardModalOpen(true);
  }
}, [ticket]);
```

2. Update display to show 4-step progress:
```jsx
{!ticket.isLegacyTicket && (
  <ProgressBar
    current={ticket.getCompletedStepsCount()}
    total={4}
  />
)}
```

3. Add timeline display (see Phase 7)

4. Show legacy badge for old tickets:
```jsx
{ticket.isLegacyTicket && <LegacyBadge />}
```

### Phase 7: Frontend - Timeline Implementation (Priority: MEDIUM)

**New Component:** `DirectPurchaseTimeline.jsx`

Display timeline events:
- Ticket created (createdAt)
- Step 1 completed (step1CompletedAt)
- Step 2 started (step2StartedAt)
- Merchant selected
- Items added/updated
- Step 2 completed (step2CompletedAt)
- Step 3 started (step3StartedAt)
- Actual costs entered
- Step 3 completed (step3CompletedAt)
- Step 4 started (step4StartedAt)
- Transport details added
- Step 4 completed / Ticket completed (completedAt)

**Note:** Backend needs to track these events (create a timeline/activity log table)

### Phase 8: Frontend - Fix MaintenanceCard Terminology (Priority: LOW)

**File:** `MaintenanceCard.jsx` line 221

**Change:**
```jsx
<div className="info-label">
  {record.ticketType === 'DIRECT_PURCHASE' ? 'Description' : 'Issue'}
</div>
<div className="info-value">{record.initialIssueDescription}</div>
```

### Phase 9: Legacy Ticket Migration (Priority: LOW)

**Strategy:**
- Existing tickets already have `isLegacyTicket = false` by default
- Need to mark all existing tickets as legacy:
```sql
UPDATE direct_purchase_tickets
SET is_legacy_ticket = true
WHERE created_at < '2025-12-03'  -- Before new workflow launch
AND is_legacy_ticket = false;
```

- Display legacy tickets with special badge
- Don't try to force them into 4-step workflow
- Keep showing 2 auto-generated steps for legacy tickets

---

## Testing Checklist

### Backend Testing
- [ ] Create Step 1 ticket successfully
- [ ] Complete Step 1 with validation
- [ ] Cannot complete Step 1 without required fields
- [ ] Update Step 2 with merchant and costs
- [ ] Complete Step 2 progresses to Step 3
- [ ] Update Step 3 with actual costs
- [ ] Remaining payment calculated correctly
- [ ] Complete Step 3 progresses to Step 4
- [ ] Update Step 4 with transport details
- [ ] Complete Step 4 marks ticket as COMPLETED
- [ ] Cannot skip steps
- [ ] Cost calculations are accurate
- [ ] Items cascade delete properly
- [ ] Legacy tickets still work

### Frontend Testing
- [ ] Wizard modal opens automatically for incomplete tickets
- [ ] Can navigate freely between steps
- [ ] Step 1: Can add/remove items
- [ ] Step 2: Merchant dropdown populates
- [ ] Step 2: Can enter expected costs per item
- [ ] Step 2: Total expected cost calculates correctly
- [ ] Step 3: Shows expected costs as read-only
- [ ] Step 3: Can enter actual costs
- [ ] Step 3: Remaining payment calculates correctly
- [ ] Step 4: To site defaults to equipment site
- [ ] Step 4: Can select contact OR employee
- [ ] Completing a step advances to next step
- [ ] Save button works without completing
- [ ] Warning shows when editing completed step
- [ ] Only Admin/Manager can edit completed steps
- [ ] Timeline shows all events
- [ ] MaintenanceCard shows "Description" not "Issue"
- [ ] Legacy tickets display correctly with badge
- [ ] Responsible user displays correctly

---

## File Structure Summary

### Backend Files to Modify
```
backend/src/main/java/com/example/backend/
├── controllers/
│   └── DirectPurchaseTicketController.java        [ADD NEW ENDPOINTS]
├── services/
│   └── DirectPurchaseTicketService.java           [ADD NEW METHODS, REMOVE AUTO-STEPS]
├── dtos/
│   ├── CreateDirectPurchaseStep1Dto.java          [NEW FILE]
│   ├── UpdateDirectPurchaseStep2Dto.java          [NEW FILE]
│   ├── UpdateDirectPurchaseStep3Dto.java          [NEW FILE]
│   └── UpdateDirectPurchaseStep4Dto.java          [NEW FILE]
└── models/
    └── maintenance/
        └── DirectPurchaseTicket.java               [ALREADY READY - NO CHANGES]
```

### Frontend Files to Modify/Create
```
frontend/src/
├── pages/maintenance/
│   ├── DirectPurchaseDetail/
│   │   ├── DirectPurchaseWizardModal.jsx          [NEW FILE]
│   │   ├── Step1CreationForm.jsx                  [NEW FILE]
│   │   ├── Step2PurchasingForm.jsx                [NEW FILE]
│   │   ├── Step3FinalizePurchasingForm.jsx        [NEW FILE]
│   │   ├── Step4TransportingForm.jsx              [NEW FILE]
│   │   ├── DirectPurchaseTimeline.jsx             [NEW FILE]
│   │   └── DirectPurchaseDetailView.jsx           [UPDATE]
│   └── MaintenanceRecords/
│       └── DirectPurchaseModalOLD.jsx                 [DEPRECATE - Use wizard instead]
├── components/maintenance/
│   └── MaintenanceCard/
│       └── MaintenanceCard.jsx                     [FIX LINE 221]
└── services/
    └── directPurchaseService.js                    [ADD NEW API CALLS]
```

---

## Key Design Decisions

### 1. Item Storage
✅ Already using separate entity (DirectPurchaseItem) - NO MIGRATION NEEDED

### 2. Step Navigation
✅ Free navigation - users can jump to any step
⚠️ Warning when editing completed steps
🔒 Permission check for editing completed steps

### 3. Legacy Tickets
✅ Keep existing tickets as-is with `isLegacyTicket = true`
✅ Display with special badge
✅ Don't force into new workflow

### 4. Responsible Person (Step 4 Transport)
✅ Can be either:
- Merchant Contact (from merchant's contacts)
- Site Employee (from destination site)
✅ Smart selector showing both options

### 5. Cost Calculations
✅ Backend calculates and validates
✅ Frontend shows real-time calculations
✅ Step 3 shows variance between expected and actual

---

## Next Steps

1. **Confirm with user:** Review this analysis and confirm approach
2. **Begin implementation:** Start with Phase 1 (backend service methods)
3. **Create DTOs:** Phase 2 (new request/response DTOs)
4. **Add endpoints:** Phase 3 (controller endpoints)
5. **Build wizard:** Phase 4 (wizard modal structure)
6. **Build step forms:** Phase 5 (individual step components)
7. **Update detail view:** Phase 6 (integrate wizard)
8. **Add timeline:** Phase 7 (timeline tracking and display)
9. **Fix terminology:** Phase 8 (MaintenanceCard fix)
10. **Test thoroughly:** Run through complete testing checklist

---

## Questions for User

1. ✅ Timeline tracking - do you have an existing activity log/timeline system we should integrate with?
2. ✅ Inline item addition - you mentioned this exists somewhere - where is it so we can reuse it?
3. ✅ Are there existing wizard/stepper components in your codebase we should use?
4. ✅ Should we completely remove the old DirectPurchaseModalOLD or keep it for reference?
5. ✅ Do you want to migrate existing tickets to new workflow or mark all as legacy?

---

**End of Analysis**
