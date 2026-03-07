package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus;
import com.example.backend.models.procurement.*;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.warehouse.*;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.warehouse.ItemTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryProcessingService {

    private final DeliverySessionRepository deliverySessionRepository;
    private final DeliveryItemReceiptRepository deliveryItemReceiptRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PurchaseOrderIssueRepository purchaseOrderIssueRepository;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemTypeService itemTypeService;
    private final PurchaseOrderService purchaseOrderService;
    private final EquipmentRepository equipmentRepository;


    @Transactional
    public DeliverySessionDTO processDelivery(ProcessDeliveryRequest request) {
        try {
            System.out.println("=== DELIVERY PROCESSING START ===");
            System.out.println("PO ID: " + request.getPurchaseOrderId());
            System.out.println("Processed by: " + request.getProcessedBy());

            PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                    .orElseThrow(() -> new RuntimeException("PO not found"));
            System.out.println("✅ Found PO: " + po.getPoNumber());

            System.out.println("Creating DeliverySession...");
            DeliverySession session = DeliverySession.builder()
                    .purchaseOrder(po)
                    .merchant(po.getPurchaseOrderItems().get(0).getMerchant())
                    .processedBy(request.getProcessedBy())
                    .processedAt(LocalDateTime.now())
                    .deliveryNotes(request.getDeliveryNotes())
                    .itemReceipts(new ArrayList<>())
                    .build();
            System.out.println("✅ DeliverySession created");

            System.out.println("Processing " + request.getItemReceipts().size() + " item receipts...");
            for (int i = 0; i < request.getItemReceipts().size(); i++) {
                ProcessItemReceiptRequest itemRequest = request.getItemReceipts().get(i);
                System.out.println("\n--- Item Receipt #" + (i+1) + " ---");
                System.out.println("PO Item ID: " + itemRequest.getPurchaseOrderItemId());
                System.out.println("Good Qty: " + itemRequest.getGoodQuantity());
                System.out.println("Is Redelivery: " + itemRequest.getIsRedelivery());

                PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemRequest.getPurchaseOrderItemId())
                        .orElseThrow(() -> new RuntimeException("PO Item not found"));
                System.out.println("✅ Found PO Item: " + poItem.getItemType().getName());

                System.out.println("Building DeliveryItemReceipt...");
                DeliveryItemReceipt receipt;
                try {
                    receipt = DeliveryItemReceipt.builder()
                            .deliverySession(session)
                            .purchaseOrderItem(poItem)
                            .goodQuantity(itemRequest.getGoodQuantity())
                            .isRedelivery(itemRequest.getIsRedelivery())
                            .issues(new ArrayList<>())
                            .build();
                    System.out.println("✅ DeliveryItemReceipt built");
                } catch (Exception e) {
                    System.err.println("❌ FAILED to build DeliveryItemReceipt:");
                    e.printStackTrace();
                    throw e;
                }

                System.out.println("Adding receipt to poItem.itemReceipts...");
                try {
                    if (poItem.getItemReceipts() == null) {
                        poItem.setItemReceipts(new ArrayList<>());
                    }
                    poItem.getItemReceipts().add(receipt);
                    System.out.println("✅ Added to poItem");
                } catch (Exception e) {
                    System.err.println("❌ FAILED to add receipt to poItem:");
                    e.printStackTrace();
                    throw e;
                }

                if (itemRequest.getIssues() != null && !itemRequest.getIssues().isEmpty()) {
                    System.out.println("Processing " + itemRequest.getIssues().size() + " issues...");
                    for (CreateIssueRequest issueRequest : itemRequest.getIssues()) {
                        PurchaseOrderIssue issue = PurchaseOrderIssue.builder()
                                .purchaseOrder(po)
                                .purchaseOrderItem(poItem)
                                .deliveryItemReceipt(receipt)
                                .issueType(issueRequest.getIssueType())
                                .issueStatus(IssueStatus.REPORTED)
                                .affectedQuantity(issueRequest.getAffectedQuantity())
                                .reportedBy(request.getProcessedBy())
                                .reportedAt(LocalDateTime.now())
                                .issueDescription(issueRequest.getIssueDescription())
                                .build();
                        receipt.getIssues().add(issue);
                    }
                    System.out.println("✅ Issues added");
                }

                session.getItemReceipts().add(receipt);
                System.out.println("✅ Receipt added to session");
            }

            System.out.println("\nSaving delivery session...");
            deliverySessionRepository.save(session);
            System.out.println("✅ Session saved");

            System.out.println("Creating warehouse items...");
            createWarehouseItems(session);
            System.out.println("✅ Warehouse items created");

            System.out.println("Updating item statuses...");
            updateItemStatuses(po);
            System.out.println("✅ Item statuses updated");

            System.out.println("Updating PO status...");
            updatePOStatus(po);
            System.out.println("✅ PO status updated");

            System.out.println("Saving PO...");
            purchaseOrderRepository.save(po);
            System.out.println("✅ PO saved");

            System.out.println("Converting to DTO...");
            DeliverySessionDTO dto = convertToDTO(session);
            System.out.println("✅ DTO created");

            System.out.println("=== DELIVERY PROCESSING COMPLETE ===\n");
            return dto;

        } catch (Exception e) {
            System.err.println("\n❌❌❌ DELIVERY PROCESSING FAILED ❌❌❌");
            System.err.println("Error: " + e.getMessage());
            System.err.println("Full stack trace:");
            e.printStackTrace();
            throw e;
        }
    }

    private void updateItemStatuses(PurchaseOrder po) {
        for (PurchaseOrderItem item : po.getPurchaseOrderItems()) {
            double totalGood = item.getItemReceipts().stream()
                    .mapToDouble(DeliveryItemReceipt::getGoodQuantity)
                    .sum();

            // Only count issues that are NOT pending redelivery
            double closedIssues = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.RESOLVED &&
                            i.getResolutionType() != PurchaseOrderResolutionType.REDELIVERY)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            // Unresolved issues still count as processed (waiting for resolution)
            double unresolvedIssuesQty = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.REPORTED ||
                            i.getIssueStatus() == IssueStatus.IN_PROGRESS)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            long unresolvedIssuesCount = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.REPORTED ||
                            i.getIssueStatus() == IssueStatus.IN_PROGRESS)
                    .count();

            // Check if there are pending redeliveries that haven't been received yet
            double pendingRedeliveryQty = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getResolutionType() == PurchaseOrderResolutionType.REDELIVERY &&
                            i.getIssueStatus() == IssueStatus.RESOLVED)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            // Calculate how much was actually redelivered
            double redeliveredQty = item.getItemReceipts().stream()
                    .filter(DeliveryItemReceipt::getIsRedelivery)
                    .mapToDouble(DeliveryItemReceipt::getGoodQuantity)
                    .sum();

            // The actual pending redelivery is what's promised minus what's been received
            double actualPendingRedelivery = pendingRedeliveryQty - redeliveredQty;

            // Determine status
            if (unresolvedIssuesCount > 0) {
                item.setStatus("DISPUTED");
            } else if (actualPendingRedelivery > 0) {  // FIXED: Check if redelivery is still pending
                item.setStatus("PENDING");
            } else if (totalGood + closedIssues >= item.getQuantity()) {
                item.setStatus("COMPLETED");
            } else if (totalGood + closedIssues > 0) {
                item.setStatus("PARTIAL");
            } else {
                item.setStatus("PENDING");
            }
        }
    }

    private void updatePOStatus(PurchaseOrder po) {
        // Delegate to PurchaseOrderService for unified logic
        purchaseOrderService.updatePurchaseOrderStatusComplete(po.getId());
    }

    private DeliverySessionDTO convertToDTO(DeliverySession session) {
        return DeliverySessionDTO.builder()
                .id(session.getId())
                .purchaseOrderId(session.getPurchaseOrder().getId())
                .merchantId(session.getMerchant().getId())
                .merchantName(session.getMerchant().getName())
                .processedBy(session.getProcessedBy())
                .processedAt(session.getProcessedAt())
                .deliveryNotes(session.getDeliveryNotes())
                .build();
    }


    private void createWarehouseItems(DeliverySession session) {
        System.out.println("🔍 Starting createWarehouseItems for PO: " + session.getPurchaseOrder().getPoNumber());

        // Get the warehouse from the Request Order
        RequestOrder requestOrder = session.getPurchaseOrder().getRequestOrder();

        if (requestOrder == null) {
            throw new RuntimeException("Request Order not found for PO: " + session.getPurchaseOrder().getPoNumber());
        }

        if (!"WAREHOUSE".equals(requestOrder.getPartyType())) {
            throw new RuntimeException("Request Order is not from a warehouse. Party type: " + requestOrder.getPartyType());
        }

        UUID warehouseId = requestOrder.getRequesterId();
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with ID: " + warehouseId));

        System.out.println("📦 Target warehouse: " + warehouse.getName() + " (ID: " + warehouse.getId() + ")");

        for (DeliveryItemReceipt receipt : session.getItemReceipts()) {
            double goodQuantity = receipt.getGoodQuantity();

            System.out.println("  Item: " + receipt.getPurchaseOrderItem().getItemType().getName());
            System.out.println("  Good quantity: " + goodQuantity);

            if (goodQuantity > 0) {
                Double unitPrice = receipt.getPurchaseOrderItem().getUnitPrice();

                Item item = Item.builder()
                        .itemType(receipt.getPurchaseOrderItem().getItemType())
                        .warehouse(warehouse)
                        .quantity((int) goodQuantity)
                        .unitPrice(unitPrice)
                        .itemStatus(ItemStatus.IN_WAREHOUSE)
                        .itemSource(ItemSource.PURCHASE_ORDER)
                        .sourceReference(session.getPurchaseOrder().getPoNumber())
                        .merchantName(receipt.getPurchaseOrderItem().getMerchant() != null
                                ? receipt.getPurchaseOrderItem().getMerchant().getName()
                                : null)
                        .createdAt(LocalDateTime.now())
                        .createdBy(session.getProcessedBy())
                        .resolved(false)
                        .transactionItem(null)
                        .comment("Received via PO " + session.getPurchaseOrder().getPoNumber())
                        .build();

                if (unitPrice != null) {
                    item.calculateTotalValue();
                }

                Item savedItem = itemRepository.save(item);
                System.out.println("  ✅ Saved item ID: " + savedItem.getId() +
                        " - Quantity: " + savedItem.getQuantity() +
                        " @ " + unitPrice + " EGP = " + savedItem.getTotalValue() + " EGP");
            } else {
                System.out.println("  ⚠️ Skipping item - good quantity is 0");
            }
        }

        System.out.println("✅ createWarehouseItems completed for warehouse: " + warehouse.getName());
    }

    @Transactional
    public List<Equipment> processEquipmentDelivery(UUID purchaseOrderId, EquipmentReceiptRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        RequestOrder ro = po.getRequestOrder();
        if (ro == null || !"EQUIPMENT".equals(ro.getPartyType())) {
            throw new RuntimeException("This purchase order is not an equipment order");
        }

        // Create delivery session
        DeliverySession session = DeliverySession.builder()
                .purchaseOrder(po)
                .merchant(po.getPurchaseOrderItems().get(0).getMerchant())
                .processedBy(request.getProcessedBy())
                .processedAt(LocalDateTime.now())
                .deliveryNotes(request.getDeliveryNotes())
                .itemReceipts(new ArrayList<>())
                .build();

        List<Equipment> createdEquipment = new ArrayList<>();

        for (EquipmentReceiptRequest.EquipmentReceiptData itemData : request.getEquipmentItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemData.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("PO Item not found"));

            EquipmentPurchaseSpec spec = poItem.getEquipmentSpec();
            if (spec == null) {
                throw new RuntimeException("PO Item does not have an equipment spec");
            }

            // Create delivery receipt (quantity 1 per equipment unit)
            DeliveryItemReceipt receipt = DeliveryItemReceipt.builder()
                    .deliverySession(session)
                    .purchaseOrderItem(poItem)
                    .goodQuantity(1.0)
                    .isRedelivery(false)
                    .issues(new ArrayList<>())
                    .build();

            if (poItem.getItemReceipts() == null) {
                poItem.setItemReceipts(new ArrayList<>());
            }
            poItem.getItemReceipts().add(receipt);
            session.getItemReceipts().add(receipt);

            // Create Equipment entity with real data
            Equipment equipment = new Equipment();
            equipment.setType(spec.getEquipmentType());
            equipment.setName(spec.getName());
            equipment.setModel(spec.getModel() != null ? spec.getModel() : "N/A");
            if (spec.getBrand() != null) {
                equipment.setBrand(spec.getBrand());
            }
            equipment.setManufactureYear(spec.getManufactureYear() != null
                    ? Year.of(spec.getManufactureYear()) : Year.now());

            // Data from the receipt request
            equipment.setSerialNumber(itemData.getSerialNumber());
            equipment.setShipping(itemData.getShipping());
            equipment.setCustoms(itemData.getCustoms());
            equipment.setTaxes(itemData.getTaxes());
            equipment.setCountryOfOrigin(itemData.getCountryOfOrigin() != null
                    ? itemData.getCountryOfOrigin()
                    : (spec.getCountryOfOrigin() != null ? spec.getCountryOfOrigin() : "N/A"));
            equipment.setDeliveredDate(itemData.getDeliveredDate() != null
                    ? itemData.getDeliveredDate() : LocalDate.now());
            equipment.setEquipmentComplaints(itemData.getNotes());

            // Data from PO
            equipment.setEgpPrice(poItem.getTotalPrice());
            equipment.setDollarPrice(0);
            equipment.setPurchasedDate(LocalDate.now());
            equipment.setDepreciationStartDate(LocalDate.now());

            if (poItem.getMerchant() != null) {
                equipment.setPurchasedFrom(poItem.getMerchant());
            }

            // Traceability
            equipment.setPurchaseOrderId(po.getId());
            equipment.setPurchaseSpec(spec);
            equipment.setReceivedViaProc(true);

            // Defaults
            equipment.setStatus(EquipmentStatus.AVAILABLE);
            equipment.setWorkedHours(0);

            Equipment saved = equipmentRepository.save(equipment);
            createdEquipment.add(saved);

            System.out.println("✅ Equipment received: '" + saved.getName()
                    + "' (SN: " + saved.getSerialNumber() + ") from PO " + po.getPoNumber());
        }

        deliverySessionRepository.save(session);
        updateItemStatuses(po);
        updatePOStatus(po);
        purchaseOrderRepository.save(po);

        return createdEquipment;
    }
}