package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.mappers.procurement.*;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.*;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.models.finance.accountsPayable.enums.OfferFinanceValidationStatus;
import com.example.backend.models.procurement.TimelineEventType;

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

    private final ItemTypeRepository itemTypeRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final OfferTimelineService timelineService;
    private final PaymentRequestService paymentRequestService;
    private final OfferRequestItemService offerRequestItemService;

    // Add mappers
    private final OfferMapper offerMapper;
    private final OfferItemMapper offerItemMapper;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final RequestOrderMapper requestOrderMapper;
    private final OfferTimelineEventMapper timelineEventMapper;

    @Autowired
    public OfferService(OfferRepository offerRepository,
                        OfferItemRepository offerItemRepository,
                        RequestOrderRepository requestOrderRepository,
                        RequestOrderItemRepository requestOrderItemRepository,
                        MerchantRepository merchantRepository,
                        ItemTypeRepository itemTypeRepository ,
                        PurchaseOrderRepository purchaseOrderRepository,
                        PurchaseOrderItemRepository purchaseOrderItemRepository,
                        OfferTimelineService timelineService,
                        OfferMapper offerMapper,
                        OfferItemMapper offerItemMapper,
                        PurchaseOrderMapper purchaseOrderMapper,
                        RequestOrderMapper requestOrderMapper,
                        OfferTimelineEventMapper timelineEventMapper,
                        PaymentRequestService paymentRequestService,OfferRequestItemService offerRequestItemService) {
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.requestOrderRepository = requestOrderRepository;
        this.requestOrderItemRepository = requestOrderItemRepository;
        this.merchantRepository = merchantRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.timelineService = timelineService;
        this.offerMapper = offerMapper;
        this.offerItemMapper = offerItemMapper;
        this.purchaseOrderMapper = purchaseOrderMapper;
        this.requestOrderMapper = requestOrderMapper;
        this.timelineEventMapper = timelineEventMapper;
        this.itemTypeRepository = itemTypeRepository;
        this.paymentRequestService = paymentRequestService;
        this.offerRequestItemService = offerRequestItemService;

        // ADD THIS LINE:
        System.out.println("🚀🚀🚀 OfferService initialized! PaymentRequestService is: " + (this.paymentRequestService != null ? "AVAILABLE ✓" : "NULL ✗"));

    }

    @Transactional
    public OfferDTO createOffer(OfferDTO createOfferDTO, String username) {
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

        return offerMapper.toDTO(savedOffer);
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
            offerItem.setItemType(requestOrderItem.getItemType());
            offerItem.setEstimatedDeliveryDays(dto.getEstimatedDeliveryDays());
            offerItem.setDeliveryNotes(dto.getDeliveryNotes());
            offerItem.setComment(dto.getComment());

            OfferItem savedItem = offerItemRepository.save(offerItem);
            savedItems.add(savedItem);
        }

        return savedItems;
    }

    @Transactional
    public List<OfferItemDTO> addOfferItems(UUID offerId, List<OfferItemDTO> offerItemDTOs) {
        if (offerItemDTOs == null || offerItemDTOs.isEmpty()) {
            throw new IllegalArgumentException("At least one offer item is required");
        }

        // Find the offer
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Get effective request items for this offer
        List<OfferRequestItemDTO> effectiveItems = offerRequestItemService.getEffectiveRequestItems(offerId);

        List<OfferItem> savedItems = new ArrayList<>();

        for (OfferItemDTO dto : offerItemDTOs) {
            // Find the merchant
            Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                    .orElseThrow(() -> new RuntimeException("Merchant not found"));

            // Find the item type
            UUID itemTypeId = dto.getItemTypeId();
            if (itemTypeId == null) {
                throw new RuntimeException("Item type ID is required");
            }

            ItemType itemType = itemTypeRepository.findById(itemTypeId)
                    .orElseThrow(() -> new RuntimeException("Item type not found: " + itemTypeId));

            // Find the effective request item for this item type
            OfferRequestItemDTO effectiveItem = effectiveItems.stream()
                    .filter(item -> item.getItemTypeId().equals(itemTypeId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Item type not found in request items: " + itemTypeId));

            // Get or create RequestOrderItem
            RequestOrderItem requestOrderItem;
            RequestOrder requestOrder = offer.getRequestOrder();

            if (effectiveItem.getOriginalRequestOrderItemId() != null) {
                // This is a modified quantity of an existing item - link to original
                requestOrderItem = requestOrderItemRepository.findById(effectiveItem.getOriginalRequestOrderItemId())
                        .orElseThrow(() -> new RuntimeException("Original request order item not found"));
            } else {
                // This is a NEW item added via "Modify Items"
                // Check if a RequestOrderItem already exists for this item type
                Optional<RequestOrderItem> existingItem = requestOrder.getRequestItems().stream()
                        .filter(item -> item.getItemType().getId().equals(itemTypeId))
                        .findFirst();

                if (existingItem.isPresent()) {
                    requestOrderItem = existingItem.get();
                } else {
                    // Create a new RequestOrderItem for this newly added item
                    requestOrderItem = new RequestOrderItem();
                    requestOrderItem.setRequestOrder(requestOrder);
                    requestOrderItem.setItemType(itemType);
                    requestOrderItem.setQuantity((int) effectiveItem.getQuantity());
                    requestOrderItem.setComment("Added during offer modification - OfferRequestItem ID: " + effectiveItem.getId());
                    requestOrderItem = requestOrderItemRepository.save(requestOrderItem);
                }
            }

            // Create OfferItem
            OfferItem offerItem = new OfferItem();
            offerItem.setQuantity(dto.getQuantity());
            offerItem.setUnitPrice(dto.getUnitPrice());
            offerItem.setTotalPrice(dto.getTotalPrice());
            offerItem.setCurrency(dto.getCurrency());
            offerItem.setMerchant(merchant);
            offerItem.setOffer(offer);
            offerItem.setRequestOrderItem(requestOrderItem);
            offerItem.setItemType(itemType);
            offerItem.setEstimatedDeliveryDays(dto.getEstimatedDeliveryDays());
            offerItem.setDeliveryNotes(dto.getDeliveryNotes());
            offerItem.setComment(dto.getComment());

            OfferItem savedItem = offerItemRepository.save(offerItem);
            savedItems.add(savedItem);
        }

        return offerItemMapper.toDTOList(savedItems);
    }
    /**
     * Updated method to use timeline service
     */
    @Transactional
    public OfferDTO updateOfferStatus(UUID offerId, String status, String username, String rejectionReason) {
        // Use timeline service for key status changes
        Offer updatedOffer;
        switch (status) {
            case "SUBMITTED":
                updatedOffer = timelineService.submitOffer(offerId, username);
                break;
            case "MANAGERACCEPTED":
                updatedOffer = timelineService.acceptOfferByManager(offerId, username);
                break;
            case "MANAGERREJECTED":
                updatedOffer = timelineService.rejectOfferByManager(offerId, username, rejectionReason);
                break;
            case "FINANCE_ACCEPTED":
            case "FINANCE_REJECTED":
            case "FINANCE_PARTIALLY_ACCEPTED":
                updatedOffer = timelineService.processFinanceDecision(offerId, status, username, rejectionReason);
                break;
            default:
                // Fallback for other statuses
                Offer offer = offerRepository.findById(offerId)
                        .orElseThrow(() -> new RuntimeException("Offer not found"));
                offer.setStatus(status);
                updatedOffer = offerRepository.save(offer);
                break;
        }

        return offerMapper.toDTO(updatedOffer);
    }

    @Transactional
    public OfferItemDTO updateOfferItem(UUID offerItemId, OfferItemDTO offerItemDTO) {
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

        OfferItem updatedItem = offerItemRepository.save(offerItem);
        return offerItemMapper.toDTO(updatedItem);
    }

    @Transactional
    public void deleteOfferItem(UUID offerItemId) {
        try {
            System.out.println("=== DEBUG: Deleting offer item " + offerItemId + " ===");

            // Find the offer item first
            OfferItem offerItem = offerItemRepository.findById(offerItemId)
                    .orElseThrow(() -> new RuntimeException("Offer Item not found with ID: " + offerItemId));

            System.out.println("✓ Found offer item: " + offerItem.getId());

            // Store the parent offer ID before deleting
            UUID offerId = null;
            if (offerItem.getOffer() != null) {
                offerId = offerItem.getOffer().getId();
            }

            // CRITICAL: Check if this offer item is linked to a purchase order item
            if (offerItem.getPurchaseOrderItem() != null) {
                System.out.println("WARNING: Offer item is linked to purchase order item: " +
                        offerItem.getPurchaseOrderItem().getId());
                throw new RuntimeException("Cannot delete offer item that is linked to a purchase order. " +
                        "Please delete or unlink the purchase order first.");
            }

            // Check if this offer item has any OfferRequestItems pointing to it
            // (This shouldn't normally happen, but let's be safe)
            System.out.println("DEBUG: Checking for OfferRequestItem dependencies...");

            // Delete the offer item directly
            System.out.println("DEBUG: Deleting offer item from database...");
            offerItemRepository.delete(offerItem);
            offerItemRepository.flush(); // Force the delete to execute immediately

            System.out.println("✓ Offer item deleted from database");

            // If we have a parent offer ID, update its cache
            if (offerId != null) {
                System.out.println("DEBUG: Refreshing parent offer cache...");
                Offer parentOffer = offerRepository.findById(offerId).orElse(null);

                if (parentOffer != null) {
                    // Force refresh the offer items collection
                    parentOffer.getOfferItems().size(); // This triggers lazy loading
                    parentOffer.getOfferItems().removeIf(item -> item.getId().equals(offerItemId));
                    offerRepository.save(parentOffer);
                    System.out.println("✓ Parent offer cache updated");
                }
            }

            System.out.println("=== DEBUG: Delete completed successfully ===");

        } catch (Exception e) {
            System.err.println("=== ERROR in deleteOfferItem ===");
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
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

    public List<OfferDTO> getAllOffers() {
        List<Offer> offers = offerRepository.findAll();
        return offerMapper.toDTOList(offers);
    }

    public List<OfferDTO> getOffersByRequestOrder(UUID requestOrderId) {
        RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
                .orElseThrow(() -> new RuntimeException("Request Order not found"));

        List<Offer> offers = offerRepository.findByRequestOrder(requestOrder);
        return offerMapper.toDTOList(offers);
    }

    public OfferDTO getOfferById(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        return offerMapper.toDTO(offer);
    }

    public List<OfferItemDTO> getOfferItemsByOffer(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        return offerItemMapper.toDTOList(offer.getOfferItems());
    }

    public List<OfferItemDTO> getOfferItemsByRequestOrderItem(UUID requestOrderItemId) {
        RequestOrderItem requestOrderItem = requestOrderItemRepository.findById(requestOrderItemId)
                .orElseThrow(() -> new RuntimeException("Request Order Item not found"));

        List<OfferItem> offerItems = offerItemRepository.findByRequestOrderItem(requestOrderItem);
        return offerItemMapper.toDTOList(offerItems);
    }

    public List<OfferDTO> getOffersByStatus(String status) {
        List<Offer> offers = offerRepository.findByStatus(status);
        return offerMapper.toDTOList(offers);
    }

    public RequestOrderDTO getRequestOrderByOfferId(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        if (offer.getRequestOrder() == null) {
            throw new RuntimeException("No request order associated with this offer");
        }

        return requestOrderMapper.toDTO(offer.getRequestOrder());
    }

    /**
     * Updated retry method to use timeline service - SIMPLIFIED VERSION
     */
    @Transactional
    public OfferDTO retryOffer(UUID offerId, String username) {
        // Find the rejected offer
        Offer rejectedOffer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Verify that the offer is in a REJECTED status
        if (!rejectedOffer.canRetry()) {
            throw new IllegalStateException("Only rejected offers can be retried");
        }

        // Check if there's already an active offer in progress for this request order
        List<Offer> existingOffers = offerRepository.findByRequestOrder(rejectedOffer.getRequestOrder());
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

        Offer savedOffer = offerRepository.save(retriedOffer);
        return offerMapper.toDTO(savedOffer);
    }

    @Transactional
    public OfferDTO updateFinanceStatus(UUID offerId, String financeStatus) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        offer.setFinanceStatus(financeStatus);
        Offer savedOffer = offerRepository.save(offer);
        return offerMapper.toDTO(savedOffer);
    }

    public List<OfferDTO> getOffersByFinanceStatus(String financeStatus) {
        List<Offer> offers = offerRepository.findByFinanceStatus(financeStatus);
        return offerMapper.toDTOList(offers);
    }

    @Transactional
    public OfferItemDTO updateOfferItemFinanceStatus(UUID offerItemId, String status, String rejectionReason) {
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

        OfferItem savedItem = offerItemRepository.save(offerItem);
        return offerItemMapper.toDTO(savedItem);
    }

    public List<OfferDTO> getFinanceCompletedOffers() {
        List<Offer> offers = offerRepository.findAll().stream()
                .filter(offer ->
                        "FINANCE_ACCEPTED".equals(offer.getFinanceStatus()) ||
                                "FINANCE_REJECTED".equals(offer.getFinanceStatus()) ||
                                "FINANCE_PARTIALLY_ACCEPTED".equals(offer.getFinanceStatus())
                )
                .collect(Collectors.toList());

        return offerMapper.toDTOList(offers);
    }

    @Transactional
    public OfferDTO completeFinanceReview(UUID offerId, String username) {
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
        OfferDTO updatedOfferDTO = updateOfferStatus(offer.getId(), finalStatus, username, null);

        // If there are accepted items, create a purchase order
        if (acceptedItemsCount > 0) {
            Offer updatedOffer = offerRepository.findById(offerId)
                    .orElseThrow(() -> new RuntimeException("Offer not found"));
            createPurchaseOrder(updatedOffer, username);
        }

        return updatedOfferDTO;
    }

    /**
     * Updated method to create purchase order with proper item creation
     */
    @Transactional
    public PurchaseOrderDTO createPurchaseOrder(Offer offer, String username) {
        // Find accepted items
        List<OfferItem> acceptedItems = offer.getOfferItems().stream()
                .filter(item -> "ACCEPTED".equals(item.getFinanceStatus()))
                .collect(Collectors.toList());

        if (acceptedItems.isEmpty()) {
            return null;
        }

        PurchaseOrder po = createPurchaseOrderForItems(offer, acceptedItems, username);
        return purchaseOrderMapper.toDTO(po);
    }

    /**
     * NEW METHODS FOR TIMELINE FUNCTIONALITY
     */

    /**
     * Get timeline for an offer
     */
    public List<OfferTimelineEventDTO> getOfferTimeline(UUID offerId) {
        List<OfferTimelineEvent> events = timelineService.getCompleteTimeline(offerId);
        return timelineEventMapper.toDTOList(events);
    }

    /**
     * Get events that can be retried from
     */
    public List<OfferTimelineEventDTO> getRetryableEvents(UUID offerId) {
        List<OfferTimelineEvent> events = timelineService.getRetryableEvents(offerId);
        return timelineEventMapper.toDTOList(events);
    }

    /**
     * Get timeline for a specific attempt
     */
    public List<OfferTimelineEventDTO> getTimelineForAttempt(UUID offerId, int attemptNumber) {
        List<OfferTimelineEvent> events = timelineService.getCompleteTimeline(offerId)
                .stream()
                .filter(event -> event.getAttemptNumber() == attemptNumber)
                .toList();

        return timelineEventMapper.toDTOList(events);
    }

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

        // SAVE THE ORIGINAL TITLE BEFORE MODIFYING IT
        String originalTitle = originalOffer.getTitle();

        // Step 1: Get accepted items from original offer
        List<OfferItem> acceptedItems = originalOffer.getOfferItems().stream()
                .filter(item -> "ACCEPTED".equals(item.getFinanceStatus()))
                .collect(Collectors.toList());

        if (acceptedItems.isEmpty()) {
            throw new IllegalStateException("No accepted items found in this offer");
        }

        // Step 2: Calculate remaining quantities BEFORE modifying the original offer
        Map<UUID, Double> remainingQuantities = calculateRemainingQuantities(originalOffer, acceptedItems);

        // Step 3: Record the split event FIRST (before creating new offer)
        double totalRemainingQuantity = remainingQuantities.values().stream()
                .mapToDouble(Double::doubleValue)
                .sum();
        timelineService.recordOfferSplit(offerId, username, acceptedItems.size(), (int) totalRemainingQuantity);

        // Step 4: Update original offer to continue to finalization with only accepted items
        List<OfferItem> rejectedItems = originalOffer.getOfferItems().stream()
                .filter(item -> "REJECTED".equals(item.getFinanceStatus()))
                .collect(Collectors.toList());

        // Delete rejected items from database
        for (OfferItem rejectedItem : rejectedItems) {
            offerItemRepository.delete(rejectedItem);
        }

        // Update the continuing offer title
        String continuingTitle = originalTitle + " (Continued)";
        originalOffer.setTitle(continuingTitle);

        // Update original offer status to move to finalization
        originalOffer.setStatus("FINALIZING");
        originalOffer.getOfferItems().removeAll(rejectedItems);
        Offer continuingOffer = offerRepository.save(originalOffer);
        result.put("acceptedOfferId", continuingOffer.getId());

        // Step 5: Create new offer for remaining quantities if any exist
        // NOW the timeline copy will include the split event
        if (!remainingQuantities.isEmpty()) {
            // Pass the original title, not the modified one
            Offer newOffer = createNewOfferForRemaining(originalOffer, remainingQuantities, username, originalTitle);
            result.put("newOfferId", newOffer.getId());
        }

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
     * Creates NEW RequestOrder and RequestOrderItems with only remaining quantities
     */
    private Offer createNewOfferForRemaining(Offer originalOffer, Map<UUID, Double> remainingQuantities, String username, String originalTitle) {
        // Create new offer title
        String newTitle = originalTitle
                .replaceAll("\\s*\\(Remaining\\)\\s*$", "")
                .replaceAll("\\s*\\(Continued\\)\\s*$", "")
                .trim() + " (Remaining)";

        // Create a NEW RequestOrder with only the remaining quantities
        RequestOrder originalRequestOrder = originalOffer.getRequestOrder();

        RequestOrder newRequestOrder = RequestOrder.builder()
                .title(originalRequestOrder.getTitle() + " (Remaining)")
                .description("Remaining quantities from original request: " + originalRequestOrder.getId())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .status(originalRequestOrder.getStatus())
                .partyType(originalRequestOrder.getPartyType())
                .requesterId(originalRequestOrder.getRequesterId())
                .requesterName(originalRequestOrder.getRequesterName())
                .employeeRequestedBy(originalRequestOrder.getEmployeeRequestedBy())
                .deadline(originalRequestOrder.getDeadline())
                .requestItems(new ArrayList<>())
                .offers(new ArrayList<>())
                .build();

        RequestOrder savedNewRequestOrder = requestOrderRepository.save(newRequestOrder);

        // Create new RequestOrderItems with only the remaining quantities
        List<RequestOrderItem> newRequestItems = new ArrayList<>();

        for (Map.Entry<UUID, Double> entry : remainingQuantities.entrySet()) {
            UUID originalItemId = entry.getKey();
            Double remainingQuantity = entry.getValue();

            // Find the original request item
            RequestOrderItem originalItem = originalRequestOrder.getRequestItems().stream()
                    .filter(item -> item.getId().equals(originalItemId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Original request item not found: " + originalItemId));

            // Create new request item with remaining quantity
            RequestOrderItem newRequestItem = RequestOrderItem.builder()
                    .quantity(remainingQuantity.intValue()) // Only the remaining quantity
                    .comment(originalItem.getComment() + " (Remaining: " + remainingQuantity + " from original)")
                    .itemType(originalItem.getItemType()) // Same item type
                    .requestOrder(savedNewRequestOrder)
                    .build();

            RequestOrderItem savedNewRequestItem = requestOrderItemRepository.save(newRequestItem);
            newRequestItems.add(savedNewRequestItem);

            System.out.println("DEBUG - Created new request item: " + savedNewRequestItem.getId() +
                    " with quantity: " + remainingQuantity +
                    " (original item " + originalItemId + " had: " + originalItem.getQuantity() + ")");
        }

        // Update the new request order with the new items
        savedNewRequestOrder.setRequestItems(newRequestItems);
        savedNewRequestOrder = requestOrderRepository.save(savedNewRequestOrder);

        // Create the new offer with the NEW RequestOrder (no offer items initially)
        Offer newOffer = Offer.builder()
                .title(newTitle)
                .description("New offer for remaining quantities after continue & return. Original offer ID: " + originalOffer.getId())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .status("INPROGRESS")
                .validUntil(originalOffer.getValidUntil())
                .notes("Created for remaining quantities only. Original offer: " + originalOffer.getId())
                .requestOrder(savedNewRequestOrder) // Use the NEW RequestOrder with remaining quantities
                .offerItems(new ArrayList<>()) // Start with no offer items - user will add solutions
                .timelineEvents(new ArrayList<>())
                .currentAttemptNumber(originalOffer.getCurrentAttemptNumber())
                .totalRetries(originalOffer.getTotalRetries())
                .build();

        Offer savedNewOffer = offerRepository.save(newOffer);

        // Copy timeline history from original offer
        List<OfferTimelineEvent> originalTimeline = timelineService.getCompleteTimeline(originalOffer.getId());

        for (OfferTimelineEvent originalEvent : originalTimeline) {
            timelineService.createTimelineEvent(
                    savedNewOffer,
                    originalEvent.getEventType(),
                    originalEvent.getActionBy(),
                    originalEvent.getNotes(),
                    originalEvent.getPreviousStatus(),
                    originalEvent.getNewStatus()
            );
        }

        // Add the new offer to the NEW request order's offers list
        savedNewRequestOrder.getOffers().add(savedNewOffer);
        requestOrderRepository.save(savedNewRequestOrder);

        return savedNewOffer;
    }

    /**
     * SIMPLE VERSION FOR TESTING - Just finalize items without creating new offer
     */
    @Transactional
    public Map<String, Object> simpleFinalizeOffer(UUID offerId, List<UUID> finalizedItemIds, String username) {
        Map<String, Object> result = new HashMap<>();

        try {
            System.out.println("=== SIMPLE FINALIZE TEST ===");

            Offer offer = offerRepository.findById(offerId)
                    .orElseThrow(() -> new RuntimeException("Offer not found"));

            List<OfferItem> itemsToFinalize = offer.getOfferItems().stream()
                    .filter(item -> finalizedItemIds.contains(item.getId()))
                    .filter(item -> "ACCEPTED".equals(item.getFinanceStatus()) || "FINANCE_ACCEPTED".equals(item.getFinanceStatus()))
                    .collect(Collectors.toList());

            if (itemsToFinalize.isEmpty()) {
                throw new IllegalStateException("No valid items found to finalize");
            }

            // Just mark items as finalized and create purchase order
            for (OfferItem item : itemsToFinalize) {
                item.setFinalized(true);
                offerItemRepository.save(item);
            }

            PurchaseOrder po = createPurchaseOrderForItems(offer, itemsToFinalize, username);

            offer.setStatus("COMPLETED");
            offerRepository.save(offer);

            result.put("success", true);
            result.put("completedOfferId", offer.getId());
            result.put("purchaseOrderId", po.getId());
            result.put("message", "Offer finalized successfully");

            return result;

        } catch (Exception e) {
            System.err.println("Simple finalize error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    /**
     * Finalize selected items and create new offer for unfinalized items
     */
    @Transactional
    public Map<String, Object> finalizeWithRemaining(UUID offerId, List<UUID> finalizedItemIds, String username) {
        Map<String, Object> result = new HashMap<>();

        try {
            System.out.println("=== DEBUG: Starting finalizeWithRemaining ===");
            System.out.println("Offer ID: " + offerId);
            System.out.println("Finalized Item IDs: " + finalizedItemIds);
            System.out.println("Username: " + username);

            Offer originalOffer = offerRepository.findById(offerId)
                    .orElseThrow(() -> new RuntimeException("Offer not found"));
            System.out.println("✓ Found offer: " + originalOffer.getTitle());

            if (!"FINALIZING".equals(originalOffer.getStatus())) {
                throw new IllegalStateException("Only offers in FINALIZING status can use this method. Current status: " + originalOffer.getStatus());
            }
            System.out.println("✓ Status check passed: " + originalOffer.getStatus());

            // Get finalized and unfinalized items
            System.out.println("DEBUG: Getting offer items...");
            List<OfferItem> allOfferItems = originalOffer.getOfferItems();
            System.out.println("Total offer items: " + (allOfferItems != null ? allOfferItems.size() : 0));

            if (allOfferItems == null || allOfferItems.isEmpty()) {
                throw new IllegalStateException("No offer items found");
            }

            List<OfferItem> finalizedItems = new ArrayList<>();
            List<OfferItem> unfinalizedItems = new ArrayList<>();

            for (OfferItem item : allOfferItems) {
                System.out.println("Processing item: " + item.getId() + ", finance status: " + item.getFinanceStatus());

                if ("ACCEPTED".equals(item.getFinanceStatus()) || "FINANCE_ACCEPTED".equals(item.getFinanceStatus())) {
                    if (finalizedItemIds.contains(item.getId())) {
                        finalizedItems.add(item);
                        System.out.println("  → Added to finalized items");
                    } else {
                        unfinalizedItems.add(item);
                        System.out.println("  → Added to unfinalized items");
                    }
                }
            }

            System.out.println("Finalized items count: " + finalizedItems.size());
            System.out.println("Unfinalized items count: " + unfinalizedItems.size());

            if (finalizedItems.isEmpty()) {
                throw new IllegalStateException("No valid items selected for finalization");
            }

            // Mark items as finalized
            System.out.println("DEBUG: Marking items as finalized...");
            for (OfferItem item : finalizedItems) {
                item.setFinalized(true);
                offerItemRepository.save(item);
                System.out.println("✓ Marked item " + item.getId() + " as finalized");
            }

            // Create purchase order
            System.out.println("DEBUG: Creating purchase order...");
            PurchaseOrder po = createPurchaseOrderForItems(originalOffer, finalizedItems, username);
            System.out.println("✓ Created purchase order: " + po.getId());

            // Update offer status
            System.out.println("DEBUG: Updating offer status...");
            originalOffer.setStatus("COMPLETED");
            Offer completedOffer = offerRepository.save(originalOffer);
            System.out.println("✓ Updated offer status to: " + completedOffer.getStatus());

            // Return only IDs and basic data + timeline info
            result.put("success", true);
            result.put("completedOfferId", completedOffer.getId());
            result.put("purchaseOrderId", po.getId());
            result.put("message", "Offer finalized successfully");

            // Create new offer for unfinalized items if any exist
            if (!unfinalizedItems.isEmpty()) {
                System.out.println("DEBUG: Creating new offer for unfinalized items...");
                try {
                    Offer newOffer = createNewOfferForUnfinalizedItems(originalOffer, unfinalizedItems, username);
                    result.put("newOfferId", newOffer.getId());
                    System.out.println("✓ Created new offer: " + newOffer.getId());

                } catch (Exception e) {
                    System.err.println("Error creating new offer for unfinalized items: " + e.getMessage());
                    e.printStackTrace();
                    // Don't fail the whole operation, just log the error
                    result.put("newOfferError", "Failed to create new offer for remaining items");
                }
            }

            System.out.println("=== DEBUG: finalizeWithRemaining SUCCESS ===");
            return result;

        } catch (Exception e) {
            System.err.println("=== ERROR in finalizeWithRemaining ===");
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Copy timeline history synchronously using DTOs to avoid circular references
     */
    private void copyTimelineHistorySynchronously(UUID originalOfferId, Offer newOfferEntity) {
        try {
            System.out.println("DEBUG: Getting timeline events from original offer...");

            // Get timeline events directly from timeline service as entities
            List<OfferTimelineEvent> originalEvents = timelineService.getCompleteTimeline(originalOfferId);
            System.out.println("✓ Retrieved " + originalEvents.size() + " timeline events");

            // Create new timeline events for the new offer WITHOUT loading the full offer context
            for (OfferTimelineEvent originalEvent : originalEvents) {
                System.out.println("DEBUG: Creating timeline event: " + originalEvent.getEventType());

                // Create a new timeline event with minimal data - no complex relationships
                OfferTimelineEvent newEvent = OfferTimelineEvent.builder()
                        .offer(newOfferEntity)  // Only reference to new offer
                        .eventType(originalEvent.getEventType())
                        .attemptNumber(originalEvent.getAttemptNumber())
                        .eventTime(originalEvent.getEventTime())
                        .actionBy(originalEvent.getActionBy())
                        .notes("Copied from original offer: " + originalEvent.getNotes())
                        .additionalData(originalEvent.getAdditionalData())
                        .previousStatus(originalEvent.getPreviousStatus())
                        .newStatus(originalEvent.getNewStatus())
                        .displayTitle(originalEvent.getDisplayTitle())
                        .displayDescription(originalEvent.getDisplayDescription())
                        .canRetryFromHere(originalEvent.isCanRetryFromHere())
                        .retryToStatus(originalEvent.getRetryToStatus())
                        .createdAt(LocalDateTime.now())
                        .build();

                // Save the timeline event directly to avoid service complexity
                timelineService.saveTimelineEvent(newEvent);
            }

            System.out.println("✓ Successfully copied " + originalEvents.size() + " timeline events");

        } catch (Exception e) {
            System.err.println("Error copying timeline synchronously: " + e.getMessage());
            e.printStackTrace();
            // Don't throw - timeline copying shouldn't break the main operation
        }
    }

    /**
     * Remove the async scheduling since we're doing it synchronously now
     */

    /**
     * Core method to create purchase order with items - ensures proper creation every time
     */
    private PurchaseOrder createPurchaseOrderForItems(Offer offer, List<OfferItem> items, String username) {
        try {
            System.out.println("=== DEBUG: createPurchaseOrderForItems START ===");
            System.out.println("Offer: " + offer.getId());
            System.out.println("Items count: " + items.size());
            System.out.println("Username: " + username);

            // Generate PO number
            String poNumber = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            System.out.println("Generated PO number: " + poNumber);

            // Create purchase order
            PurchaseOrder po = PurchaseOrder.builder()
                    .poNumber(poNumber)
                    .createdAt(LocalDateTime.now())
                    .status("PENDING")
                    .requestOrder(offer.getRequestOrder())
                    .offer(offer)
                    .createdBy(username)
                    .purchaseOrderItems(new ArrayList<>()) // Initialize the list
                    .paymentTerms("Net 30")
                    .currency("EGP")
                    .build();

            System.out.println("DEBUG: Saving purchase order...");
            PurchaseOrder savedPO = purchaseOrderRepository.save(po);
            System.out.println("✓ Saved purchase order: " + savedPO.getId());

            double totalAmount = 0.0;
            int maxDeliveryDays = 0;

            // Create purchase order items for each offer item
            System.out.println("DEBUG: Creating purchase order items...");
            for (int i = 0; i < items.size(); i++) {
                OfferItem item = items.get(i);
                System.out.println("Processing item " + (i + 1) + "/" + items.size() + ": " + item.getId());

                // Check if required fields are available
                if (item.getQuantity() <= 0) {
                    throw new RuntimeException("Invalid quantity for item: " + item.getId());
                }
                if (item.getUnitPrice() == null) {
                    throw new RuntimeException("Unit price is null for item: " + item.getId());
                }
                if (item.getTotalPrice() == null) {
                    throw new RuntimeException("Total price is null for item: " + item.getId());
                }

                // Check if ItemType is available
                if (item.getItemType() == null) {
                    System.err.println("WARNING: ItemType is null for item: " + item.getId());
                    System.err.println("Trying to get ItemType from RequestOrderItem...");
                    if (item.getRequestOrderItem() != null && item.getRequestOrderItem().getItemType() != null) {
                        System.out.println("✓ Found ItemType through RequestOrderItem");
                    } else {
                        throw new RuntimeException("ItemType is null and cannot be retrieved for item: " + item.getId());
                    }
                }

                // Check if Merchant is available
                if (item.getMerchant() == null) {
                    throw new RuntimeException("Merchant is null for item: " + item.getId());
                }

                PurchaseOrderItem poItem = PurchaseOrderItem.builder()
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice().doubleValue())
                        .totalPrice(item.getTotalPrice().doubleValue())
                        .comment(item.getComment())
                        .purchaseOrder(savedPO)
                        .offerItem(item)
                        .status("PROCESSING")
                        .estimatedDeliveryDays(item.getEstimatedDeliveryDays() != null ? item.getEstimatedDeliveryDays() : 30)
                        .deliveryNotes(item.getDeliveryNotes())
                        .itemType(item.getItemType() != null ? item.getItemType() : item.getRequestOrderItem().getItemType())
                        .merchant(item.getMerchant())
                        .build();

                System.out.println("DEBUG: Saving purchase order item...");
                PurchaseOrderItem savedPOItem = purchaseOrderItemRepository.save(poItem);
                System.out.println("✓ Saved purchase order item: " + savedPOItem.getId());

                // Add to the purchase order's items list (bidirectional relationship)
                savedPO.getPurchaseOrderItems().add(savedPOItem);

                // Set the bidirectional reference in the offer item
                item.setPurchaseOrderItem(savedPOItem);
                offerItemRepository.save(item);
                System.out.println("✓ Updated offer item with purchase order item reference");

                // Calculate totals
                totalAmount += item.getTotalPrice().doubleValue();
                maxDeliveryDays = Math.max(maxDeliveryDays, item.getEstimatedDeliveryDays() != null ? item.getEstimatedDeliveryDays() : 30);
            }

            // Update purchase order with calculated values
            System.out.println("DEBUG: Updating purchase order totals...");
            savedPO.setTotalAmount(totalAmount);
            savedPO.setExpectedDeliveryDate(LocalDateTime.now().plusDays(maxDeliveryDays > 0 ? maxDeliveryDays : 30));

            // Save and return the updated purchase order
            PurchaseOrder finalPO = purchaseOrderRepository.save(savedPO);
            System.out.println("✓ Final purchase order saved with total: $" + totalAmount);
            // Automatically create payment request for the new purchase order
            try {
                System.out.println("DEBUG: Creating payment request for PO: " + finalPO.getId());

                // Pass BOTH purchaseOrderId AND offerId
                paymentRequestService.createPaymentRequestFromPO(
                        finalPO.getId(),
                        offer.getId(),  // ADD THIS PARAMETER
                        username
                );

                System.out.println("✓ Payment request created successfully");
            } catch (Exception e) {
                System.err.println("ERROR: Failed to create payment request: " + e.getMessage());
                e.printStackTrace();
            }

            System.out.println("=== DEBUG: createPurchaseOrderForItems SUCCESS ===");

            return finalPO;

        } catch (Exception e) {
            System.err.println("=== ERROR in createPurchaseOrderForItems ===");
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    private Offer createNewOfferForUnfinalizedItems(Offer originalOffer, List<OfferItem> unfinalizedItems, String username) {
        try {
            System.out.println("=== DEBUG: createNewOfferForUnfinalizedItems START ===");

            // Calculate the quantities that were NOT finalized
            Map<UUID, Double> unfinalizedQuantities = calculateUnfinalizedQuantities(originalOffer, unfinalizedItems);
            System.out.println("DEBUG: Calculated unfinalized quantities: " + unfinalizedQuantities);

            // Create a NEW RequestOrder with only the unfinalized quantities
            RequestOrder originalRequestOrder = originalOffer.getRequestOrder();

            RequestOrder newRequestOrder = RequestOrder.builder()
                    .title(originalRequestOrder.getTitle() + " (Unfinalized Items)")
                    .description("Unfinalized quantities from original request: " + originalRequestOrder.getId())
                    .createdAt(LocalDateTime.now())
                    .createdBy(username)
                    .status(originalRequestOrder.getStatus())
                    .partyType(originalRequestOrder.getPartyType())
                    .requesterId(originalRequestOrder.getRequesterId())
                    .requesterName(originalRequestOrder.getRequesterName())
                    .employeeRequestedBy(originalRequestOrder.getEmployeeRequestedBy())
                    .deadline(originalRequestOrder.getDeadline())
                    .requestItems(new ArrayList<>())
                    .offers(new ArrayList<>())
                    .build();

            RequestOrder savedNewRequestOrder = requestOrderRepository.save(newRequestOrder);
            System.out.println("✓ Created new request order: " + savedNewRequestOrder.getId());

            // Create new RequestOrderItems with only the unfinalized quantities
            List<RequestOrderItem> newRequestItems = new ArrayList<>();

            for (Map.Entry<UUID, Double> entry : unfinalizedQuantities.entrySet()) {
                UUID originalItemId = entry.getKey();
                Double unfinalizedQuantity = entry.getValue();

                // Find the original request item
                RequestOrderItem originalItem = originalRequestOrder.getRequestItems().stream()
                        .filter(item -> item.getId().equals(originalItemId))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Original request item not found: " + originalItemId));

                // Create new request item with ONLY the unfinalized quantity
                RequestOrderItem newRequestItem = RequestOrderItem.builder()
                        .quantity(unfinalizedQuantity.intValue()) // Only the unfinalized quantity
                        .comment(originalItem.getComment() + " (Unfinalized: " + unfinalizedQuantity + " from original)")
                        .itemType(originalItem.getItemType())
                        .requestOrder(savedNewRequestOrder)
                        .build();

                RequestOrderItem savedNewRequestItem = requestOrderItemRepository.save(newRequestItem);
                newRequestItems.add(savedNewRequestItem);

                System.out.println("DEBUG - Created new request item: " + savedNewRequestItem.getId() +
                        " with quantity: " + unfinalizedQuantity +
                        " (original item " + originalItemId + " had: " + originalItem.getQuantity() + ")");
            }

            // Update the new request order with the new items
            savedNewRequestOrder.setRequestItems(newRequestItems);
            savedNewRequestOrder = requestOrderRepository.save(savedNewRequestOrder);

            // Create new offer with the NEW RequestOrder (with correct quantities)
            System.out.println("DEBUG: Building new offer...");
            Offer newOffer = Offer.builder()
                    .title(originalOffer.getTitle() + " (Unfinalized)")
                    .description("Items not finalized from original offer: " + originalOffer.getId())
                    .createdAt(LocalDateTime.now())
                    .createdBy(username)
                    .status("INPROGRESS")
                    .validUntil(originalOffer.getValidUntil())
                    .notes("Created for items not finalized in original offer. Timeline can be copied using separate endpoint.")
                    .requestOrder(savedNewRequestOrder) // Use NEW RequestOrder with correct quantities
                    .offerItems(new ArrayList<>())
                    .timelineEvents(new ArrayList<>())
                    .currentAttemptNumber(1)
                    .totalRetries(0)
                    .build();
            System.out.println("✓ Built new offer");

            System.out.println("DEBUG: Saving new offer...");
            Offer savedNewOffer = offerRepository.save(newOffer);
            System.out.println("✓ Saved new offer with ID: " + savedNewOffer.getId());

            // Add the new offer to the NEW request order's offers list
            savedNewRequestOrder.getOffers().add(savedNewOffer);
            requestOrderRepository.save(savedNewRequestOrder);
            System.out.println("✓ Added new offer to new request order");

            System.out.println("=== DEBUG: createNewOfferForUnfinalizedItems SUCCESS (no timeline copying) ===");
            return savedNewOffer;

        } catch (Exception e) {
            System.err.println("=== ERROR in createNewOfferForUnfinalizedItems ===");
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Calculate quantities that were NOT finalized (opposite of calculateRemainingQuantities)
     */
    private Map<UUID, Double> calculateUnfinalizedQuantities(Offer originalOffer, List<OfferItem> unfinalizedItems) {
        Map<UUID, Double> unfinalizedQuantities = new HashMap<>();

        // Group unfinalized items by request order item and sum their quantities
        Map<UUID, Double> unfinalizedQuantitiesByItem = unfinalizedItems.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getRequestOrderItem().getId(),
                        Collectors.summingDouble(OfferItem::getQuantity)
                ));

        System.out.println("DEBUG - Unfinalized quantities by item: " + unfinalizedQuantitiesByItem);

        // For each request order item that has unfinalized quantities, calculate how much is unfinalized
        for (Map.Entry<UUID, Double> entry : unfinalizedQuantitiesByItem.entrySet()) {
            UUID requestOrderItemId = entry.getKey();
            Double unfinalizedQuantity = entry.getValue();

            unfinalizedQuantities.put(requestOrderItemId, unfinalizedQuantity);

            System.out.println("DEBUG - Item " + requestOrderItemId +
                    ": Unfinalized quantity=" + unfinalizedQuantity);
        }

        return unfinalizedQuantities;
    }

    /**
     * SEPARATE METHOD - Add timeline copying to existing offer (call this after finalization)
     */
    @Transactional
    public void addTimelineHistoryToOffer(UUID originalOfferId, UUID newOfferId) {
        try {
            System.out.println("=== Adding timeline history to new offer ===");

            Offer newOffer = offerRepository.findById(newOfferId)
                    .orElseThrow(() -> new RuntimeException("New offer not found"));

            List<OfferTimelineEventDTO> originalEvents = getOfferTimeline(originalOfferId);

            for (OfferTimelineEventDTO event : originalEvents) {
                timelineService.createTimelineEvent(
                        newOffer,
                        event.getEventType(),
                        event.getActionBy(),
                        "Copied from original offer: " + event.getNotes(),
                        event.getPreviousStatus(),
                        event.getNewStatus()
                );
            }

            System.out.println("✓ Successfully added " + originalEvents.size() + " timeline events");

        } catch (Exception e) {
            System.err.println("Error adding timeline history: " + e.getMessage());
            // Don't throw - this is optional
        }
    }
//    @Transactional
//    public PurchaseOrderDTO createPurchaseOrderFromItems(UUID offerId, List<UUID> offerItemIds, String username) {
//        Offer offer = offerRepository.findById(offerId)
//                .orElseThrow(() -> new RuntimeException("Offer not found"));
//
//        // Get the specified offer items
//        List<OfferItem> selectedItems = offer.getOfferItems().stream()
//                .filter(item -> offerItemIds.contains(item.getId()) &&
//                        "ACCEPTED".equals(item.getFinanceStatus()))
//                .collect(Collectors.toList());
//
//        if (selectedItems.isEmpty()) {
//            throw new IllegalStateException("No valid items found for purchase order creation");
//        }
//
//        // MARK ALL SELECTED ITEMS AS FINALIZED
//        for (OfferItem item : selectedItems) {
//            item.setFinalized(true);
//            offerItemRepository.save(item);
//        }
//
//        PurchaseOrder po = createPurchaseOrderForItems(offer, selectedItems, username);
//        return purchaseOrderMapper.toDTO(po);
//    }

    @Transactional
    public PurchaseOrderDTO createPurchaseOrderFromItems(UUID offerId, List<UUID> offerItemIds, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // **UPDATED: Check offer status instead of item financeStatus**
        if (!"FINALIZING".equals(offer.getStatus())) {
            throw new IllegalStateException("Offer must be in FINALIZING status. Current status: " + offer.getStatus());
        }

        // Get the specified offer items (no financeStatus check needed)
        List<OfferItem> selectedItems = offer.getOfferItems().stream()
                .filter(item -> offerItemIds.contains(item.getId()))
                .collect(Collectors.toList());

        if (selectedItems.isEmpty()) {
            throw new IllegalStateException("No valid items found for purchase order creation");
        }

        // MARK ALL SELECTED ITEMS AS FINALIZED
        for (OfferItem item : selectedItems) {
            item.setFinalized(true);
            offerItemRepository.save(item);
        }

        PurchaseOrder po = createPurchaseOrderForItems(offer, selectedItems, username);
        return purchaseOrderMapper.toDTO(po);
    }

    /**
     * Helper method to validate purchase order creation
     */
    private void validatePurchaseOrderCreation(PurchaseOrder purchaseOrder) {
        if (purchaseOrder == null) {
            throw new IllegalStateException("Purchase order creation failed");
        }

        if (purchaseOrder.getPurchaseOrderItems() == null || purchaseOrder.getPurchaseOrderItems().isEmpty()) {
            throw new IllegalStateException("Purchase order created without items");
        }

        // Verify all items have proper references
        for (PurchaseOrderItem item : purchaseOrder.getPurchaseOrderItems()) {
            if (item.getPurchaseOrder() == null) {
                throw new IllegalStateException("Purchase order item missing purchase order reference");
            }
            if (item.getOfferItem() == null) {
                throw new IllegalStateException("Purchase order item missing offer item reference");
            }
        }
    }

    @Transactional
    public void finalizeSpecificItems(List<UUID> offerItemIds, String username) {
        List<OfferItem> items = offerItemRepository.findAllById(offerItemIds);

        for (OfferItem item : items) {
            // **UPDATED: Check if the offer is in FINALIZING status instead of item financeStatus**
            if (item.getOffer() == null) {
                throw new IllegalStateException("Cannot finalize item " + item.getId() + " - no offer associated");
            }

            if (!"FINALIZING".equals(item.getOffer().getStatus())) {
                throw new IllegalStateException("Cannot finalize item " + item.getId() + " - offer is not in FINALIZING status");
            }

            item.setFinalized(true);
            offerItemRepository.save(item);
        }
    }
    /**
     * Confirm and import RFQ response data
     */
    @Transactional
    public List<OfferItemDTO> confirmRFQImport(UUID offerId, UUID merchantId, List<UUID> validRowIds,
                                               RFQImportPreviewDTO preview, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Get the request order from the offer
        RequestOrder requestOrder = offer.getRequestOrder();
        if (requestOrder == null) {
            throw new RuntimeException("Offer has no associated request order");
        }

        List<OfferItem> createdItems = new ArrayList<>();

        // Get effective request items for this offer using OfferRequestItemService
        List<OfferRequestItemDTO> effectiveItems = offerRequestItemService.getEffectiveRequestItems(offerId);

        // Filter only valid rows that user selected
        List<RFQImportPreviewDTO.RFQImportRow> rowsToImport = preview.getRows().stream()
                .filter(row -> row.isValid() && validRowIds.contains(row.getItemTypeId()))
                .toList();

        for (RFQImportPreviewDTO.RFQImportRow row : rowsToImport) {
            // Find the effective request item for this item type
            OfferRequestItemDTO effectiveItem = effectiveItems.stream()
                    .filter(item -> item.getItemTypeId().equals(row.getItemTypeId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Item type not found in request items: " + row.getItemTypeId()));

            // Create offer item from imported data
            OfferItem offerItem = new OfferItem();
            offerItem.setOffer(offer);
            offerItem.setMerchant(merchant);

            ItemType itemType = itemTypeRepository.findById(row.getItemTypeId())
                    .orElseThrow(() -> new RuntimeException("Item type not found"));
            offerItem.setItemType(itemType);

            // Handle linking to RequestOrderItem
            RequestOrderItem requestOrderItem;

            if (effectiveItem.getOriginalRequestOrderItemId() != null) {
                // This is a modified quantity of an existing item - link to original
                requestOrderItem = requestOrderItemRepository.findById(effectiveItem.getOriginalRequestOrderItemId())
                        .orElseThrow(() -> new RuntimeException("Original request order item not found"));
            } else {
                // This is a NEW item added via "Modify Items"
                // Check if a RequestOrderItem already exists for this item type
                Optional<RequestOrderItem> existingItem = requestOrder.getRequestItems().stream()
                        .filter(item -> item.getItemType().getId().equals(row.getItemTypeId()))
                        .findFirst();

                if (existingItem.isPresent()) {
                    // Found existing RequestOrderItem with same item type
                    requestOrderItem = existingItem.get();
                } else {
                    // Create a new RequestOrderItem for this newly added item
                    requestOrderItem = new RequestOrderItem();
                    requestOrderItem.setRequestOrder(requestOrder);
                    requestOrderItem.setItemType(itemType);
                    requestOrderItem.setQuantity(effectiveItem.getQuantity()); // Use quantity from OfferRequestItem
                    requestOrderItem.setComment("Added during RFQ modification - ID: " + effectiveItem.getId());

                    // Save the new RequestOrderItem
                    requestOrderItem = requestOrderItemRepository.save(requestOrderItem);
                }
            }

            offerItem.setRequestOrderItem(requestOrderItem);
            offerItem.setQuantity(row.getResponseQuantity());
            offerItem.setUnitPrice(row.getUnitPrice());
            offerItem.setTotalPrice(row.getTotalPrice());
            offerItem.setCurrency("EGP"); // Default, can be added to import later

            OfferItem savedItem = offerItemRepository.save(offerItem);
            createdItems.add(savedItem);
        }

        return offerItemMapper.toDTOList(createdItems);
    }

    /**
     * Handle Finance Module's approval/rejection response
     * This is called by the Finance Module after they review an offer
     */
    @Transactional
    public OfferDTO handleFinanceValidationResponse(UUID offerId, String decision, UUID reviewerUserId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found with ID: " + offerId));

        if (offer.getFinanceValidationStatus() != OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION) {
            throw new RuntimeException("Offer is not pending finance validation. Current status: " +
                    offer.getFinanceValidationStatus());
        }

        if ("APPROVE".equalsIgnoreCase(decision)) {
            offer.setFinanceValidationStatus(OfferFinanceValidationStatus.FINANCE_APPROVED);
            offer.setFinanceReviewedAt(LocalDateTime.now());
            offer.setFinanceReviewedByUserId(reviewerUserId);

            // Set status to FINALIZING so it appears in Finalize tab in Procurement
            offer.setStatus("FINALIZING");

            // Create timeline event for finance approval
            timelineService.createTimelineEvent(
                    offer,
                    TimelineEventType.FINANCE_ACCEPTED,
                    "Finance Module",
                    "Offer approved by Finance Module",
                    "MANAGERACCEPTED",
                    "FINALIZING"
            );

        } else if ("REJECT".equalsIgnoreCase(decision)) {
            offer.setFinanceValidationStatus(OfferFinanceValidationStatus.FINANCE_REJECTED);
            offer.setFinanceReviewedAt(LocalDateTime.now());
            offer.setFinanceReviewedByUserId(reviewerUserId);

            // Status stays as MANAGERACCEPTED, but finance rejected
            // Procurement can edit and resubmit

            // Create timeline event for finance rejection
            timelineService.createTimelineEvent(
                    offer,
                    TimelineEventType.FINANCE_REJECTED,
                    "Finance Module",
                    "Offer rejected by Finance Module",
                    offer.getStatus(),
                    offer.getStatus()
            );
        } else {
            throw new RuntimeException("Invalid decision: " + decision + ". Must be APPROVE or REJECT");
        }

        Offer savedOffer = offerRepository.save(offer);
        return offerMapper.toDTO(savedOffer);
    }

}