package com.example.backend.services.procurement;

import com.example.backend.dto.OfferDTO;
import com.example.backend.dto.OfferItemDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.*;
import com.example.backend.repositories.procurement.OfferItemRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.RequestOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.RequestOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OfferService {

    private final OfferRepository offerRepository;
    private final OfferItemRepository offerItemRepository;
    private final RequestOrderRepository requestOrderRepository;
    private final RequestOrderItemRepository requestOrderItemRepository;
    private final MerchantRepository merchantRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final OfferTimelineService timelineService;

    @Autowired
    public OfferService(OfferRepository offerRepository,
                        OfferItemRepository offerItemRepository,
                        RequestOrderRepository requestOrderRepository,
                        RequestOrderItemRepository requestOrderItemRepository,
                        MerchantRepository merchantRepository,
                        PurchaseOrderRepository purchaseOrderRepository,
                        PurchaseOrderItemRepository purchaseOrderItemRepository,
                        OfferTimelineService timelineService) {
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.requestOrderRepository = requestOrderRepository;
        this.requestOrderItemRepository = requestOrderItemRepository;
        this.merchantRepository = merchantRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.timelineService = timelineService;
    }

    @Transactional
    public Offer createOffer(OfferDTO createOfferDTO, String username) {
        // Find the request order
        RequestOrder requestOrder = requestOrderRepository.findById(createOfferDTO.getRequestOrderId())
                .orElseThrow(() -> new RuntimeException("Request Order not found"));

        // Create the offer
        Offer offer = Offer.builder()
                .title(createOfferDTO.getTitle())
                .description(createOfferDTO.getDescription())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .status("UNSTARTED")
                .validUntil(createOfferDTO.getValidUntil())
                .notes(createOfferDTO.getNotes())
                .requestOrder(requestOrder)
                .offerItems(new ArrayList<>())
                .timelineEvents(new ArrayList<>())
                .currentAttemptNumber(1)
                .totalRetries(0)
                .build();

        // Save the offer
        Offer savedOffer = offerRepository.save(offer);

        // Create offer items if provided
        if (createOfferDTO.getOfferItems() != null && !createOfferDTO.getOfferItems().isEmpty()) {
            List<OfferItem> offerItems = createOfferItems(createOfferDTO.getOfferItems(), savedOffer);
            savedOffer.setOfferItems(offerItems);
        }

        return savedOffer;
    }

    private List<OfferItem> createOfferItems(List<OfferItemDTO> offerItemDTOs, Offer offer) {
        List<OfferItem> savedItems = new ArrayList<>();

        for (OfferItemDTO dto : offerItemDTOs) {
            // Find the request order item
            RequestOrderItem requestOrderItem = requestOrderItemRepository.findById(dto.getRequestOrderItemId())
                    .orElseThrow(() -> new RuntimeException("Request Order Item not found"));

            // Find the merchant
            Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                    .orElseThrow(() -> new RuntimeException("Merchant not found"));

            // Create the offer item using setters
            OfferItem offerItem = new OfferItem();
            offerItem.setQuantity(dto.getQuantity());
            offerItem.setUnitPrice(dto.getUnitPrice());
            offerItem.setTotalPrice(dto.getTotalPrice());
            offerItem.setCurrency(dto.getCurrency());
            offerItem.setMerchant(merchant);
            offerItem.setOffer(offer);
            offerItem.setRequestOrderItem(requestOrderItem);
            offerItem.setEstimatedDeliveryDays(dto.getEstimatedDeliveryDays());
            offerItem.setDeliveryNotes(dto.getDeliveryNotes());
            offerItem.setComment(dto.getComment());

            OfferItem savedItem = offerItemRepository.save(offerItem);
            savedItems.add(savedItem);
        }

        return savedItems;
    }

    @Transactional
    public List<OfferItem> addOfferItems(UUID offerId, List<OfferItemDTO> offerItemDTOs) {
        if (offerItemDTOs == null || offerItemDTOs.isEmpty()) {
            throw new IllegalArgumentException("At least one offer item is required");
        }

        // Find the offer
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        List<OfferItem> savedItems = new ArrayList<>();

        for (OfferItemDTO dto : offerItemDTOs) {
            // Find the request order item
            RequestOrderItem requestOrderItem = requestOrderItemRepository.findById(dto.getRequestOrderItemId())
                    .orElseThrow(() -> new RuntimeException("Request Order Item not found"));

            // Find the merchant
            Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                    .orElseThrow(() -> new RuntimeException("Merchant not found"));

            // Create OfferItem using simple setters
            OfferItem offerItem = new OfferItem();
            offerItem.setQuantity(dto.getQuantity());
            offerItem.setUnitPrice(dto.getUnitPrice());
            offerItem.setTotalPrice(dto.getTotalPrice());
            offerItem.setCurrency(dto.getCurrency());
            offerItem.setMerchant(merchant);
            offerItem.setOffer(offer);
            offerItem.setRequestOrderItem(requestOrderItem);
            offerItem.setEstimatedDeliveryDays(dto.getEstimatedDeliveryDays());
            offerItem.setDeliveryNotes(dto.getDeliveryNotes());
            offerItem.setComment(dto.getComment());

            OfferItem savedItem = offerItemRepository.save(offerItem);
            savedItems.add(savedItem);
        }

        return savedItems;
    }

    /**
     * Updated method to use timeline service
     */
    @Transactional
    public Offer updateOfferStatus(UUID offerId, String status, String username, String rejectionReason) {
        // Use timeline service for key status changes
        switch (status) {
            case "SUBMITTED":
                return timelineService.submitOffer(offerId, username);
            case "MANAGERACCEPTED":
                return timelineService.acceptOfferByManager(offerId, username);
            case "MANAGERREJECTED":
                return timelineService.rejectOfferByManager(offerId, username, rejectionReason);
            case "FINANCE_ACCEPTED":
            case "FINANCE_REJECTED":
            case "FINANCE_PARTIALLY_ACCEPTED":
                return timelineService.processFinanceDecision(offerId, status, username, rejectionReason);
        }

        // Fallback for other statuses
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        offer.setStatus(status);
        return offerRepository.save(offer);
    }

    @Transactional
    public OfferItem updateOfferItem(UUID offerItemId, OfferItemDTO offerItemDTO) {
        OfferItem offerItem = offerItemRepository.findById(offerItemId)
                .orElseThrow(() -> new RuntimeException("Offer Item not found"));

        // Update the merchant if it's changed
        if (offerItemDTO.getMerchantId() != null &&
                !offerItemDTO.getMerchantId().equals(offerItem.getMerchant().getId())) {
            Merchant merchant = merchantRepository.findById(offerItemDTO.getMerchantId())
                    .orElseThrow(() -> new RuntimeException("Merchant not found"));
            offerItem.setMerchant(merchant);
        }

        // Update the request order item if it's changed
        if (offerItemDTO.getRequestOrderItemId() != null &&
                !offerItemDTO.getRequestOrderItemId().equals(offerItem.getRequestOrderItem().getId())) {
            RequestOrderItem requestOrderItem = requestOrderItemRepository.findById(offerItemDTO.getRequestOrderItemId())
                    .orElseThrow(() -> new RuntimeException("Request Order Item not found"));
            offerItem.setRequestOrderItem(requestOrderItem);
        }

        // Update other fields
        if (offerItemDTO.getQuantity() > 0) {
            offerItem.setQuantity(offerItemDTO.getQuantity());
        }

        if (offerItemDTO.getUnitPrice() != null) {
            offerItem.setUnitPrice(offerItemDTO.getUnitPrice());
        }

        if (offerItemDTO.getTotalPrice() != null) {
            offerItem.setTotalPrice(offerItemDTO.getTotalPrice());
        }

        if (offerItemDTO.getCurrency() != null) {
            offerItem.setCurrency(offerItemDTO.getCurrency());
        }

        if (offerItemDTO.getEstimatedDeliveryDays() != null) {
            offerItem.setEstimatedDeliveryDays(offerItemDTO.getEstimatedDeliveryDays());
        }

        if (offerItemDTO.getDeliveryNotes() != null) {
            offerItem.setDeliveryNotes(offerItemDTO.getDeliveryNotes());
        }

        if (offerItemDTO.getComment() != null) {
            offerItem.setComment(offerItemDTO.getComment());
        }

        return offerItemRepository.save(offerItem);
    }

    @Transactional
    public void deleteOfferItem(UUID offerItemId) {
        try {
            // Find the offer item first
            OfferItem offerItem = offerItemRepository.findById(offerItemId)
                    .orElseThrow(() -> new RuntimeException("Offer Item not found with ID: " + offerItemId));

            // Store the parent offer ID before deleting
            UUID offerId = null;
            if (offerItem.getOffer() != null) {
                offerId = offerItem.getOffer().getId();
            }

            // Delete the offer item directly
            offerItemRepository.delete(offerItem);

            // If we have a parent offer ID, update its cache
            if (offerId != null) {
                Offer parentOffer = offerRepository.findById(offerId)
                        .orElse(null);

                if (parentOffer != null && parentOffer.getOfferItems() != null) {
                    // Force refresh the cache by removing any reference to the deleted item
                    parentOffer.getOfferItems().removeIf(item -> item.getId().equals(offerItemId));
                    offerRepository.save(parentOffer);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete offer item: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteOffer(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Delete the offer (and all its items and timeline events due to cascade)
        offerRepository.delete(offer);
    }

    public List<Offer> getAllOffers() {
        return offerRepository.findAll();
    }

    public List<Offer> getOffersByRequestOrder(UUID requestOrderId) {
        RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
                .orElseThrow(() -> new RuntimeException("Request Order not found"));

        return offerRepository.findByRequestOrder(requestOrder);
    }

    public Offer getOfferById(UUID offerId) {
        return offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
    }

    public List<OfferItem> getOfferItemsByOffer(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        return offer.getOfferItems();
    }

    public List<OfferItem> getOfferItemsByRequestOrderItem(UUID requestOrderItemId) {
        RequestOrderItem requestOrderItem = requestOrderItemRepository.findById(requestOrderItemId)
                .orElseThrow(() -> new RuntimeException("Request Order Item not found"));

        return offerItemRepository.findByRequestOrderItem(requestOrderItem);
    }

    public List<Offer> getOffersByStatus(String status) {
        return offerRepository.findByStatus(status);
    }

    public RequestOrder getRequestOrderByOfferId(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        if (offer.getRequestOrder() == null) {
            throw new RuntimeException("No request order associated with this offer");
        }

        return offer.getRequestOrder();
    }

    /**
     * Updated retry method to use timeline service - SIMPLIFIED VERSION
     */
    @Transactional
    public Offer retryOffer(UUID offerId, String username) {
        // Find the rejected offer
        Offer rejectedOffer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Verify that the offer is in a REJECTED status
        if (!rejectedOffer.canRetry()) {
            throw new IllegalStateException("Only rejected offers can be retried");
        }

        // Check if there's already an active offer in progress for this request order
        List<Offer> existingOffers = getOffersByRequestOrder(rejectedOffer.getRequestOrder().getId());
        boolean activeOfferExists = existingOffers.stream()
                .filter(offer -> !offer.getId().equals(offerId))
                .anyMatch(offer -> "UNSTARTED".equals(offer.getStatus()) || "INPROGRESS".equals(offer.getStatus()));

        if (activeOfferExists) {
            throw new IllegalStateException("A retry for this offer is already in progress.");
        }

        // Use timeline service to handle the retry - NO MORE CREATING NEW OFFERS!
        Offer retriedOffer = timelineService.retryOffer(offerId, username);

        // Update the title to reflect retry
        String baseTitle = rejectedOffer.getTitle()
                .replaceAll("\\s*\\(Retry\\s*\\d*\\)\\s*$", "")
                .replaceAll("\\s*\\(Retry\\s*#\\d+\\)\\s*$", "")
                .trim();

        String newTitle = baseTitle + " (Retry " + retriedOffer.getTotalRetries() + ")";
        retriedOffer.setTitle(newTitle);

        return offerRepository.save(retriedOffer);
    }

    @Transactional
    public Offer updateFinanceStatus(UUID offerId, String financeStatus) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        offer.setFinanceStatus(financeStatus);
        return offerRepository.save(offer);
    }

    public List<Offer> getOffersByFinanceStatus(String financeStatus) {
        return offerRepository.findByFinanceStatus(financeStatus);
    }

    @Transactional
    public OfferItem updateOfferItemFinanceStatus(UUID offerItemId, String status, String rejectionReason) {
        OfferItem offerItem = offerItemRepository.findById(offerItemId)
                .orElseThrow(() -> new RuntimeException("Offer Item not found"));

        offerItem.setFinanceStatus(status); // FINANCE_ACCEPTED or FINANCE_REJECTED

        if ("FINANCE_REJECTED".equals(status) && rejectionReason != null) {
            offerItem.setRejectionReason(rejectionReason);
        }

        // Update the parent offer's finance status to IN_PROGRESS
        Offer offer = offerItem.getOffer();
        if (!"FINANCE_IN_PROGRESS".equals(offer.getFinanceStatus())) {
            offer.setFinanceStatus("FINANCE_IN_PROGRESS");
            offerRepository.save(offer);
        }

        return offerItemRepository.save(offerItem);
    }

    public List<Offer> getFinanceCompletedOffers() {
        return offerRepository.findAll().stream()
                .filter(offer ->
                        "FINANCE_ACCEPTED".equals(offer.getFinanceStatus()) ||
                                "FINANCE_REJECTED".equals(offer.getFinanceStatus()) ||
                                "FINANCE_PARTIALLY_ACCEPTED".equals(offer.getFinanceStatus())
                )
                .collect(Collectors.toList());
    }

    @Transactional
    public Offer completeFinanceReview(UUID offerId, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Check if all items have a finance status
        long unprocessedItems = offer.getOfferItems().stream()
                .filter(item -> item.getFinanceStatus() == null)
                .count();

        if (unprocessedItems > 0) {
            throw new RuntimeException("Cannot complete review: " + unprocessedItems +
                    " items have not been processed");
        }

        // Count accepted and rejected items
        long acceptedItemsCount = offer.getOfferItems().stream()
                .filter(item -> "FINANCE_ACCEPTED".equals(item.getFinanceStatus()))
                .count();

        long rejectedItemsCount = offer.getOfferItems().stream()
                .filter(item -> "FINANCE_REJECTED".equals(item.getFinanceStatus()))
                .count();

        // Determine the final status
        String finalStatus;
        if (acceptedItemsCount == 0) {
            finalStatus = "FINANCE_REJECTED";
        } else if (rejectedItemsCount == 0) {
            finalStatus = "FINANCE_ACCEPTED";
        } else {
            finalStatus = "FINANCE_PARTIALLY_ACCEPTED";
        }

        // Use the main updateOfferStatus method to set status and timeline fields
        offer = updateOfferStatus(offer.getId(), finalStatus, username, null);

        // If there are accepted items, create a purchase order
        if (acceptedItemsCount > 0) {
            createPurchaseOrder(offer, username);
        }

        return offer;
    }

    @Transactional
    public PurchaseOrder createPurchaseOrder(Offer offer, String username) {
        // Find accepted items
        List<OfferItem> acceptedItems = offer.getOfferItems().stream()
                .filter(item -> "FINANCE_ACCEPTED".equals(item.getFinanceStatus()))
                .collect(Collectors.toList());

        if (acceptedItems.isEmpty()) {
            return null;
        }

        // Generate PO number (you can customize this format)
        String poNumber = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Create purchase order
        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .createdAt(LocalDateTime.now())
                .status("PENDING")
                .requestOrder(offer.getRequestOrder())
                .offer(offer)  // Set reference to the offer
                .createdBy(username)
                .purchaseOrderItems(new ArrayList<>())
                .paymentTerms("Net 30") // Default
                .currency("EGP")  // Default
                .build();

        PurchaseOrder savedPO = purchaseOrderRepository.save(po);

        // Create purchase order items for each accepted offer item
        double totalAmount = 0.0;

        for (OfferItem offerItem : acceptedItems) {
            // Convert unit price and total price to double safely
            double unitPrice = offerItem.getUnitPrice().doubleValue();
            double totalPrice = offerItem.getTotalPrice().doubleValue();

            PurchaseOrderItem poItem = PurchaseOrderItem.builder()
                    .quantity(offerItem.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .comment(offerItem.getComment())
                    .purchaseOrder(savedPO)
                    .offerItem(offerItem)  // Set reference to the offer item
                    .status("PROCESSING")
                    .estimatedDeliveryDays(offerItem.getEstimatedDeliveryDays())
                    .deliveryNotes(offerItem.getDeliveryNotes())
                    .build();

            PurchaseOrderItem savedItem = purchaseOrderItemRepository.save(poItem);

            // Set the reference in the offer item as well (bidirectional)
            offerItem.setPurchaseOrderItem(savedItem);
            offerItemRepository.save(offerItem);

            totalAmount += totalPrice;
        }

        // Update totals and expected delivery
        savedPO.setTotalAmount(totalAmount);

        // Calculate expected delivery date based on the max estimated delivery days
        int maxDeliveryDays = acceptedItems.stream()
                .mapToInt(OfferItem::getEstimatedDeliveryDays)
                .max()
                .orElse(30); // Default to 30 days

        savedPO.setExpectedDeliveryDate(LocalDateTime.now().plusDays(maxDeliveryDays));

        return purchaseOrderRepository.save(savedPO);
    }

    /**
     * NEW METHODS FOR TIMELINE FUNCTIONALITY
     */

    /**
     * Get timeline for an offer
     */
    public List<OfferTimelineEvent> getOfferTimeline(UUID offerId) {
        return timelineService.getCompleteTimeline(offerId);
    }

    /**
     * Get events that can be retried from
     */
    public List<OfferTimelineEvent> getRetryableEvents(UUID offerId) {
        return timelineService.getRetryableEvents(offerId);
    }

    // Add this method to your OfferService class

    /**
     * Get timeline for a specific attempt
     */
    public List<OfferTimelineEvent> getTimelineForAttempt(UUID offerId, int attemptNumber) {
        return timelineService.getCompleteTimeline(offerId)
                .stream()
                .filter(event -> event.getAttemptNumber() == attemptNumber)
                .toList();
    }

    // Add this method to your OfferService.java class
// This version handles both int and double quantity types

    /**
     * Continue and Return functionality - simplified approach
     * Original offer continues to finalization, new offer created for remaining quantities
     */
    /**
     * Continue and Return functionality - simplified approach
     * Original offer continues to finalization, new offer created for remaining quantities
     */
    @Transactional
    public Map<String, Object> continueAndReturnOffer(UUID offerId, String username) {
        // Find the original offer
        Offer originalOffer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Verify that the offer has been finance reviewed
        if (!Arrays.asList("FINANCE_PARTIALLY_ACCEPTED", "FINANCE_ACCEPTED").contains(originalOffer.getStatus())) {
            throw new IllegalStateException("Only finance reviewed offers can be processed with continue and return");
        }

        Map<String, Object> result = new HashMap<>();

        // Step 1: Get accepted items from original offer (FIXED)
        List<OfferItem> acceptedItems = originalOffer.getOfferItems().stream()
                .filter(item -> "ACCEPTED".equals(item.getFinanceStatus()))  // FIXED
                .collect(Collectors.toList());

        if (acceptedItems.isEmpty()) {
            throw new IllegalStateException("No accepted items found in this offer");
        }

        // Step 2: Calculate remaining quantities BEFORE modifying the original offer
        Map<UUID, Double> remainingQuantities = calculateRemainingQuantities(originalOffer, acceptedItems);

        // Step 3: Update original offer to continue to finalization with only accepted items
        // Remove rejected items from the original offer (FIXED)
        List<OfferItem> rejectedItems = originalOffer.getOfferItems().stream()
                .filter(item -> "REJECTED".equals(item.getFinanceStatus()))  // FIXED
                .collect(Collectors.toList());

        // Delete rejected items from database
        for (OfferItem rejectedItem : rejectedItems) {
            offerItemRepository.delete(rejectedItem);
        }

        // Update original offer status to move to finalization
        originalOffer.setStatus("FINALIZING");
        originalOffer.getOfferItems().removeAll(rejectedItems);
        Offer continuingOffer = offerRepository.save(originalOffer);
        result.put("acceptedOffer", continuingOffer);

        // Step 4: Create new offer for remaining quantities if any exist
        if (!remainingQuantities.isEmpty()) {
            Offer newOffer = createNewOfferForRemaining(originalOffer, remainingQuantities, username);
            result.put("newOffer", newOffer);
        }

        // Step 5: Record the action in timeline
        double totalRemainingQuantity = remainingQuantities.values().stream()
                .mapToDouble(Double::doubleValue)
                .sum();
        timelineService.recordOfferSplit(offerId, username, acceptedItems.size(), (int) totalRemainingQuantity);

        return result;
    }

    /**
     * Helper method: Calculate remaining quantities that need to be fulfilled
     * Using Double to handle both int and double quantity types
     */
    private Map<UUID, Double> calculateRemainingQuantities(Offer originalOffer, List<OfferItem> acceptedItems) {
        Map<UUID, Double> remainingQuantities = new HashMap<>();

        // Group accepted items by request order item and sum their quantities
        Map<UUID, Double> acceptedQuantitiesByItem = acceptedItems.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getRequestOrderItem().getId(),
                        Collectors.summingDouble(OfferItem::getQuantity)
                ));

        // Check each request order item for remaining quantities
        for (RequestOrderItem requestItem : originalOffer.getRequestOrder().getRequestItems()) {
            double requestedQuantity = requestItem.getQuantity(); // Required (e.g., 30.0)
            double acceptedQuantity = acceptedQuantitiesByItem.getOrDefault(requestItem.getId(), 0.0); // Accepted (e.g., 20.0)

            if (acceptedQuantity < requestedQuantity) {
                double remaining = requestedQuantity - acceptedQuantity; // Remaining (e.g., 10.0)
                remainingQuantities.put(requestItem.getId(), remaining);

                System.out.println("DEBUG - Item " + requestItem.getId() +
                        ": Required=" + requestedQuantity +
                        ", Accepted=" + acceptedQuantity +
                        ", Remaining=" + remaining);
            }
        }

        return remainingQuantities;
    }

    /**
     * Helper method: Create new offer for remaining quantities
     */
    /**
     * Helper method: Create new offer for remaining quantities
     * Creates new RequestOrder and RequestOrderItems with only remaining quantities
     */
    /**
     * Helper method: Create new offer for remaining quantities
     * Creates new RequestOrder and RequestOrderItems with only remaining quantities
     */
    private Offer createNewOfferForRemaining(Offer originalOffer, Map<UUID, Double> remainingQuantities, String username) {
        // Create new offer title
        String newTitle = originalOffer.getTitle()
                .replaceAll("\\s*\\(Retry\\s*\\d*\\)\\s*$", "")
                .replaceAll("\\s*\\(Remaining\\)\\s*$", "")
                .trim() + " (Remaining)";

        // Create new RequestOrder for the remaining quantities
        RequestOrder newRequestOrder = RequestOrder.builder()
                .title(originalOffer.getRequestOrder().getTitle() + " (Remaining)")
                .description("Remaining quantities from original request: " + originalOffer.getRequestOrder().getId())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .status("APPROVED") // Keep same status as original
                .partyType(originalOffer.getRequestOrder().getPartyType())
                .requesterId(originalOffer.getRequestOrder().getRequesterId())
                .requesterName(originalOffer.getRequestOrder().getRequesterName())
                .employeeRequestedBy(originalOffer.getRequestOrder().getEmployeeRequestedBy())
                .deadline(originalOffer.getRequestOrder().getDeadline())
                .requestItems(new ArrayList<>())
                .offers(new ArrayList<>())
                .build();

        RequestOrder savedRequestOrder = requestOrderRepository.save(newRequestOrder);

        // Create new RequestOrderItems with only the remaining quantities
        for (Map.Entry<UUID, Double> entry : remainingQuantities.entrySet()) {
            // Find the original request item
            RequestOrderItem originalItem = originalOffer.getRequestOrder().getRequestItems().stream()
                    .filter(item -> item.getId().equals(entry.getKey()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Original request item not found"));

            // Create new request item with only the remaining quantity
            RequestOrderItem newRequestItem = RequestOrderItem.builder()
                    .quantity(entry.getValue()) // This will be 10.0, not 30.0
                    .itemType(originalItem.getItemType())
                    .comment("Remaining quantity from original request item")
                    .requestOrder(savedRequestOrder)
                    .build();

            RequestOrderItem savedRequestItem = requestOrderItemRepository.save(newRequestItem);
            savedRequestOrder.getRequestItems().add(savedRequestItem);
        }

        // Save the updated request order
        requestOrderRepository.save(savedRequestOrder);

        // Create the new offer
        Offer newOffer = Offer.builder()
                .title(newTitle)
                .description("New offer for remaining quantities after continue & return. Original offer ID: " + originalOffer.getId())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .status("INPROGRESS")
                .validUntil(originalOffer.getValidUntil())
                .notes("Created for remaining quantities only. Original offer: " + originalOffer.getId())
                .requestOrder(savedRequestOrder) // Use new RequestOrder with remaining quantities
                .offerItems(new ArrayList<>())
                .timelineEvents(new ArrayList<>())
                .currentAttemptNumber(1)
                .totalRetries(0)
                .build();

        Offer savedNewOffer = offerRepository.save(newOffer);

        // Add the new offer to the request order's offers list
        savedRequestOrder.getOffers().add(savedNewOffer);
        requestOrderRepository.save(savedRequestOrder);

        return savedNewOffer;
    }
}