package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.models.procurement.*;
import com.example.backend.models.warehouse.*;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryProcessingService {

    private final DeliverySessionRepository deliverySessionRepository;
    private final DeliveryItemReceiptRepository deliveryItemReceiptRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PurchaseOrderIssueRepository purchaseOrderIssueRepository;
    private final ItemRepository itemRepository; // ADD THIS
    private final WarehouseRepository warehouseRepository; // ADD THIS

    @Transactional
    public DeliverySessionDTO processDelivery(ProcessDeliveryRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                .orElseThrow(() -> new RuntimeException("PO not found"));

        // Create delivery session
        DeliverySession session = DeliverySession.builder()
                .purchaseOrder(po)
                .merchant(po.getPurchaseOrderItems().get(0).getMerchant())
                .processedBy(request.getProcessedBy())
                .processedAt(LocalDateTime.now())
                .deliveryNotes(request.getDeliveryNotes())
                .itemReceipts(new ArrayList<>())
                .build();

        // Process each item receipt
        for (ProcessItemReceiptRequest itemRequest : request.getItemReceipts()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemRequest.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("PO Item not found"));

            DeliveryItemReceipt receipt = DeliveryItemReceipt.builder()
                    .deliverySession(session)
                    .purchaseOrderItem(poItem)
                    .goodQuantity(itemRequest.getGoodQuantity())
                    .isRedelivery(itemRequest.getIsRedelivery())
                    .issues(new ArrayList<>())
                    .build();

            // IMPORTANT: Add receipt to the item's list (bidirectional relationship)
            poItem.getItemReceipts().add(receipt);

            // Create issues
            if (itemRequest.getIssues() != null) {
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
            }

            session.getItemReceipts().add(receipt);
        }

        // Save the session (cascades to receipts and issues)
        deliverySessionRepository.save(session);

        createWarehouseItems(session);

        // Update statuses based on what was just processed
        updateItemStatuses(po);
        updatePOStatus(po);

        // Save the updated PO with new statuses
        purchaseOrderRepository.save(po);

        return convertToDTO(session);
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
        boolean anyDisputed = po.getPurchaseOrderItems().stream()
                .anyMatch(item -> "DISPUTED".equals(item.getStatus()));

        if (anyDisputed) {
            po.setStatus("DISPUTED");
        } else {
            boolean allCompleted = po.getPurchaseOrderItems().stream()
                    .allMatch(item -> "COMPLETED".equals(item.getStatus()));

            if (allCompleted) {
                po.setStatus("COMPLETED");
            } else {
                po.setStatus("PARTIAL");
            }
        }
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

    
}