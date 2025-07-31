# Equipment-Warehouse Transaction Test Scenarios

## 🎯 **Complete Scenario Coverage**

This document outlines ALL possible real-world scenarios for Equipment-Warehouse transactions that are tested in `EquipmentWarehouseTransactionRealWorldTest.java`.

---

## 📋 **Transaction Rules & Constraints**

### **Flow Direction**
- **Items ONLY flow**: Warehouse → Equipment
- **Equipment consumes items immediately** (no inventory storage)
- **Two initiator types**: Warehouse team vs Equipment team

### **Purpose Setting Logic**
- **Warehouse creates transaction**: Always starts with `GENERAL` purpose (warehouse doesn't know equipment's intent)
- **Equipment validates transaction**: Equipment sets the actual purpose during validation
  - `CONSUMABLE`: For regular consumption
  - `MAINTENANCE`: When linking to InSiteMaintenance record

### **Inventory Truth**
- **Equipment team's word is final**: Consumables reflect what equipment reports receiving
- **Rejection doesn't prevent consumption**: Even `REJECTED` transactions create consumables based on equipment's reported quantities

### **Transaction Outcomes**
- **ACCEPTED**: Perfect match between sent and received quantities
- **REJECTED**: Any mismatch, missing items, or issues
- **Individual item tracking**: Each item in multi-item transactions has its own status

---

## 🏭 **SCENARIO 1: Warehouse-Initiated CONSUMABLE Transactions**

### **Real-World Context**
- Warehouse team proactively sends consumables to equipment
- "We have excess inventory, let's distribute it"
- "Equipment will need these supplies, let's send them"

### **Test Scenarios**

#### **1.1: Perfect Match Delivery** ✅
- **Setup**: Warehouse sends 50 bolts
- **Reality**: Equipment receives exactly 50 bolts
- **Result**: `ACCEPTED` → Consumables created for equipment
- **Business Impact**: Smooth operations, inventory moved efficiently

#### **1.2: Quantity Mismatch** ❌
- **Setup**: Warehouse claims to send 75L oil
- **Reality**: Equipment receives only 60L oil
- **Result**: `REJECTED` → No consumables created
- **Business Impact**: Inventory discrepancy investigation needed

#### **1.3: Items Never Received** ❌
- **Setup**: Warehouse claims to send 25 filters
- **Reality**: Equipment never receives anything
- **Result**: `REJECTED` → Items marked as "not sent/received"
- **Business Impact**: Logistics failure, need to investigate transport

#### **1.4: Mixed Results (Multi-Item)** ⚠️
- **Setup**: Warehouse sends bolts + oil + filters
- **Reality**: 
  - Bolts: Perfect match ✅
  - Oil: Quantity mismatch ❌
  - Filters: Never received ❌
- **Result**: Overall `REJECTED`, but accepted items still consumed
- **Business Impact**: Partial success, need to resolve failed items

---

## 🚜 **SCENARIO 2: Equipment-Initiated CONSUMABLE Transactions**

### **Real-World Context**
- Equipment team requests specific consumables
- "We're running low on supplies, need replenishment"
- "Planning work requires specific materials"

### **Test Scenarios**

#### **2.1: Perfect Request Fulfillment** ✅
- **Setup**: Equipment requests 40 bolts
- **Reality**: Warehouse delivers exactly 40 bolts
- **Result**: `ACCEPTED` → Equipment gets what they needed
- **Business Impact**: Efficient request-fulfillment process

#### **2.2: Warehouse Delivers Wrong Quantity** ❌
- **Setup**: Equipment requests 60L oil
- **Reality**: Warehouse delivers only 45L oil
- **Result**: `REJECTED` → Equipment needs remain unmet
- **Business Impact**: Work delays, need to request remaining quantity

---

## 🔧 **SCENARIO 3: InSiteMaintenance Workflow (Corrected)**

### **Real-World Context**
- Equipment team creates InSiteMaintenance record first
- Warehouse may have already sent supplies (not knowing purpose)
- Equipment links supplies to maintenance during validation

### **Correct Workflow**
1. **Equipment creates InSiteMaintenance record**
2. **Warehouse sends supplies** (purpose = `GENERAL`)
3. **Equipment validates and links** (purpose changed to `MAINTENANCE`)

### **Test Scenarios**

#### **3.1: Correct InSiteMaintenance Workflow** ✅
- **Step 1**: Equipment creates maintenance record for hydraulic service
- **Step 2**: Warehouse had sent oil + filters (purpose = `GENERAL`)
- **Step 3**: Equipment validates, links to maintenance (purpose = `MAINTENANCE`)
- **Result**: `ACCEPTED` → Supplies properly linked to InSiteMaintenance
- **Business Impact**: Clear maintenance supply chain tracking

