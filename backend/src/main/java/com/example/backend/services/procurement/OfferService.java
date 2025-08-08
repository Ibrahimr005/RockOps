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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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

    @Autowired
    public OfferService(OfferRepository offerRepository,
                        OfferItemRepository offerItemRepository,
                        RequestOrderRepository requestOrderRepository,
                        RequestOrderItemRepository requestOrderItemRepository,
                        MerchantRepository merchantRepository,PurchaseOrderRepository purchaseOrderRepository, PurchaseOrderItemRepository purchaseOrderItemRepository) {
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.requestOrderRepository = requestOrderRepository;
        this.requestOrderItemRepository = requestOrderItemRepository;
        this.merchantRepository = merchantRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
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

    @Transactional
    public Offer updateOfferStatus(UUID offerId, String status, String username, String rejectionReason) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        offer.setStatus(status);
        offer.setUpdatedAt(LocalDateTime.now());
        offer.setUpdatedBy(username);

        // Only set rejection reason if status is REJECTED and reason is provided
        if ("MANAGERREJECTED".equals(status) && rejectionReason != null && !rejectionReason.trim().isEmpty()) {
            offer.setRejectionReason(rejectionReason);
        }
        if ("SUBMITTED".equals(status)) {
            offer.setSubmittedAtM(LocalDateTime.now());
        }

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
            // Log the start of the operation
            System.out.println("Starting deletion of offer item with ID: " + offerItemId);

            // Find the offer item first
            OfferItem offerItem = offerItemRepository.findById(offerItemId)
                    .orElseThrow(() -> new RuntimeException("Offer Item not found with ID: " + offerItemId));

            System.out.println("Found offer item: " + offerItem.getId());

            // Store the parent offer ID before deleting
            UUID offerId = null;
            if (offerItem.getOffer() != null) {
                offerId = offerItem.getOffer().getId();
                System.out.println("Parent offer ID: " + offerId);
            } else {
                System.out.println("Warning: Offer item has no parent offer");
            }

            // Delete the offer item directly
            System.out.println("Deleting offer item from database");
            offerItemRepository.delete(offerItem);

            // If we have a parent offer ID, update its cache
            if (offerId != null) {
                System.out.println("Refreshing parent offer cache");
                Offer parentOffer = offerRepository.findById(offerId)
                        .orElse(null);

                if (parentOffer != null && parentOffer.getOfferItems() != null) {
                    // Force refresh the cache by removing any reference to the deleted item
                    parentOffer.getOfferItems().removeIf(item -> item.getId().equals(offerItemId));
                    offerRepository.save(parentOffer);
                    System.out.println("Parent offer updated successfully");
                }
            }

            System.out.println("Offer item deletion completed successfully");
        } catch (Exception e) {
            System.err.println("Error in deleteOfferItem method: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete offer item: " + e.getMessage(), e);
        }
    }
    @Transactional
    public void deleteOffer(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Delete the offer (and all its items due to cascade)
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

    @Transactional
    public Offer retryOffer(UUID offerId, String username) {
        // Find the original offer that needs to be retried
        Offer originalOffer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Verify that the offer is in a REJECTED status
        if (!"MANAGERREJECTED".equals(originalOffer.getStatus())) {
            throw new IllegalStateException("Only rejected offers can be retried");
        }

        // Check if there's already a retry in progress for this offer
        List<Offer> existingOffers = getOffersByRequestOrder(originalOffer.getRequestOrder().getId());

        // Filter to find any offers that are retries of the current one
        boolean retryExists = existingOffers.stream()
                .filter(offer -> !offer.getId().equals(offerId)) // Exclude the original offer
                .filter(offer -> offer.getTitle().contains(originalOffer.getTitle() + " (Retry)"))
                .filter(offer -> offer.getStatus().equals("UNSTARTED") || offer.getStatus().equals("INPROGRESS"))
                .findAny()
                .isPresent();

        if (retryExists) {
            System.out.println("retryyyyyyyy");
            throw new IllegalStateException("A retry for this offer is already in progress. Please complete or delete the existing retry before creating a new one.");
        }

        // Create a new offer using setters instead of builder
        Offer newOffer = new Offer();
        newOffer.setTitle(originalOffer.getTitle() + " (Retry)");
        newOffer.setDescription(originalOffer.getDescription());
        newOffer.setCreatedAt(LocalDateTime.now());
        newOffer.setCreatedBy(username);
        newOffer.setStatus("INPROGRESS");
        newOffer.setValidUntil(LocalDateTime.now().plusDays(7));
        newOffer.setNotes(originalOffer.getNotes());
        newOffer.setRequestOrder(originalOffer.getRequestOrder());
        newOffer.setOfferItems(new ArrayList<>());

        // Save the new offer first
        Offer savedOffer = offerRepository.save(newOffer);

        // Copy all the offer items from the original offer
        if (originalOffer.getOfferItems() != null && !originalOffer.getOfferItems().isEmpty()) {
            for (OfferItem originalItem : originalOffer.getOfferItems()) {
                // Create a new offer item using setters instead of builder
                OfferItem newItem = new OfferItem();
                newItem.setQuantity(originalItem.getQuantity());
                newItem.setUnitPrice(originalItem.getUnitPrice());
                newItem.setTotalPrice(originalItem.getTotalPrice());
                newItem.setCurrency(originalItem.getCurrency());
                newItem.setMerchant(originalItem.getMerchant());
                newItem.setOffer(savedOffer); // Link to the new offer
                newItem.setRequestOrderItem(originalItem.getRequestOrderItem());
                newItem.setEstimatedDeliveryDays(originalItem.getEstimatedDeliveryDays());
                newItem.setDeliveryNotes(originalItem.getDeliveryNotes());
                newItem.setComment(originalItem.getComment());

                // Save the new item
                OfferItem savedItem = offerItemRepository.save(newItem);
                savedOffer.getOfferItems().add(savedItem);
            }
        }

        return savedOffer;
    }
//
//    @Transactional
//    public OfferItem updateOfferItemStatus(UUID offerItemId, String status, String username, String rejectionReason) {
//        OfferItem offerItem = offerItemRepository.findById(offerItemId)
//                .orElseThrow(() -> new RuntimeException("Offer Item not found"));
//
//        offerItem.setStatus(status);
//
//        // Only set rejection reason if status is REJECTED and reason is provided
//        if ("REJECTED".equals(status) && rejectionReason != null && !rejectionReason.trim().isEmpty()) {
//            offerItem.setRejectionReason(rejectionReason);
//        }
//
//        return offerItemRepository.save(offerItem);
//    }


//    @Transactional
//    public List<OfferItem> updateMultipleOfferItemStatus(List<UUID> offerItemIds, String status,
//                                                         String username, String rejectionReason) {
//        List<OfferItem> updatedItems = new ArrayList<>();
//
//        for (UUID itemId : offerItemIds) {
//            OfferItem updatedItem = updateOfferItemStatus(itemId, status, username, rejectionReason);
//            updatedItems.add(updatedItem);
//        }
//
//        return updatedItems;
//    }

    @Transactional
    public Offer updateFinanceStatus(UUID offerId, String financeStatus) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        offer.setFinanceStatus(financeStatus);
//        offer.setUpdatedAt(LocalDateTime.now());
//        offer.setUpdatedBy(username);

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
        if (acceptedItemsCount == 0) {
            // All items rejected
            offer.setFinanceStatus("FINANCE_REJECTED");
        } else if (rejectedItemsCount == 0) {
            // All items accepted
            offer.setFinanceStatus("FINANCE_ACCEPTED");
        } else {
            // Some items accepted, some rejected
            offer.setFinanceStatus("FINANCE_PARTIALLY_ACCEPTED");
        }

        offer.setUpdatedAt(LocalDateTime.now());
        offer.setUpdatedBy(username);

        // If there are accepted items, create a purchase order
        if (acceptedItemsCount > 0) {
            createPurchaseOrder(offer, username);
        }

        // Save updated offer
        return offerRepository.save(offer);
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
}