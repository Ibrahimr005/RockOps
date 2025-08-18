package com.example.backend.services.procurement;


import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.OfferItem;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.repositories.procurement.OfferItemRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
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

    @Autowired
    public PurchaseOrderService(
            OfferRepository offerRepository,
            OfferItemRepository offerItemRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderItemRepository purchaseOrderItemRepository) {
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
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

            if (!"FINANCE_ACCEPTED".equals(item.getFinanceStatus())) {
                throw new IllegalArgumentException("Cannot finalize item " + item.getId() + " as it is not finance-accepted");
            }
        }

        if (finalizedItems.isEmpty()) {
            throw new IllegalArgumentException("No valid items to finalize");
        }

        // Update offer status to FINALIZED
        offer.setStatus("COMPLETED");

        offerRepository.save(offer);

        // Create purchase order
        PurchaseOrder purchaseOrder = new PurchaseOrder();
        purchaseOrder.setPoNumber("PO-" + generatePoNumber());
        purchaseOrder.setCreatedAt(LocalDateTime.now());
        purchaseOrder.setUpdatedAt(LocalDateTime.now());
        purchaseOrder.setStatus("CREATED");
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

            purchaseOrder.getPurchaseOrderItems().add(poItem);

            totalAmount += poItem.getTotalPrice();
        }

        purchaseOrder.setTotalAmount(totalAmount);

        // Save the purchase order
        return purchaseOrderRepository.save(purchaseOrder);
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
}