---

## 🚨 **SCENARIO 4: Equipment-Initiated MAINTENANCE Transactions**

### **Real-World Context**
- Equipment team requests maintenance-specific supplies
- "We have breakdown, need emergency repair parts"
- "Planned maintenance requires specific components"

### **Test Scenarios**

#### **4.1: Emergency Maintenance Request** 🚨
- **Setup**: Equipment breakdown requires urgent hydraulic repair
- **Reality**: Equipment requests oil + bolts for emergency repair
- **Result**: `ACCEPTED` → Emergency supplies delivered quickly
- **Business Impact**: Minimized downtime, quick response to emergencies

---

## ⚠️ **EDGE CASES & COMPLEX SCENARIOS**

### **Batch Number Management**

#### **Edge Case 1: Batch Number Collision** 🚫
- **Setup**: Two teams try to use same batch number simultaneously
- **Reality**: System detects collision before second transaction
- **Result**: Second transaction blocked with validation error
- **Business Impact**: Prevents data corruption and confusion

#### **Edge Case 2: Cross-Entity Batch Validation** 🔍
- **Setup**: Batch number used by one equipment, another tries to use it
- **Reality**: System recognizes batch belongs to different entity
- **Result**: "used_by_other_entity" validation response
- **Business Impact**: Clear messaging about batch ownership

### **Multi-Item Transaction Complexity**

#### **Complex Scenario: Partial Success Handling** 📊
- **Multiple items with different outcomes**:
  - Item A: Perfect match → `ACCEPTED`
  - Item B: Quantity mismatch → `REJECTED`
  - Item C: Never received → `REJECTED`
- **Overall transaction**: `REJECTED`
- **Individual tracking**: Each item has specific status and reason
- **Business Impact**: Granular tracking enables precise issue resolution

---

## 🎭 **Team Interaction Patterns**

### **Warehouse Team Perspective**
```
"We need to distribute inventory efficiently"
"Equipment will need these for upcoming work"
"Let's prepare maintenance supplies in advance"
"Emergency request came in, respond quickly"
```

### **Equipment Team Perspective**
```
"We're running low on consumables"
"Planned maintenance needs specific parts"
"Emergency breakdown, need parts NOW"
"Did we receive everything that was sent?"
```

---

## 📊 **Test Coverage Matrix**

| **Initiator** | **Purpose** | **Outcome** | **Scenario** | **Test** |
|---------------|-------------|-------------|--------------|----------|
| Warehouse | CONSUMABLE | ACCEPTED | Perfect Match | ✅ 1.1 |
| Warehouse | CONSUMABLE | REJECTED | Quantity Mismatch | ✅ 1.2 |
| Warehouse | CONSUMABLE | REJECTED | Never Received | ✅ 1.3 |
| Warehouse | CONSUMABLE | REJECTED | Mixed Results | ✅ 1.4 |
| Equipment | CONSUMABLE | ACCEPTED | Perfect Fulfillment | ✅ 2.1 |
| Equipment | CONSUMABLE | REJECTED | Wrong Quantity | ✅ 2.2 |
| Warehouse | MAINTENANCE | ACCEPTED | Perfect Delivery | ✅ 3.1 |
| Equipment | MAINTENANCE | ACCEPTED | Emergency Request | ✅ 4.1 |
| Any | Any | ERROR | Batch Collision | ✅ Edge 1 |
| Any | Any | VALIDATION | Cross-Entity | ✅ Edge 2 |

---

## 🎯 **Business Value of Comprehensive Testing**

### **Operational Reliability**
- **Inventory Accuracy**: Ensures actual vs recorded quantities match
- **Process Transparency**: Clear audit trail for all transactions
- **Error Prevention**: Catches issues before they impact operations

### **Team Coordination**
- **Clear Communication**: Both teams know transaction status
- **Responsibility Tracking**: Who initiated, who approved, when
- **Issue Resolution**: Specific reasons for any failures

### **Maintenance Integration**
- **Supply Chain Coordination**: Maintenance and inventory aligned
- **Emergency Response**: Quick supply delivery for breakdowns
- **Planning Support**: Proactive maintenance supply preparation

### **System Integrity**
- **Data Consistency**: Batch numbers prevent conflicts
- **Audit Compliance**: Complete transaction history
- **Error Handling**: Graceful failure with clear error messages

---

## 🚀 **Running the Tests**

```bash
cd backend
mvn test -Dtest=EquipmentWarehouseTransactionRealWorldTest
```

**Expected Results**: All scenarios should pass, confirming your backend can handle every possible equipment-warehouse transaction situation in the real world.