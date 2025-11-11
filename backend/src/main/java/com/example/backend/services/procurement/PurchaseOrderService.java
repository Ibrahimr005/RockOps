package com.example.backend.services.procurement;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.dto.procurement.*;
import com.example.backend.dto.warehouse.ItemTypeDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.*;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import jakarta.persistence.EntityManager;
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
    private final OfferTimelineService offerTimelineService;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final PurchaseOrderIssueRepository issueRepository;

    private final PurchaseOrderDeliveryRepository deliveryRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    public PurchaseOrderService(
            OfferRepository offerRepository,
            OfferItemRepository offerItemRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderItemRepository purchaseOrderItemRepository,
            OfferTimelineService offerTimelineService,
            ItemRepository itemRepository,
            WarehouseRepository warehouseRepository,
            PurchaseOrderIssueRepository issueRepository,
            PurchaseOrderDeliveryRepository deliveryRepository) { // ← ADD THIS
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.offerTimelineService = offerTimelineService;
        this.itemRepository = itemRepository;
        this.warehouseRepository = warehouseRepository;
        this.issueRepository = issueRepository;
        this.deliveryRepository = deliveryRepository; // ← ADD THIS
    }

    /**
     * Finalizes an offer and creates a purchase order from the finalized items
     */
    @Transactional
    public PurchaseOrder finalizeOfferAndCreatePurchaseOrder(UUID offerId, List<UUID> finalizedItemIds, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found with ID: " + offerId));

        if (!"FINALIZING".equals(offer.getStatus())) {
            throw new IllegalStateException("Offer must be in FINALIZING status to be finalized. Current status: " + offer.getStatus());
        }

        List<OfferItem> finalizedItems = offerItemRepository.findAllById(finalizedItemIds);

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

        for (OfferItem item : finalizedItems) {
            item.setFinalized(true);
            offerItemRepository.save(item);
        }

        String previousStatus = offer.getStatus();

        offerTimelineService.createTimelineEvent(offer, TimelineEventType.OFFER_FINALIZED, username,
                "Starting finalization process with " + finalizedItems.size() + " items",
                previousStatus, "COMPLETED");

        offer.setStatus("COMPLETED");
        offerRepository.save(offer);

        PurchaseOrder purchaseOrder = new PurchaseOrder();
        purchaseOrder.setPoNumber("PO-" + generatePoNumber());
        purchaseOrder.setCreatedAt(LocalDateTime.now());
        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        purchaseOrder.setStatus("PENDING");
        purchaseOrder.setRequestOrder(offer.getRequestOrder());
        purchaseOrder.setOffer(offer);
        purchaseOrder.setCreatedBy(username);
        purchaseOrder.setPaymentTerms("Net 30");
        purchaseOrder.setExpectedDeliveryDate(LocalDateTime.now().plusDays(30));
        purchaseOrder.setPurchaseOrderItems(new ArrayList<>());

        String currency = finalizedItems.get(0).getCurrency();
        purchaseOrder.setCurrency(currency);

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

            if (offerItem.getMerchant() != null) {
                poItem.setMerchant(offerItem.getMerchant());
            }

            purchaseOrder.getPurchaseOrderItems().add(poItem);
            totalAmount += poItem.getTotalPrice();
        }

        purchaseOrder.setTotalAmount(totalAmount);

        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrder);

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

    // Helper class for consolidating inventory updates
    private static class WarehouseInventoryUpdate {
        ItemType itemType;
        Merchant merchant;
        double quantity;
        PurchaseOrder purchaseOrder;
    }

    @Transactional
    public ProcessDeliveryResponseDTO processDelivery(ProcessDeliveryRequestDTO request, String username) {
        System.out.println("=== Starting processDelivery (DTO SOLUTION) ===");

        // Process everything as before, but build a DTO response
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        // Store values for response BEFORE any processing
        ProcessDeliveryResponseDTO response = ProcessDeliveryResponseDTO.builder()
                .purchaseOrderId(purchaseOrder.getId())
                .poNumber(purchaseOrder.getPoNumber())
                .totalAmount(purchaseOrder.getTotalAmount())
                .currency(purchaseOrder.getCurrency())
                .build();

        // Get warehouse WITHOUT navigating through Site
        UUID warehouseId = purchaseOrder.getRequestOrder().getRequesterId();
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        Map<String, WarehouseInventoryUpdate> inventoryUpdates = new HashMap<>();

        // Process items
        for (ProcessDeliveryRequestDTO.DeliveryItemDTO deliveryItem : request.getItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(deliveryItem.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("Purchase Order Item not found"));

            ItemType itemType = poItem.getItemType();

            // Create delivery
            PurchaseOrderDelivery delivery = PurchaseOrderDelivery.builder()
                    .purchaseOrder(purchaseOrder)
                    .purchaseOrderItem(poItem)
                    .receivedGoodQuantity(deliveryItem.getReceivedGood() != null ? deliveryItem.getReceivedGood() : 0.0)
                    .deliveredAt(LocalDateTime.now())
                    .processedBy(username)
                    .deliveryNotes(request.getGeneralNotes())
                    .isRedelivery(false)
                    .issues(new ArrayList<>())
                    .build();

            delivery = deliveryRepository.save(delivery);

            // Process issues
            if (deliveryItem.getIssues() != null) {
                for (ProcessDeliveryRequestDTO.IssueDTO issueDTO : deliveryItem.getIssues()) {
                    if (issueDTO.getQuantity() != null && issueDTO.getQuantity() > 0) {
                        IssueType issueType = mapIssueType(issueDTO.getType());

                        PurchaseOrderIssue issue = PurchaseOrderIssue.builder()
                                .purchaseOrder(purchaseOrder)
                                .purchaseOrderItem(poItem)
                                .delivery(delivery)
                                .issueType(issueType)
                                .issueStatus(IssueStatus.REPORTED)
                                .reportedBy(username)
                                .reportedAt(LocalDateTime.now())
                                .issueDescription(issueDTO.getNotes())
                                .affectedQuantity(issueDTO.getQuantity())
                                .build();

                        issueRepository.save(issue);
                    }
                }
            }

            // Update received quantity
            Double currentReceived = poItem.getReceivedQuantity() != null ? poItem.getReceivedQuantity() : 0.0;
            Double goodQuantityReceived = deliveryItem.getReceivedGood() != null ? deliveryItem.getReceivedGood() : 0.0;
            poItem.setReceivedQuantity(currentReceived + goodQuantityReceived);
            poItem.setReceivedAt(LocalDateTime.now());
            poItem.setReceivedBy(username);

            // Update item status
            updateItemStatus(poItem);
            purchaseOrderItemRepository.save(poItem);

            // Track inventory updates
            if (goodQuantityReceived > 0) {
                String merchantId = poItem.getMerchant() != null ?
                        poItem.getMerchant().getId().toString() : "no-merchant";
                String inventoryKey = itemType.getId().toString() + "-" + merchantId;

                if (inventoryUpdates.containsKey(inventoryKey)) {
                    inventoryUpdates.get(inventoryKey).quantity += goodQuantityReceived;
                } else {
                    WarehouseInventoryUpdate newUpdate = new WarehouseInventoryUpdate();
                    newUpdate.itemType = itemType;
                    newUpdate.merchant = poItem.getMerchant();
                    newUpdate.quantity = goodQuantityReceived;
                    newUpdate.purchaseOrder = purchaseOrder;
                    inventoryUpdates.put(inventoryKey, newUpdate);
                }
            }
        }

        // Create inventory WITHOUT navigating through Site
        for (WarehouseInventoryUpdate update : inventoryUpdates.values()) {
            Item newItem = Item.builder()
                    .itemType(update.itemType)
                    .warehouse(warehouse)
                    .quantity((int) update.quantity)
                    .itemStatus(ItemStatus.IN_WAREHOUSE)
                    .resolved(false)
                    .createdAt(LocalDateTime.now())
                    .createdBy(username)
                    .itemSource(ItemSource.PURCHASE_ORDER)
                    .sourceReference(purchaseOrder.getPoNumber())
                    .merchantName(update.merchant != null ? update.merchant.getName() : "Unknown")
                    .comment("Delivery from PO")
                    .build();

            itemRepository.save(newItem);
        }

        // Update PO status WITHOUT navigating relationships
        String newStatus = calculatePurchaseOrderStatus(purchaseOrder.getId());
        purchaseOrder.setStatus(newStatus);
        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        purchaseOrderRepository.save(purchaseOrder);

        // Complete the response DTO
        response.setPoStatus(newStatus);
        response.setSuccess(true);
        response.setMessage("Delivery processed successfully");

        return response;  // Return ONLY the DTO, not the entity!
    }

    // Helper method to calculate PO status WITHOUT loading the entity graph
    private String calculatePurchaseOrderStatus(UUID purchaseOrderId) {
        // Use a query to get the item statuses without loading entities
        String query = "SELECT poi.status FROM PurchaseOrderItem poi WHERE poi.purchaseOrder.id = :poId";
        List<String> itemStatuses = entityManager.createQuery(query, String.class)
                .setParameter("poId", purchaseOrderId)
                .getResultList();

        long completedCount = itemStatuses.stream().filter("COMPLETED"::equals).count();
        long partialCount = itemStatuses.stream().filter("PARTIAL"::equals).count();

        // Check for unresolved issues
        long unresolvedIssues = issueRepository.countByPurchaseOrderIdAndIssueStatus(
                purchaseOrderId, IssueStatus.REPORTED);

        if (unresolvedIssues > 0) {
            return "DISPUTED";
        } else if (completedCount == itemStatuses.size()) {
            return "COMPLETED";
        } else if (completedCount > 0 || partialCount > 0) {
            return "PARTIAL";
        } else {
            return "PENDING";
        }
    }

    // Helper to map issue types
    private IssueType mapIssueType(String type) {
        String upperType = type.toUpperCase().replace(" ", "_");
        switch (upperType) {
            case "NEVER_ARRIVED":
            case "NOT_ARRIVED":
                return IssueType.NOT_ARRIVED;
            case "DAMAGED":
                return IssueType.DAMAGED;
            case "WRONG_ITEM":
                return IssueType.WRONG_ITEM;
            case "OTHER":
            default:
                return IssueType.OTHER;
        }
    }

    /**
     * Calculate and update item status based on received quantities and issues
     * HANDLES: Normal delivery, shortage acceptance, redelivery pending
     */
    private void updateItemStatus(PurchaseOrderItem poItem) {
        double ordered = poItem.getQuantity();
        double received = poItem.getReceivedQuantity() != null ? poItem.getReceivedQuantity() : 0.0;

        // Get all issues for this item
        List<PurchaseOrderIssue> allIssues = issueRepository.findByPurchaseOrderItemId(poItem.getId());

        // Calculate total from issues
        double totalIssuesQuantity = allIssues.stream()
                .filter(i -> i.getAffectedQuantity() != null)
                .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                .sum();

        double totalAccounted = received + totalIssuesQuantity;

        System.out.println("Status Calculation:");
        System.out.println("  Ordered: " + ordered);
        System.out.println("  Received Good: " + received);
        System.out.println("  Issues Quantity: " + totalIssuesQuantity);
        System.out.println("  Total Accounted: " + totalAccounted);

        // Check if any resolved issues are redelivery (means we're waiting)
        boolean hasRedeliveryPending = allIssues.stream()
                .anyMatch(i -> i.getIssueStatus() == IssueStatus.RESOLVED
                        && i.getResolutionType() == PurchaseOrderResolutionType.REDELIVERY);

        // Check if all issues are resolved (non-redelivery)
        boolean allIssuesClosed = allIssues.stream()
                .filter(i -> i.getIssueStatus() == IssueStatus.REPORTED)
                .count() == 0;

        if (hasRedeliveryPending) {
            poItem.setStatus("PENDING");  // Waiting for redelivery
            System.out.println("→ Status: PENDING (redelivery pending)");
        } else if (totalAccounted >= ordered) {
            poItem.setStatus("COMPLETED");  // Fully accounted
            System.out.println("→ Status: COMPLETED (all accounted)");
        } else if (allIssuesClosed && totalAccounted > 0 && totalAccounted < ordered) {
            // All issues resolved with accept shortage
            poItem.setStatus("COMPLETED");
            System.out.println("→ Status: COMPLETED (shortage accepted)");
        } else if (totalAccounted > 0) {
            poItem.setStatus("PARTIAL");
            System.out.println("→ Status: PARTIAL");
        } else {
            poItem.setStatus("PENDING");
            System.out.println("→ Status: PENDING");
        }
    }

    /**
     * Update warehouse inventory with consolidated quantities
     * Creates a single Item entry per itemType-merchant combination
     */
    private void updateWarehouseInventoryConsolidated(Warehouse warehouse, WarehouseInventoryUpdate update, String username) {
        System.out.println("\n>>> Updating warehouse inventory (consolidated) <<<");
        System.out.println("Warehouse: " + warehouse.getName());
        System.out.println("Item Type: " + update.itemType.getName());
        System.out.println("Consolidated Quantity: " + update.quantity);
        System.out.println("From Purchase Order: " + update.purchaseOrder.getPoNumber());

        String merchantName = update.merchant != null ?
                update.merchant.getName() :
                "Unknown Merchant";

        Item newItem = Item.builder()
                .itemType(update.itemType)
                .warehouse(warehouse)
                .quantity((int) update.quantity)
                .itemStatus(ItemStatus.IN_WAREHOUSE)
                .resolved(false)
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .itemSource(ItemSource.PURCHASE_ORDER)
                .sourceReference(update.purchaseOrder.getPoNumber())
                .merchantName(merchantName)
                .comment("Consolidated delivery from PO")
                .build();

        itemRepository.save(newItem);

        System.out.println("✓ Created consolidated warehouse entry");
        System.out.println("  Source: PURCHASE_ORDER");
        System.out.println("  PO Number: " + newItem.getSourceReference());
        System.out.println("  Merchant: " + newItem.getMerchantName());
        System.out.println("  Quantity: " + newItem.getQuantity());
    }

    /**
     * Update purchase order status based on received items
     * PENDING -> PARTIAL -> COMPLETED
     */
    /**
     * Update purchase order status based on received items
     * CRITICAL: Check for unresolved issues FIRST - DISPUTED takes priority
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

        // CHECK FOR UNRESOLVED ISSUES FIRST - DISPUTED takes priority over everything
        long unresolvedIssues = issueRepository.countByPurchaseOrderIdAndIssueStatus(
                purchaseOrder.getId(), IssueStatus.REPORTED);

        System.out.println("Unresolved issues: " + unresolvedIssues);

        if (unresolvedIssues > 0) {
            purchaseOrder.setStatus("DISPUTED");
            System.out.println("Result: DISPUTED (has " + unresolvedIssues + " unresolved issues)");
        } else if (completedItems == totalItems) {
            purchaseOrder.setStatus("COMPLETED");
            System.out.println("Result: COMPLETED (all items received)");
        } else if (completedItems > 0 || partialItems > 0) {
            purchaseOrder.setStatus("PARTIAL");
            System.out.println("Result: PARTIAL (some items received)");
        } else {
            purchaseOrder.setStatus("PENDING");
            System.out.println("Result: PENDING (no items received yet)");
        }
    }

    /**
     * Resolve issues for purchase order items
     * Updates issue status and may change PO status based on resolution
     */
    /**
     * Resolve multiple issues with individual resolution types
     * Each issue can have its own resolution type and notes
     */
    @Transactional
    public PurchaseOrder resolveIssues(UUID purchaseOrderId, List<ResolveIssuesRequestDTO.IssueResolution> resolutions, String username) {
        System.out.println("=== Starting resolveIssues (Multiple Resolutions) ===");
        System.out.println("Purchase Order ID: " + purchaseOrderId);
        System.out.println("Number of resolutions: " + resolutions.size());

        // 1. Get the purchase order
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        System.out.println("Found Purchase Order: " + purchaseOrder.getPoNumber());

        // 2. Validate PO is in DISPUTED status
        if (!"DISPUTED".equals(purchaseOrder.getStatus())) {
            throw new IllegalStateException(
                    "Cannot resolve issues for purchase order not in DISPUTED status. Current status: " + purchaseOrder.getStatus()
            );
        }

        // 3. Process each resolution
        for (ResolveIssuesRequestDTO.IssueResolution resolution : resolutions) {
            System.out.println("\n--- Processing resolution for issue: " + resolution.getIssueId() + " ---");
            System.out.println("Resolution Type: " + resolution.getResolutionType());
            System.out.println("Resolution Notes: " + resolution.getResolutionNotes());

            // Find the issue
            PurchaseOrderIssue issue = issueRepository.findById(resolution.getIssueId())
                    .orElseThrow(() -> new RuntimeException("Issue not found: " + resolution.getIssueId()));

            // Validate issue belongs to this PO
            if (!issue.getPurchaseOrder().getId().equals(purchaseOrderId)) {
                throw new IllegalArgumentException(
                        "Issue " + resolution.getIssueId() + " does not belong to purchase order " + purchaseOrderId
                );
            }

            // Validate issue is in REPORTED status
            if (issue.getIssueStatus() != IssueStatus.REPORTED) {
                System.out.println("⚠️ WARNING: Issue " + issue.getId() + " is already " + issue.getIssueStatus());
                continue; // Skip already resolved issues
            }

            // Update the issue with resolution details
            issue.setIssueStatus(IssueStatus.RESOLVED);
            issue.setResolutionType(resolution.getResolutionType());
            issue.setResolvedBy(username);
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolutionNotes(resolution.getResolutionNotes());
            issueRepository.save(issue);

            System.out.println("✓ Issue resolved successfully");


            // Update the associated purchase order item status
            PurchaseOrderItem poItem = issue.getPurchaseOrderItem();
            updateItemStatus(poItem);  // ← Use new method instead
            purchaseOrderItemRepository.save(poItem);
        }

        // 4. Check if there are any remaining unresolved issues
        long remainingIssues = issueRepository.countByPurchaseOrderIdAndIssueStatus(
                purchaseOrderId, IssueStatus.REPORTED);

        System.out.println("\n>>> Remaining unresolved issues: " + remainingIssues);

        // 5. Update purchase order status
        updatePurchaseOrderStatusAfterResolution(purchaseOrder);

        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        PurchaseOrder savedPO = purchaseOrderRepository.save(purchaseOrder);

        System.out.println("=== resolveIssues completed successfully ===");
        System.out.println("Final PO Status: " + savedPO.getStatus());

        return savedPO;
    }


    /**
     * Update purchase order status after issue resolution
     * CRITICAL: Check if there are STILL unresolved issues
     */
    private void updatePurchaseOrderStatusAfterResolution(PurchaseOrder purchaseOrder) {
        List<PurchaseOrderItem> items = purchaseOrder.getPurchaseOrderItems();

        long totalItems = items.size();
        long completedItems = items.stream()
                .filter(item -> "COMPLETED".equals(item.getStatus()))
                .count();
        long pendingItems = items.stream()
                .filter(item -> "PENDING".equals(item.getStatus()))
                .count();
        long partialItems = items.stream()
                .filter(item -> "PARTIAL".equals(item.getStatus()))
                .count();

        System.out.println("\n>>> Calculating PO Status After Resolution <<<");
        System.out.println("Total items: " + totalItems);
        System.out.println("Completed items: " + completedItems);
        System.out.println("Pending items: " + pendingItems);
        System.out.println("Partial items: " + partialItems);

        // CHECK IF THERE ARE STILL UNRESOLVED ISSUES
        long remainingIssues = issueRepository.countByPurchaseOrderIdAndIssueStatus(
                purchaseOrder.getId(), IssueStatus.REPORTED);

        System.out.println("Remaining unresolved issues: " + remainingIssues);

        if (remainingIssues > 0) {
            // Still has unresolved issues - stay DISPUTED
            purchaseOrder.setStatus("DISPUTED");
            System.out.println("Result: DISPUTED (" + remainingIssues + " issues remaining)");
        } else if (completedItems == totalItems) {
            purchaseOrder.setStatus("COMPLETED");
            System.out.println("Result: COMPLETED");
        } else if (pendingItems > 0 || partialItems > 0) {
            purchaseOrder.setStatus("PARTIAL");
            System.out.println("Result: PARTIAL");
        } else {
            purchaseOrder.setStatus("PENDING");
            System.out.println("Result: PENDING");
        }
    }
    /**
     * Get all issues for a purchase order as DTOs
     */
    public List<PurchaseOrderIssueDTO> getIssuesForPurchaseOrder(UUID purchaseOrderId) {
        System.out.println("\n=== FETCHING ISSUES FOR PO: " + purchaseOrderId + " ===");

        // Get entities with JOIN FETCH
        List<PurchaseOrderIssue> issues = issueRepository.findByPurchaseOrderIdWithDetails(purchaseOrderId);

        System.out.println("Found " + issues.size() + " issues in database");

        // Convert to DTOs
        List<PurchaseOrderIssueDTO> dtos = issues.stream()
                .map(this::convertIssueToDTO)
                .toList();

        // Log for debugging
        dtos.forEach(dto -> {
            System.out.println("  - Issue: " + dto.getIssueType() +
                    " | Quantity: " + dto.getAffectedQuantity() +
                    " | Item: " + dto.getItemTypeName() +
                    " | Unit: " + dto.getMeasuringUnit());
        });

        System.out.println("===========================================\n");

        return dtos;
    }

    /**
     * Get active (unresolved) issues for a purchase order
     */
    public List<PurchaseOrderIssue> getActiveIssuesForPurchaseOrder(UUID purchaseOrderId) {
        return issueRepository.findByPurchaseOrderIdAndIssueStatus(purchaseOrderId, IssueStatus.REPORTED);
    }
    /**
     * Convert PurchaseOrderIssue entity to DTO with item details
     */
    private PurchaseOrderIssueDTO convertIssueToDTO(PurchaseOrderIssue issue) {
        PurchaseOrderIssueDTO dto = PurchaseOrderIssueDTO.builder()
                .id(issue.getId())
                .purchaseOrderId(issue.getPurchaseOrder().getId())
                .purchaseOrderItemId(issue.getPurchaseOrderItem().getId())
                .issueType(issue.getIssueType())
                .issueStatus(issue.getIssueStatus())
                .affectedQuantity(issue.getAffectedQuantity())
                .issueDescription(issue.getIssueDescription())
                .reportedBy(issue.getReportedBy())
                .reportedAt(issue.getReportedAt())
                .resolutionType(issue.getResolutionType())
                .resolvedBy(issue.getResolvedBy())
                .resolvedAt(issue.getResolvedAt())
                .resolutionNotes(issue.getResolutionNotes())
                .build();

        // Add item details
        if (issue.getPurchaseOrderItem() != null && issue.getPurchaseOrderItem().getItemType() != null) {
            dto.setItemTypeName(issue.getPurchaseOrderItem().getItemType().getName());
            dto.setMeasuringUnit(issue.getPurchaseOrderItem().getItemType().getMeasuringUnit());
        }

        // Add merchant details ← ADD THIS BLOCK
        if (issue.getPurchaseOrderItem() != null && issue.getPurchaseOrderItem().getMerchant() != null) {
            Merchant merchant = issue.getPurchaseOrderItem().getMerchant();
            dto.setMerchantId(merchant.getId());
            dto.setMerchantName(merchant.getName());
            dto.setMerchantContactPhone(merchant.getContactPhone());
            dto.setMerchantContactSecondPhone(merchant.getContactSecondPhone());
            dto.setMerchantContactEmail(merchant.getContactEmail());
            dto.setMerchantContactPersonName(merchant.getContactPersonName());
            dto.setMerchantAddress(merchant.getAddress());
        }

        return dto;
    }

    /**
     * Get delivery history with issues for a purchase order item
     * Used by frontend to display "Previously Processed" section
     */
    public List<PurchaseOrderDeliveryDTO> getDeliveryHistory(UUID purchaseOrderItemId) {
        List<PurchaseOrderDelivery> deliveries = deliveryRepository.findByItemIdWithIssues(purchaseOrderItemId);

        return deliveries.stream()
                .map(this::convertDeliveryToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert delivery entity to DTO with issues
     */
    private PurchaseOrderDeliveryDTO convertDeliveryToDTO(PurchaseOrderDelivery delivery) {
        List<PurchaseOrderIssueDTO> issueDTOs = delivery.getIssues().stream()
                .map(this::convertIssueToDTO)
                .collect(Collectors.toList());

        return PurchaseOrderDeliveryDTO.builder()
                .id(delivery.getId())
                .purchaseOrderId(delivery.getPurchaseOrder().getId())
                .purchaseOrderItemId(delivery.getPurchaseOrderItem().getId())
                .receivedGoodQuantity(delivery.getReceivedGoodQuantity())
                .deliveredAt(delivery.getDeliveredAt())
                .processedBy(delivery.getProcessedBy())
                .deliveryNotes(delivery.getDeliveryNotes())
                .isRedelivery(delivery.getIsRedelivery())
                .redeliveryForIssueId(delivery.getRedeliveryForIssue() != null ?
                        delivery.getRedeliveryForIssue().getId() : null)
                .issues(issueDTOs)
                .build();
    }

    // Add these methods to your PurchaseOrderService class:

    /**
     * Get items that are pending redelivery for a purchase order
     * These are items with resolved issues where resolution type was REDELIVERY
     */
    public List<PurchaseOrderItemDTO> getItemsPendingRedelivery(UUID purchaseOrderId) {
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        List<PurchaseOrderItemDTO> pendingRedeliveryItems = new ArrayList<>();

        for (PurchaseOrderItem item : purchaseOrder.getPurchaseOrderItems()) {
            // Check if this item has any RESOLVED issues with REDELIVERY resolution
            List<PurchaseOrderIssue> redeliveryIssues = issueRepository
                    .findByPurchaseOrderItemId(item.getId())
                    .stream()
                    .filter(issue -> issue.getIssueStatus() == IssueStatus.RESOLVED
                            && issue.getResolutionType() == PurchaseOrderResolutionType.REDELIVERY)
                    .collect(Collectors.toList());

            if (!redeliveryIssues.isEmpty()) {
                // Check if redelivery has already been processed
                boolean redeliveryProcessed = false;
                for (PurchaseOrderIssue issue : redeliveryIssues) {
                    // Check if there's a delivery marked as redelivery for this issue
                    Long redeliveryCount = deliveryRepository.countByRedeliveryForIssueId(issue.getId());
                    if (redeliveryCount > 0) {
                        redeliveryProcessed = true;
                        break;
                    }
                }

                // If redelivery not yet processed, add to pending list
                if (!redeliveryProcessed) {
                    PurchaseOrderItemDTO dto = convertItemToDTO(item);

                    // Calculate the quantity pending redelivery
                    double pendingRedeliveryQty = redeliveryIssues.stream()
                            .mapToDouble(i -> i.getAffectedQuantity() != null ? i.getAffectedQuantity() : 0.0)
                            .sum();

                    dto.setRemainingQuantity(pendingRedeliveryQty);

                    // Add the issue IDs for reference
                    dto.setIssues(redeliveryIssues.stream()
                            .map(this::convertIssueToDTO)
                            .collect(Collectors.toList()));

                    pendingRedeliveryItems.add(dto);
                }
            }
        }

        return pendingRedeliveryItems;
    }

    /**
     * Process a redelivery - this is when items that had issues come back
     * The delivery is linked to the original issue for tracking
     */
    @Transactional
    public ProcessDeliveryResponseDTO processRedeliveryForIssues(UUID purchaseOrderId,
                                                                 List<UUID> issueIds,
                                                                 ProcessDeliveryRequestDTO deliveryData,
                                                                 String username) {
        System.out.println("=== Starting processRedeliveryForIssues ===");
        System.out.println("Issue IDs: " + issueIds);

        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        // Validate all issues
        List<PurchaseOrderIssue> originalIssues = new ArrayList<>();
        for (UUID issueId : issueIds) {
            PurchaseOrderIssue issue = issueRepository.findById(issueId)
                    .orElseThrow(() -> new RuntimeException("Issue not found: " + issueId));

            if (issue.getResolutionType() != PurchaseOrderResolutionType.REDELIVERY) {
                throw new IllegalArgumentException("Issue " + issueId + " was not resolved with REDELIVERY");
            }

            // Check if redelivery already processed
            Long redeliveryCount = deliveryRepository.countByRedeliveryForIssueId(issueId);
            if (redeliveryCount > 0) {
                throw new IllegalArgumentException("Redelivery for issue " + issueId + " has already been processed");
            }

            originalIssues.add(issue);
        }

        ProcessDeliveryResponseDTO response = ProcessDeliveryResponseDTO.builder()
                .purchaseOrderId(purchaseOrder.getId())
                .poNumber(purchaseOrder.getPoNumber())
                .totalAmount(purchaseOrder.getTotalAmount())
                .currency(purchaseOrder.getCurrency())
                .processedItems(new ArrayList<>())
                .build();

        // Get warehouse
        UUID warehouseId = purchaseOrder.getRequestOrder().getRequesterId();
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        Map<String, WarehouseInventoryUpdate> inventoryUpdates = new HashMap<>();

        // Process the redelivery items
        for (ProcessDeliveryRequestDTO.DeliveryItemDTO deliveryItem : deliveryData.getItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(deliveryItem.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("Purchase Order Item not found"));

            // Find the corresponding issue for this item
            PurchaseOrderIssue correspondingIssue = originalIssues.stream()
                    .filter(issue -> issue.getPurchaseOrderItem().getId().equals(poItem.getId()))
                    .findFirst()
                    .orElse(originalIssues.get(0)); // Fallback to first issue if not found

            // Create redelivery record with link to original issue
            PurchaseOrderDelivery redelivery = PurchaseOrderDelivery.builder()
                    .purchaseOrder(purchaseOrder)
                    .purchaseOrderItem(poItem)
                    .receivedGoodQuantity(deliveryItem.getReceivedGood() != null ? deliveryItem.getReceivedGood() : 0.0)
                    .deliveredAt(LocalDateTime.now())
                    .processedBy(username)
                    .deliveryNotes("Redelivery for issue #" + correspondingIssue.getId() +
                            (deliveryData.getGeneralNotes() != null ? ": " + deliveryData.getGeneralNotes() : ""))
                    .isRedelivery(true)
                    .redeliveryForIssue(correspondingIssue)  // Link to original issue
                    .issues(new ArrayList<>())
                    .build();

            redelivery = deliveryRepository.save(redelivery);

            // Process any NEW issues in the redelivery
            List<ProcessDeliveryResponseDTO.CreatedIssueDTO> createdIssues = new ArrayList<>();
            if (deliveryItem.getIssues() != null) {
                for (ProcessDeliveryRequestDTO.IssueDTO issueDTO : deliveryItem.getIssues()) {
                    if (issueDTO.getQuantity() != null && issueDTO.getQuantity() > 0) {
                        IssueType issueType = mapIssueType(issueDTO.getType());

                        PurchaseOrderIssue newIssue = PurchaseOrderIssue.builder()
                                .purchaseOrder(purchaseOrder)
                                .purchaseOrderItem(poItem)
                                .delivery(redelivery)
                                .issueType(issueType)
                                .issueStatus(IssueStatus.REPORTED)
                                .reportedBy(username)
                                .reportedAt(LocalDateTime.now())
                                .issueDescription("Issue in redelivery: " + issueDTO.getNotes())
                                .affectedQuantity(issueDTO.getQuantity())
                                .build();

                        PurchaseOrderIssue savedIssue = issueRepository.save(newIssue);

                        createdIssues.add(ProcessDeliveryResponseDTO.CreatedIssueDTO.builder()
                                .issueId(savedIssue.getId())
                                .issueType(issueType.toString())
                                .affectedQuantity(issueDTO.getQuantity())
                                .description(issueDTO.getNotes())
                                .build());
                    }
                }
            }

            // Update received quantity
            Double currentReceived = poItem.getReceivedQuantity() != null ? poItem.getReceivedQuantity() : 0.0;
            Double goodQuantityReceived = deliveryItem.getReceivedGood() != null ? deliveryItem.getReceivedGood() : 0.0;
            poItem.setReceivedQuantity(currentReceived + goodQuantityReceived);
            poItem.setReceivedAt(LocalDateTime.now());
            poItem.setReceivedBy(username);

            // Update item status
            updateItemStatus(poItem);
            purchaseOrderItemRepository.save(poItem);

            // Track for inventory
            if (goodQuantityReceived > 0) {
                ItemType itemType = poItem.getItemType();
                String merchantId = poItem.getMerchant() != null ?
                        poItem.getMerchant().getId().toString() : "no-merchant";
                String inventoryKey = itemType.getId().toString() + "-" + merchantId;

                if (inventoryUpdates.containsKey(inventoryKey)) {
                    inventoryUpdates.get(inventoryKey).quantity += goodQuantityReceived;
                } else {
                    WarehouseInventoryUpdate newUpdate = new WarehouseInventoryUpdate();
                    newUpdate.itemType = itemType;
                    newUpdate.merchant = poItem.getMerchant();
                    newUpdate.quantity = goodQuantityReceived;
                    newUpdate.purchaseOrder = purchaseOrder;
                    inventoryUpdates.put(inventoryKey, newUpdate);
                }
            }

            // Add to response
            ProcessDeliveryResponseDTO.ProcessedItemDTO processedItem = ProcessDeliveryResponseDTO.ProcessedItemDTO.builder()
                    .itemId(poItem.getId())
                    .itemTypeName(poItem.getItemType().getName())
                    .merchantName(poItem.getMerchant() != null ? poItem.getMerchant().getName() : "Unknown")
                    .orderedQuantity(poItem.getQuantity())
                    .totalReceivedQuantity(poItem.getReceivedQuantity())
                    .thisDeliveryGoodQuantity(goodQuantityReceived)
                    .itemStatus(poItem.getStatus())
                    .createdIssues(createdIssues)
                    .build();

            response.getProcessedItems().add(processedItem);
        }

        // Create inventory entries
        for (WarehouseInventoryUpdate update : inventoryUpdates.values()) {
            Item newItem = Item.builder()
                    .itemType(update.itemType)
                    .warehouse(warehouse)
                    .quantity((int) update.quantity)
                    .itemStatus(ItemStatus.IN_WAREHOUSE)
                    .resolved(false)
                    .createdAt(LocalDateTime.now())
                    .createdBy(username)
                    .itemSource(ItemSource.PURCHASE_ORDER)
                    .sourceReference(purchaseOrder.getPoNumber() + "-REDELIVERY")
                    .merchantName(update.merchant != null ? update.merchant.getName() : "Unknown")
                    .comment("Redelivery for issues: " + issueIds.stream()
                            .map(UUID::toString)
                            .collect(Collectors.joining(", ")))
                    .build();

            itemRepository.save(newItem);
        }

        // Update PO status
        String newStatus = calculatePurchaseOrderStatus(purchaseOrder.getId());
        purchaseOrder.setStatus(newStatus);
        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        purchaseOrderRepository.save(purchaseOrder);

        response.setPoStatus(newStatus);
        response.setSuccess(true);
        response.setMessage("Redelivery processed successfully");

        System.out.println("=== Redelivery completed successfully ===");
        return response;
    }

    /**
     * Helper to convert PurchaseOrderItem to DTO
     */
    private PurchaseOrderItemDTO convertItemToDTO(PurchaseOrderItem item) {
        PurchaseOrderItemDTO dto = PurchaseOrderItemDTO.builder()
                .id(item.getId())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .status(item.getStatus())
                .estimatedDeliveryDays(item.getEstimatedDeliveryDays())
                .deliveryNotes(item.getDeliveryNotes())
                .comment(item.getComment())
                .receivedQuantity(item.getReceivedQuantity())
                .receivedAt(item.getReceivedAt())
                .receivedBy(item.getReceivedBy())
                .purchaseOrderId(item.getPurchaseOrder().getId())
                .build();

        if (item.getItemType() != null) {
            dto.setItemTypeId(item.getItemType().getId());
            // Convert ItemType to ItemTypeDTO if needed
            ItemTypeDTO itemTypeDTO = new ItemTypeDTO();
            itemTypeDTO.setId(item.getItemType().getId());
            itemTypeDTO.setName(item.getItemType().getName());
            itemTypeDTO.setMeasuringUnit(item.getItemType().getMeasuringUnit());
            dto.setItemType(itemTypeDTO);
        }

        if (item.getMerchant() != null) {
            dto.setMerchantId(item.getMerchant().getId());
            // Convert Merchant to MerchantDTO if needed
            MerchantDTO merchantDTO = new MerchantDTO();
            merchantDTO.setId(item.getMerchant().getId());
            merchantDTO.setName(item.getMerchant().getName());
            dto.setMerchant(merchantDTO);
        }

        return dto;
    }
}