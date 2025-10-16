package com.example.backend.services.procurement;


import com.example.backend.dto.procurement.ReceivedItemDTO; // ADD
import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.OfferItem;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.models.procurement.TimelineEventType;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.procurement.OfferItemRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.warehouse.ItemRepository; // ADD
import com.example.backend.repositories.warehouse.WarehouseRepository; // ADD
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PurchaseOrderService {

    private final OfferRepository offerRepository;
    private final OfferItemRepository offerItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final OfferTimelineService offerTimelineService; // ADDED
    private final ItemRepository itemRepository; // ADD
    private final WarehouseRepository warehouseRepository; // ADD

    @Autowired
    public PurchaseOrderService(
            OfferRepository offerRepository,
            OfferItemRepository offerItemRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderItemRepository purchaseOrderItemRepository,
            OfferTimelineService offerTimelineService, ItemRepository itemRepository, // ADD
            WarehouseRepository warehouseRepository) { // ADD { // ADDED PARAMETER
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.offerTimelineService = offerTimelineService; // ADDED
        this.itemRepository = itemRepository; // ADD
        this.warehouseRepository = warehouseRepository; // ADD
    }

    /**
     * Finalizes an offer and creates a purchase order from the finalized items
     *
     * @param offerId          The ID of the offer to finalize
     * @param finalizedItemIds List of offer item IDs that have been finalized
     * @param username         The username of the person finalizing the offer
     * @return The created purchase order
     */
    @Transactional
    public PurchaseOrder finalizeOfferAndCreatePurchaseOrder(UUID offerId, List<UUID> finalizedItemIds, String username) {
        // Find the offer
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found with ID: " + offerId));

        // Check if the offer is in the correct status (should be FINALIZING)
        if (!"FINALIZING".equals(offer.getStatus())) {
            throw new IllegalStateException("Offer must be in FINALIZING status to be finalized. Current status: " + offer.getStatus());
        }

        // Get all offer items that are finalized and finance-accepted
        List<OfferItem> finalizedItems = offerItemRepository.findAllById(finalizedItemIds);

        // Validate that all items are part of this offer and finance-accepted
        for (OfferItem item : finalizedItems) {
            if (!item.getOffer().getId().equals(offerId)) {
                throw new IllegalArgumentException("Item " + item.getId() + " does not belong to offer " + offerId);
            }

            if (!"ACCEPTED".equals(item.getFinanceStatus())) {
                throw new IllegalArgumentException("Cannot finalize item " + item.getId() + " as it is not finance-accepted");
            }
        }

        if (finalizedItems.isEmpty()) {
            throw new IllegalArgumentException("No valid items to finalize");
        }

        // MARK ALL FINALIZED ITEMS AS FINALIZED
        for (OfferItem item : finalizedItems) {
            item.setFinalized(true);
            offerItemRepository.save(item);
        }

        // UPDATE OFFER STATUS AND ADD TIMELINE EVENTS
        String previousStatus = offer.getStatus();

        // Create OFFER_FINALIZING timeline event
        offerTimelineService.createTimelineEvent(offer, TimelineEventType.OFFER_FINALIZED, username,
                "Starting finalization process with " + finalizedItems.size() + " items",
                previousStatus, "COMPLETED");

        // Update offer status to COMPLETED
        offer.setStatus("COMPLETED");
        offerRepository.save(offer);

        // Create purchase order
        PurchaseOrder purchaseOrder = new PurchaseOrder();
        purchaseOrder.setPoNumber("PO-" + generatePoNumber());
        purchaseOrder.setCreatedAt(LocalDateTime.now());
        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        purchaseOrder.setStatus("PENDING");
        purchaseOrder.setRequestOrder(offer.getRequestOrder());
        purchaseOrder.setOffer(offer);
        purchaseOrder.setCreatedBy(username);
        purchaseOrder.setPaymentTerms("Net 30"); // Default, can be customized
        purchaseOrder.setExpectedDeliveryDate(LocalDateTime.now().plusDays(30)); // Default expected delivery
        purchaseOrder.setPurchaseOrderItems(new ArrayList<>());

        // Determine currency from the first item (assuming all items use the same currency)
        String currency = finalizedItems.get(0).getCurrency();
        purchaseOrder.setCurrency(currency);

        // Calculate total amount and create PO items
        double totalAmount = 0.0;

        for (OfferItem offerItem : finalizedItems) {
            PurchaseOrderItem poItem = new PurchaseOrderItem();
            poItem.setQuantity(offerItem.getQuantity());
            poItem.setUnitPrice(offerItem.getUnitPrice().doubleValue());
            poItem.setTotalPrice(offerItem.getTotalPrice().doubleValue());
            poItem.setStatus("PENDING");
            poItem.setEstimatedDeliveryDays(offerItem.getEstimatedDeliveryDays() != null ? offerItem.getEstimatedDeliveryDays() : 30);
            poItem.setDeliveryNotes(offerItem.getDeliveryNotes());
            poItem.setComment(offerItem.getComment());
            poItem.setPurchaseOrder(purchaseOrder);
            poItem.setOfferItem(offerItem);
            poItem.setItemType(offerItem.getRequestOrderItem().getItemType());

            purchaseOrder.getPurchaseOrderItems().add(poItem);

            totalAmount += poItem.getTotalPrice();
        }

        purchaseOrder.setTotalAmount(totalAmount);

        // Save the purchase order
        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrder);

        // CREATE OFFER_COMPLETED TIMELINE EVENT AFTER PO IS CREATED
        offerTimelineService.createTimelineEvent(offer, TimelineEventType.OFFER_COMPLETED, username,
                "Purchase order " + savedPurchaseOrder.getPoNumber() + " created with total value: " +
                        savedPurchaseOrder.getCurrency() + " " + String.format("%.2f", totalAmount),
                "COMPLETED", "COMPLETED");

        return savedPurchaseOrder;
    }

    /**
     * Generates a random PO number
     */
    private String generatePoNumber() {
        String datePart = LocalDateTime.now().toString().substring(0, 10).replace("-", "");
        int randomNum = new Random().nextInt(10000);
        String randomPart = String.format("%04d", randomNum);
        return datePart + "-" + randomPart;
    }

    /**
     * Update status of an individual offer item (accept or reject)
     */


    /**
     * Complete finance review for an offer
     */


    /**
     * Create a purchase order from accepted items in an offer
     */
    /**
     * Create a purchase order from accepted items in an offer
     */


    /**
     * Get offers that have been completely processed by finance
     */

    /**
     * Get all offers pending finance review
     */
    public List<Offer> getOffersPendingFinanceReview() {
        return offerRepository.findByStatus("ACCEPTED")
                .stream()
                .filter(offer ->
                        offer.getFinanceStatus() == null ||
                                "PENDING_FINANCE_REVIEW".equals(offer.getFinanceStatus()) ||
                                "FINANCE_IN_PROGRESS".equals(offer.getFinanceStatus())
                )
                .collect(Collectors.toList());
    }

    /**
     * Get purchase order by offer ID
     */
    public PurchaseOrder getPurchaseOrderByOffer(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Use a custom query method or manual search
        List<PurchaseOrder> allPOs = purchaseOrderRepository.findAll();
        Optional<PurchaseOrder> matchingPO = allPOs.stream()
                .filter(po -> po.getOffer() != null && po.getOffer().getId().equals(offer.getId()))
                .findFirst();

        return matchingPO.orElse(null);
    }

    /**
     * Get all purchase orders
     */
    public List<PurchaseOrder> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll();
    }

    /**
     * Get purchase order by ID
     */
    public PurchaseOrder getPurchaseOrderById(UUID id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));
    }

    /**
     * Update purchase order status
     */
    @Transactional
    public PurchaseOrder updatePurchaseOrderStatus(UUID id, String status, String username) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        po.setStatus(status);
        po.setUpdatedAt(LocalDateTime.now());

        if ("APPROVED".equals(status)) {
            po.setApprovedBy(username);
            po.setFinanceApprovalDate(LocalDateTime.now());
        }

        return purchaseOrderRepository.save(po);
    }

    /**
     * Receive items for a purchase order
     * Updates received quantities and warehouse inventory
     *
     * @param purchaseOrderId The purchase order ID
     * @param receivedItems List of items being received with quantities
     * @param username The user receiving the items
     * @return Updated purchase order
     */
    @Transactional
    public PurchaseOrder receiveItems(UUID purchaseOrderId, List<ReceivedItemDTO> receivedItems, String username) {
        System.out.println("=== Starting receiveItems ===");
        System.out.println("Purchase Order ID: " + purchaseOrderId);
        System.out.println("Received Items Count: " + receivedItems.size());

        // 1. Get the purchase order
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        System.out.println("Found Purchase Order: " + purchaseOrder.getPoNumber());

        // 2. Get the warehouse from the request order
        UUID warehouseId = purchaseOrder.getRequestOrder().getRequesterId();
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        System.out.println("Warehouse: " + warehouse.getName());

        // 3. Process each received item
        for (ReceivedItemDTO receivedItemDTO : receivedItems) {
            System.out.println("\n--- Processing item: " + receivedItemDTO.getPurchaseOrderItemId() + " ---");

            // Find the purchase order item
            PurchaseOrderItem poItem = purchaseOrder.getPurchaseOrderItems().stream()
                    .filter(item -> item.getId().equals(receivedItemDTO.getPurchaseOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Purchase Order Item not found: " + receivedItemDTO.getPurchaseOrderItemId()));

            // Get ItemType - try direct first, then from offerItem
            ItemType itemType = poItem.getItemType();
            if (itemType == null && poItem.getOfferItem() != null) {
                itemType = poItem.getOfferItem().getRequestOrderItem().getItemType();
            }

            if (itemType == null) {
                throw new RuntimeException("ItemType not found for purchase order item: " + poItem.getId());
            }

            System.out.println("Item Type: " + itemType.getName());
            System.out.println("Ordered Quantity: " + poItem.getQuantity());
            System.out.println("Receiving Quantity: " + receivedItemDTO.getReceivedQuantity());

            // Validate received quantity
            if (receivedItemDTO.getReceivedQuantity() <= 0) {
                throw new IllegalArgumentException("Received quantity must be greater than 0");
            }

            if (receivedItemDTO.getReceivedQuantity() > poItem.getQuantity()) {
                throw new IllegalArgumentException("Received quantity cannot exceed ordered quantity");
            }

            // 4. Update the purchase order item with received info
            Double currentReceived = poItem.getReceivedQuantity() != null ? poItem.getReceivedQuantity() : 0.0;
            poItem.setReceivedQuantity(currentReceived + receivedItemDTO.getReceivedQuantity());
            poItem.setReceivedAt(LocalDateTime.now());
            poItem.setReceivedBy(username);

            // Update item status
            if (poItem.getReceivedQuantity() >= poItem.getQuantity()) {
                poItem.setStatus("COMPLETED");
                System.out.println("Item status: COMPLETED");
            } else {
                poItem.setStatus("PARTIAL");
                System.out.println("Item status: PARTIAL (received " + poItem.getReceivedQuantity() + " of " + poItem.getQuantity() + ")");
            }

            purchaseOrderItemRepository.save(poItem);

            // 5. Update warehouse inventory - use the itemType variable
            updateWarehouseInventory(warehouse, itemType, receivedItemDTO.getReceivedQuantity(), username, poItem);
        }

        // 6. Update purchase order status based on all items
        updatePurchaseOrderStatusAfterReceiving(purchaseOrder);

        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        PurchaseOrder savedPO = purchaseOrderRepository.save(purchaseOrder);

        System.out.println("=== receiveItems completed successfully ===");
        System.out.println("Final PO Status: " + savedPO.getStatus());

        return savedPO;
    }
    /**
     * Update warehouse inventory when items are received
     */
    /**
     * Update warehouse inventory when items are received from a purchase order
     * Creates new Item entries with purchase order tracking instead of merging
     */
    /**
     * Update warehouse inventory when items are received from a purchase order
     * Creates new Item entries with proper source tracking
     */
    private void updateWarehouseInventory(Warehouse warehouse, ItemType itemType, double quantity, String username, PurchaseOrderItem poItem) {
        System.out.println("\n>>> Updating warehouse inventory <<<");
        System.out.println("Warehouse: " + warehouse.getName());
        System.out.println("Item Type: " + itemType.getName());
        System.out.println("Quantity to add: " + quantity);
        System.out.println("From Purchase Order: " + poItem.getPurchaseOrder().getPoNumber());

        // Get merchant name
        String merchantName = poItem.getMerchant() != null ?
                poItem.getMerchant().getName() :
                "Unknown Merchant";

        // Create a new item entry for purchase order receipt
        Item newItem = Item.builder()
                .itemType(itemType)
                .warehouse(warehouse)
                .quantity((int) quantity)
                .itemStatus(ItemStatus.IN_WAREHOUSE)
                .resolved(false)
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                // NEW: Proper source tracking
                .itemSource(ItemSource.PURCHASE_ORDER)
                .sourceReference(poItem.getPurchaseOrder().getPoNumber())
                .merchantName(merchantName)
                .comment("Delivery notes: " + (poItem.getDeliveryNotes() != null ? poItem.getDeliveryNotes() : "None"))
                .build();

        itemRepository.save(newItem);

        System.out.println("✓ Created new item entry from purchase order");
        System.out.println("  Source: PURCHASE_ORDER");
        System.out.println("  PO Number: " + newItem.getSourceReference());
        System.out.println("  Merchant: " + newItem.getMerchantName());
        System.out.println("  Quantity: " + newItem.getQuantity());
    }/**
     * Update purchase order status based on received items
     * PENDING -> PARTIAL -> COMPLETED
     */
    private void updatePurchaseOrderStatusAfterReceiving(PurchaseOrder purchaseOrder) {
        List<PurchaseOrderItem> items = purchaseOrder.getPurchaseOrderItems();

        long totalItems = items.size();
        long completedItems = items.stream()
                .filter(item -> "COMPLETED".equals(item.getStatus()))
                .count();
        long partialItems = items.stream()
                .filter(item -> "PARTIAL".equals(item.getStatus()))
                .count();

        System.out.println("\n>>> Calculating PO Status <<<");
        System.out.println("Total items: " + totalItems);
        System.out.println("Completed items: " + completedItems);
        System.out.println("Partial items: " + partialItems);

        if (completedItems == totalItems) {
            // All items fully received
            purchaseOrder.setStatus("COMPLETED");
            System.out.println("Result: COMPLETED (all items received)");
        } else if (completedItems > 0 || partialItems > 0) {
            // Some items received (fully or partially)
            purchaseOrder.setStatus("PARTIAL");
            System.out.println("Result: PARTIAL (some items received)");
        } else {
            // No items received yet
            purchaseOrder.setStatus("PENDING");
            System.out.println("Result: PENDING (no items received yet)");
        }
    }
}
