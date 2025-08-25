# Equipment-Warehouse Transaction Testing Scenarios

This document outlines comprehensive test scenarios for the new batch-first transaction workflow between equipment and warehouses. These tests should be executed to ensure all possible transaction scenarios work correctly.

## 🎯 Test Overview

The new batch validation workflow supports 4 main scenarios:
1. **Not Found**: Batch number doesn't exist - create new transaction
2. **Incoming Validation**: Transaction exists and equipment can validate received items
3. **Already Validated**: Transaction is completed/validated - show warning
4. **Used by Other Entity**: Batch belongs to different equipment/entity - show error

## 📋 Test Categories

### A. Consumables Transactions (`CONSUMABLE` purpose)
### B. Maintenance Transactions (`MAINTENANCE` purpose)
### C. Edge Cases and Error Handling
### D. Warehouse-to-Warehouse Compatibility (should remain unaffected)

---

## 🧪 Test Scenarios

### **A. CONSUMABLES TRANSACTIONS**

#### **A1. Batch Not Found - Create New Transaction**

**Scenario**: User enters a batch number that doesn't exist in the system.

**Steps**:
1. Open Add Consumables modal
2. Enter batch number: `12345` (non-existent)
3. Click "Validate"
4. Select site and warehouse
5. Add items with valid quantities
6. Submit transaction

**Expected Results**:
- ✅ Shows "Batch available" message
- ✅ Site/warehouse selection appears
- ✅ Items load from selected warehouse
- ✅ Transaction creates successfully with purpose `CONSUMABLE`
- ✅ Equipment receives pending transaction
- ✅ Warehouse sees outgoing transaction

**Test Data**:
```javascript
{
  batchNumber: 12345,
  equipment: "test-equipment-001",
  warehouse: "test-warehouse-001",
  items: [
    { itemTypeId: "item-type-001", quantity: 5 },
    { itemTypeId: "item-type-002", quantity: 10 }
  ]
}
```

#### **A2. Incoming Transaction - Validate Items**

**Scenario**: Warehouse has sent items to equipment, equipment validates received quantities.

**Prerequisites**: 
- Warehouse creates transaction with batch `67890` to equipment
- Transaction status is `PENDING` or `DELIVERING`

**Steps**:
1. Open Add Consumables modal
2. Enter batch number: `67890`
3. Click "Validate" 
4. Enter received quantities for each item
5. Mark any missing items as "Not Received"
6. Submit validation

**Expected Results**:
- ✅ Shows "Incoming transaction found" message
- ✅ Displays expected vs received quantity fields
- ✅ Allows partial validation (some items not received)
- ✅ Transaction status updates to `ACCEPTED` or `PARTIALLY_ACCEPTED`
- ✅ Equipment inventory updates with received quantities
- ✅ Warehouse sees accepted transaction

**Test Data**:
```javascript
{
  batchNumber: 67890,
  transactionItems: [
    { 
      itemType: "Hydraulic Oil", 
      expected: 20, 
      received: 18, 
      notReceived: false 
    },
    { 
      itemType: "Filter", 
      expected: 5, 
      received: 0, 
      notReceived: true 
    }
  ]
}
```

#### **A3. Already Validated Transaction**

**Scenario**: User enters batch number of a completed transaction.

**Prerequisites**: 
- Transaction with batch `11111` exists with status `ACCEPTED`
- Transaction involves the same equipment

**Steps**:
1. Open Add Consumables modal
2. Enter batch number: `11111`
3. Click "Validate"

**Expected Results**:
- ⚠️ Shows warning: "Batch already used by validated transaction"
- ⚠️ Suggests checking transactions tab
- ❌ Cannot proceed with transaction creation
- ✅ Shows transaction summary for reference

#### **A4. Batch Used by Other Entity**

**Scenario**: User enters batch number used by different equipment/warehouse.

**Prerequisites**: 
- Transaction with batch `22222` exists between different entities
- Current equipment is not involved in that transaction

**Steps**:
1. Open Add Consumables modal
2. Enter batch number: `22222`
3. Click "Validate"

**Expected Results**:
- ❌ Shows error: "Batch used by another entity"
- ❌ Cannot proceed with transaction creation
- ✅ Prompts to choose different batch number

---

### **B. MAINTENANCE TRANSACTIONS**

#### **B1. Create Maintenance with New Transaction**

**Scenario**: Create maintenance record and add items via new transaction.

**Steps**:
1. Open Add Maintenance modal
2. Fill maintenance details (technician, type, date, description)
3. Submit maintenance form
4. In transaction workflow: Enter new batch number `33333`
5. Click "Validate" 
6. Select warehouse and add items
7. Submit transaction

**Expected Results**:
- ✅ Maintenance record created successfully
- ✅ Transaction workflow appears automatically
- ✅ Transaction created with purpose `MAINTENANCE`
- ✅ Transaction linked to maintenance record
- ✅ Equipment receives pending transaction for maintenance

**Test Data**:
```javascript
{
  maintenance: {
    technicianId: "tech-001",
    maintenanceTypeId: "type-001",
    description: "Engine oil change",
    status: "IN_PROGRESS"
  },
  transaction: {
    batchNumber: 33333,
    items: [
      { itemTypeId: "engine-oil", quantity: 10 },
      { itemTypeId: "oil-filter", quantity: 2 }
    ]
  }
}
```

#### **B2. Maintenance with Incoming Transaction Validation**

**Scenario**: Link existing incoming transaction to maintenance record.

**Prerequisites**: 
- Maintenance record exists or being created
- Incoming transaction with batch `44444` exists for equipment

**Steps**:
1. Create/edit maintenance record
2. In transaction workflow: Enter batch number `44444`
3. Click "Validate"
4. Validate received quantities
5. Submit validation

**Expected Results**:
- ✅ Maintenance record updated/created
- ✅ Incoming transaction validated
- ✅ Transaction linked to maintenance record
- ✅ Maintenance shows linked transaction
- ✅ Transaction history reflects maintenance linkage

#### **B3. Maintenance Without Transaction**

**Scenario**: Create maintenance record without adding items.

**Steps**:
1. Open Add Maintenance modal
2. Fill maintenance details
3. Submit maintenance form
4. In transaction workflow: Click "Skip - No Items Needed"

**Expected Results**:
- ✅ Maintenance record created successfully
- ✅ No transaction created
- ✅ Modal closes properly
- ✅ Maintenance appears in list without linked transaction

---

### **C. EDGE CASES AND ERROR HANDLING**

#### **C1. Quantity Validation**

**Test Cases**:
- **Excess Quantity**: Request more items than available in warehouse
- **Zero Quantity**: Try to request 0 items
- **Negative Quantity**: Try to request negative items
- **Invalid Quantity**: Enter non-numeric values

**Expected Results**:
- ❌ Shows specific error messages
- ❌ Prevents form submission
- ✅ Highlights invalid fields
- ✅ Shows available quantities in dropdown

#### **C2. Permission Errors**

**Test Cases**:
- **403 Warehouse Access**: User doesn't have access to selected warehouse
- **403 Transaction Creation**: User can't create transactions
- **403 Validation**: User can't validate transactions

**Expected Results**:
- ❌ Shows clear permission error messages
- ❌ Suggests contacting administrator
- ✅ Handles errors gracefully without crashes

#### **C3. Network and Server Errors**

**Test Cases**:
- **500 Server Error**: Backend server issues
- **404 Not Found**: Warehouse/equipment not found
- **Timeout**: Request takes too long
- **Connection Lost**: Network disconnection

**Expected Results**:
- ❌ Shows user-friendly error messages
- ✅ Provides retry options where appropriate
- ✅ Maintains form data during errors
- ✅ Graceful degradation of functionality

#### **C4. Multiple Items Edge Cases**

**Test Cases**:
- **Duplicate Items**: Select same item type twice
- **Empty Items**: Leave item fields empty
- **Mixed Availability**: Some items available, others not
- **Large Item Lists**: Add many items (10+)

**Expected Results**:
- ❌ Prevents duplicate item selection
- ❌ Validates all required fields
- ⚠️ Shows warnings for unavailable items
- ✅ Handles large lists efficiently

#### **C5. Date and Time Validation**

**Test Cases**:
- **Past Dates**: Set transaction date in the past
- **Future Dates**: Set transaction date far in future
- **Invalid Formats**: Enter malformed dates
- **Timezone Issues**: Different timezone handling

**Expected Results**:
- ⚠️ Shows warnings for unusual dates
- ✅ Accepts reasonable date ranges
- ❌ Validates date formats
- ✅ Handles timezone correctly

---

### **D. WAREHOUSE-TO-WAREHOUSE COMPATIBILITY**

> **CRITICAL**: These tests ensure existing warehouse functionality remains unaffected.

#### **D1. Direct Warehouse Transaction Creation**

**Scenario**: Create transaction between two warehouses (existing functionality).

**Steps**:
1. Go to Warehouse A transaction page
2. Create transaction to Warehouse B
3. Use existing workflow (not batch-first)
4. Complete transaction

**Expected Results**:
- ✅ Original workflow still works
- ✅ No batch validation interference
- ✅ Transaction creates normally
- ✅ Purpose remains `GENERAL`

#### **D2. Warehouse Transaction Validation**

**Scenario**: Validate incoming warehouse-to-warehouse transaction.

**Steps**:
1. Go to Warehouse B transaction page
2. View incoming transaction from Warehouse A
3. Validate using existing workflow
4. Complete validation

**Expected Results**:
- ✅ Original validation workflow works
- ✅ No equipment-specific interference
- ✅ Transaction completes normally
- ✅ Inventory updates correctly

#### **D3. Mixed Transaction Types**

**Scenario**: System handling multiple transaction types simultaneously.

**Test Setup**:
- Equipment-Warehouse transactions (new workflow)
- Warehouse-Warehouse transactions (existing workflow)
- Multiple users in different roles

**Expected Results**:
- ✅ Both workflows coexist without conflicts
- ✅ Batch validation only applies to equipment transactions
- ✅ Role-based access remains functional
- ✅ No cross-contamination of features

---

## 🔧 Test Execution Guidelines

### Pre-Test Setup

1. **Database State**: Ensure clean test data
2. **User Permissions**: Test with different role levels
3. **Sample Data**: Create test warehouses, equipment, items
4. **Network Conditions**: Test on stable and unstable connections

### Execution Order

1. **Basic Happy Path**: A1, B1 (ensure core functionality works)
2. **Validation Scenarios**: A2, B2 (test incoming transaction handling)
3. **Error Scenarios**: A3, A4 (test warning/error cases)
4. **Edge Cases**: All C scenarios (test system robustness)
5. **Compatibility**: All D scenarios (ensure no regressions)

### Success Criteria

- **Functionality**: All scenarios pass as expected
- **UX Consistency**: Error messages are clear and helpful
- **Performance**: Response times remain acceptable
- **Data Integrity**: No data corruption or inconsistencies
- **Backward Compatibility**: Existing features unaffected

### Failure Response

If any test fails:
1. **Document** the exact failure scenario
2. **Capture** error messages and logs
3. **Identify** if it's a frontend or backend issue
4. **Prioritize** based on severity and user impact
5. **Fix** and re-test all related scenarios

---

## 📊 Test Results Template

```markdown
## Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Dev/Staging/Prod]

### Results Summary
- ✅ Passed: X/Y scenarios
- ❌ Failed: X/Y scenarios
- ⚠️ Partial: X/Y scenarios

### Failed Scenarios
1. **Scenario ID**: [e.g., A1]
   - **Error**: [Description]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Priority**: [High/Medium/Low]

### Recommendations
- [List of recommended fixes]
- [Suggested improvements]
- [Additional test cases needed]
```

---

## 🚀 Automation Potential

These scenarios can be automated using:
- **Frontend**: Cypress or Playwright for UI testing
- **Backend**: Jest or similar for API testing
- **Integration**: Full stack testing with real data flows

Priority for automation:
1. **High**: A1, A2, B1 (core happy paths)
2. **Medium**: A3, A4, B2, B3 (standard error cases)
3. **Low**: C scenarios (edge cases)
4. **Critical**: D scenarios (regression prevention)

This comprehensive testing ensures the new batch validation workflow works correctly while maintaining existing functionality.