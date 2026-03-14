package com.example.backend.services.procurement;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.dto.procurement.*;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderDTO;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderIssueDTO;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderItemDTO;
import com.example.backend.dto.warehouse.ItemTypeDTO;
import com.example.backend.mappers.procurement.PurchaseOrderMapper;
import com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.*;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.procurement.Offer.TimelineEventType;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import com.example.backend.services.warehouse.ItemTypeService;
import jakarta.persistence.EntityManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PurchaseOrderService {

    private final OfferRepository offerRepository;
    private final OfferItemRepository offerItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final OfferTimelineService offerTimelineService;
    private final ItemRepository itemRepository;
    private final WarehouseRepository warehouseRepository;
    private final DeliverySessionRepository deliverySessionRepository;
    private final DeliveryItemReceiptRepository deliveryItemReceiptRepository;
    private final PaymentRequestService paymentRequestService;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final ItemTypeService itemTypeService;

    @Autowired
    private com.example.backend.services.equipment.EquipmentService equipmentService;

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
            DeliverySessionRepository deliverySessionRepository,
            DeliveryItemReceiptRepository deliveryItemReceiptRepository,
            PaymentRequestService paymentRequestService,
            PurchaseOrderMapper purchaseOrderMapper,
            ItemTypeService itemTypeService) {
        this.offerRepository = offerRepository;
        this.offerItemRepository = offerItemRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.offerTimelineService = offerTimelineService;
        this.itemRepository = itemRepository;
        this.warehouseRepository = warehouseRepository;
        this.deliverySessionRepository = deliverySessionRepository;
        this.deliveryItemReceiptRepository = deliveryItemReceiptRepository;
        this.paymentRequestService = paymentRequestService;
        this.purchaseOrderMapper = purchaseOrderMapper;
        this.itemTypeService = itemTypeService;
    }

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
        int attemptNumber = offer.getCurrentAttemptNumber();

        // ✅ FIXED - pass offerId and attemptNumber
        offerTimelineService.createTimelineEvent(
                offer.getId(),
                TimelineEventType.OFFER_FINALIZED,
                username,
                "Starting finalization process with " + finalizedItems.size() + " items",
                previousStatus,
                "COMPLETED",
                attemptNumber
        );

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
        purchaseOrder.setDeliverySessions(new ArrayList<>());

        String currency = finalizedItems.get(0).getCurrency();
        purchaseOrder.setCurrency(currency);

        purchaseOrder.setPaymentStatus(POPaymentStatus.REQUESTED);  // ← ADD THIS
        purchaseOrder.setTotalPaidAmount(BigDecimal.ZERO);

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
            poItem.setItemReceipts(new ArrayList<>());

            // Copy equipment spec from request order item to PO item
            if (offerItem.getRequestOrderItem().getEquipmentSpec() != null) {
                poItem.setEquipmentSpec(offerItem.getRequestOrderItem().getEquipmentSpec());
            }

            if (offerItem.getMerchant() != null) {
                poItem.setMerchant(offerItem.getMerchant());
            }

            purchaseOrder.getPurchaseOrderItems().add(poItem);
            totalAmount += poItem.getTotalPrice();
        }

        purchaseOrder.setTotalAmount(totalAmount);

        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrder);

        // ✅ FIXED - pass offerId and attemptNumber
        offerTimelineService.createTimelineEvent(
                offer.getId(),
                TimelineEventType.OFFER_COMPLETED,
                username,
                "Purchase order " + savedPurchaseOrder.getPoNumber() + " created with total value: " +
                        savedPurchaseOrder.getCurrency() + " " + String.format("%.2f", totalAmount),
                "COMPLETED",
                "COMPLETED",
                attemptNumber
        );

        return savedPurchaseOrder;
    }
//@Transactional
//public PurchaseOrder finalizeOfferAndCreatePurchaseOrder(UUID offerId, List<UUID> finalizedItemIds, String username) {
//    Offer offer = offerRepository.findById(offerId)
//            .orElseThrow(() -> new RuntimeException("Offer not found with ID: " + offerId));
//
//    if (!"FINALIZING".equals(offer.getStatus())) {
//        throw new IllegalStateException("Offer must be in FINALIZING status to be finalized. Current status: " + offer.getStatus());
//    }
//
//    List<OfferItem> finalizedItems = offerItemRepository.findAllById(finalizedItemIds);
//
//    for (OfferItem item : finalizedItems) {
//        if (!item.getOffer().getId().equals(offerId)) {
//            throw new IllegalArgumentException("Item " + item.getId() + " does not belong to offer " + offerId);
//        }
//    }
//
//    if (finalizedItems.isEmpty()) {
//        throw new IllegalArgumentException("No valid items to finalize");
//    }
//
//    // Mark items as finalized
//    for (OfferItem item : finalizedItems) {
//        item.setFinalized(true);
//        offerItemRepository.save(item);
//    }
//
//    String previousStatus = offer.getStatus();
//
//    offerTimelineService.createTimelineEvent(offer, TimelineEventType.OFFER_FINALIZED, username,
//            "Starting finalization process with " + finalizedItems.size() + " items",
//            previousStatus, "COMPLETED");
//
//    offer.setStatus("COMPLETED");
//    offerRepository.save(offer);
//
//    PurchaseOrder purchaseOrder = new PurchaseOrder();
//    purchaseOrder.setPoNumber("PO-" + generatePoNumber());
//    purchaseOrder.setCreatedAt(LocalDateTime.now());
//    purchaseOrder.setUpdatedAt(LocalDateTime.now());
//    purchaseOrder.setStatus("PENDING");
//    purchaseOrder.setRequestOrder(offer.getRequestOrder());
//    purchaseOrder.setOffer(offer);
//    purchaseOrder.setCreatedBy(username);
//    purchaseOrder.setPaymentTerms("Net 30");
//    purchaseOrder.setExpectedDeliveryDate(LocalDateTime.now().plusDays(30));
//    purchaseOrder.setPurchaseOrderItems(new ArrayList<>());
//    purchaseOrder.setDeliverySessions(new ArrayList<>());
//
//    String currency = finalizedItems.get(0).getCurrency();
//    purchaseOrder.setCurrency(currency);
//
//    double totalAmount = 0.0;
//
//    for (OfferItem offerItem : finalizedItems) {
//        PurchaseOrderItem poItem = new PurchaseOrderItem();
//        poItem.setQuantity(offerItem.getQuantity());
//        poItem.setUnitPrice(offerItem.getUnitPrice().doubleValue());
//        poItem.setTotalPrice(offerItem.getTotalPrice().doubleValue());
//        poItem.setStatus("PENDING");
//        poItem.setEstimatedDeliveryDays(offerItem.getEstimatedDeliveryDays() != null ? offerItem.getEstimatedDeliveryDays() : 30);
//        poItem.setDeliveryNotes(offerItem.getDeliveryNotes());
//        poItem.setComment(offerItem.getComment());
//        poItem.setPurchaseOrder(purchaseOrder);
//        poItem.setOfferItem(offerItem);
//        poItem.setItemType(offerItem.getRequestOrderItem().getItemType());
//        poItem.setItemReceipts(new ArrayList<>());
//
//        if (offerItem.getMerchant() != null) {
//            poItem.setMerchant(offerItem.getMerchant());
//        }
//
//        purchaseOrder.getPurchaseOrderItems().add(poItem);
//        totalAmount += poItem.getTotalPrice();
//    }
//
//    purchaseOrder.setTotalAmount(totalAmount);
//
//    PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrder);
//
//    offerTimelineService.createTimelineEvent(offer, TimelineEventType.OFFER_COMPLETED, username,
//            "Purchase order " + savedPurchaseOrder.getPoNumber() + " created with total value: " +
//                    savedPurchaseOrder.getCurrency() + " " + String.format("%.2f", totalAmount),
//            "COMPLETED", "COMPLETED");
//

    /// /    System.err.println("🔵🔵🔵 PO SAVED, FLUSHING TO DATABASE");
    /// /    entityManager.flush(); // Force write to database
    /// /    System.err.println("🔵🔵🔵 FLUSH COMPLETE, NOW CREATING PAYMENT REQUEST");
    /// /
    /// /    // NOW create payment request - this will use REQUIRES_NEW and happen in a separate transaction
    /// /    try {
    /// /        paymentRequestService.createPaymentRequestFromPO(
    /// /                savedPurchaseOrder.getId(),
    /// /                offerId,
    /// /                username
    /// /        );
    /// /        System.err.println("✅✅✅ Payment request created successfully");
    /// /    } catch (Exception e) {
    /// /        System.err.println("❌❌❌ Payment request creation failed: " + e.getMessage());
    /// /        e.printStackTrace();
    /// /        // Don't throw - let the PO creation succeed even if payment request fails
    /// /    }
//
//    return savedPurchaseOrder;
//}
    private String generatePoNumber() {
        String datePart = LocalDateTime.now().toString().substring(0, 10).replace("-", "");
        int randomNum = new Random().nextInt(10000);
        String randomPart = String.format("%04d", randomNum);
        return datePart + "-" + randomPart;
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public PurchaseOrder getPurchaseOrderByOffer(UUID offerId) {
        // Verify offer exists
        offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        return purchaseOrderRepository.findByOfferId(offerId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrder> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll();
    }

    @Transactional(readOnly = true)
    public PurchaseOrder getPurchaseOrderById(UUID id) {
        return purchaseOrderRepository.findByIdWithDetails(id) // CHANGED
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));
    }

    @Transactional
    public PurchaseOrder updatePurchaseOrderStatus(UUID id, String status, String username) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        String oldStatus = po.getStatus();
        po.setStatus(status);
        po.setUpdatedAt(LocalDateTime.now());

        if ("APPROVED".equals(status)) {
            po.setApprovedBy(username);
            po.setFinanceApprovalDate(LocalDateTime.now());
        }

        PurchaseOrder savedPO = purchaseOrderRepository.save(po);

        // 🔥 NEW: Update ItemType base prices when PO is marked as COMPLETED
        if ("COMPLETED".equals(status) && !"COMPLETED".equals(oldStatus)) {
            log.info("PO status changed to COMPLETED, updating base prices...");

            // Get all unique item types in this PO
            Set<UUID> itemTypeIds = savedPO.getPurchaseOrderItems().stream()
                    .map(item -> item.getItemType().getId())
                    .collect(Collectors.toSet());

            // Update base price for each item type
            for (UUID itemTypeId : itemTypeIds) {
                try {
                    itemTypeService.updateItemTypeBasePriceFromCompletedPOs(itemTypeId, username);
                } catch (Exception e) {
                    log.warn("Failed to update base price for item type: {}", e.getMessage());
                    // Don't throw - continue with other items
                }
            }
        }

        return savedPO;
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDTO getPurchaseOrderWithDeliveries(UUID id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PO not found"));

        PurchaseOrderDTO dto = convertToDTO(po);

        List<DeliverySessionDTO> sessions = po.getDeliverySessions().stream()
                .map(this::convertDeliverySessionToDTO)
                .toList();
        dto.setDeliverySessions(sessions);

        for (PurchaseOrderItemDTO itemDTO : dto.getPurchaseOrderItems()) {
            PurchaseOrderItem item = po.getPurchaseOrderItems().stream()
                    .filter(i -> i.getId().equals(itemDTO.getId()))
                    .findFirst()
                    .orElseThrow();

            List<DeliveryItemReceiptDTO> receipts = item.getItemReceipts().stream()
                    .map(this::convertReceiptToDTO)
                    .toList();
            itemDTO.setItemReceipts(receipts);

            double totalGood = item.getItemReceipts().stream()
                    .mapToDouble(DeliveryItemReceipt::getGoodQuantity)
                    .sum();

            double totalIssuesNotRedelivering = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getResolutionType() != null && i.getResolutionType() != PurchaseOrderResolutionType.REDELIVERY)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            itemDTO.setRemainingQuantity(item.getQuantity() - totalGood - totalIssuesNotRedelivering);
        }

        return dto;
    }

    private DeliverySessionDTO convertDeliverySessionToDTO(DeliverySession session) {
        return DeliverySessionDTO.builder()
                .id(session.getId())
                .purchaseOrderId(session.getPurchaseOrder().getId())
                .merchantId(session.getMerchant().getId())
                .merchantName(session.getMerchant().getName())
                .processedBy(session.getProcessedBy())
                .processedAt(session.getProcessedAt())
                .deliveryNotes(session.getDeliveryNotes())
                .itemReceipts(session.getItemReceipts().stream()
                        .map(this::convertReceiptToDTO)
                        .toList())
                .build();
    }

    private DeliveryItemReceiptDTO convertReceiptToDTO(DeliveryItemReceipt receipt) {
        PurchaseOrderItem poItem = receipt.getPurchaseOrderItem();
        String itemName = null;
        String measuringUnit = null;

        if (poItem.getItemType() != null) {
            itemName = poItem.getItemType().getName();
            measuringUnit = poItem.getItemType().getMeasuringUnit() != null ?
                    poItem.getItemType().getMeasuringUnit().getName() : null;
        } else if (poItem.getEquipmentSpec() != null) {
            itemName = poItem.getEquipmentSpec().getName();
            measuringUnit = "unit";
        }

        DeliveryItemReceiptDTO dto = DeliveryItemReceiptDTO.builder()
                .id(receipt.getId())
                .deliverySessionId(receipt.getDeliverySession().getId())
                .purchaseOrderItemId(poItem.getId())
                .itemTypeName(itemName)
                .measuringUnit(measuringUnit)
                .goodQuantity(receipt.getGoodQuantity())
                .isRedelivery(receipt.getIsRedelivery())
                .processedBy(receipt.getDeliverySession().getProcessedBy())
                .processedAt(receipt.getDeliverySession().getProcessedAt())
                .issues(receipt.getIssues().stream()
                        .map(this::convertIssueToDTO)
                        .toList())
                .build();

        // ADD CATEGORY INFO
        if (poItem.getItemType() != null && poItem.getItemType().getItemCategory() != null) {
            dto.setItemCategoryName(poItem.getItemType().getItemCategory().getName());
            dto.setItemCategoryId(poItem.getItemType().getItemCategory().getId());
        }

        return dto;
    }

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
                .itemTypeName(issue.getPurchaseOrderItem().getItemType() != null
                        ? issue.getPurchaseOrderItem().getItemType().getName()
                        : (issue.getPurchaseOrderItem().getEquipmentSpec() != null
                                ? issue.getPurchaseOrderItem().getEquipmentSpec().getName() : "Unknown"))
                .measuringUnit(issue.getPurchaseOrderItem().getItemType() != null && issue.getPurchaseOrderItem().getItemType().getMeasuringUnit() != null
                        ? issue.getPurchaseOrderItem().getItemType().getMeasuringUnit().getName()
                        : (issue.getPurchaseOrderItem().getEquipmentSpec() != null ? "unit" : null))
                .itemTypeCategoryName(issue.getPurchaseOrderItem().getItemType() != null && issue.getPurchaseOrderItem().getItemType().getItemCategory() != null
                        ? issue.getPurchaseOrderItem().getItemType().getItemCategory().getName()
                        : null)
                .build();

        if (issue.getPurchaseOrderItem() != null && issue.getPurchaseOrderItem().getMerchant() != null) {
            Merchant merchant = issue.getPurchaseOrderItem().getMerchant();
            dto.setMerchantId(merchant.getId());
            dto.setMerchantName(merchant.getName());
            dto.setMerchantContactPhone(merchant.getContactPhone());
            dto.setMerchantContactSecondPhone(merchant.getContactSecondPhone());
            dto.setMerchantContactEmail(merchant.getContactEmail());
            dto.setMerchantContactPersonName(merchant.getContactPersonName());
            dto.setMerchantAddress(merchant.getAddress());
            dto.setMerchantPhotoUrl(merchant.getPhotoUrl());
        }

        return dto;
    }

    private PurchaseOrderDTO convertToDTO(PurchaseOrder po) {
        RequestOrder requestOrder = null;
        Offer offer = null;

        try {
            requestOrder = po.getRequestOrder();
        } catch (Exception e) {
            log.warn("Error accessing RequestOrder for PO {}: {}", po.getId(), e.getMessage());
        }

        try {
            offer = po.getOffer();
        } catch (Exception e) {
            log.warn("Error accessing Offer for PO {}: {}", po.getId(), e.getMessage());
        }

        PurchaseOrderDTO dto = new PurchaseOrderDTO();
        dto.setId(po.getId());
        dto.setPoNumber(po.getPoNumber());
        dto.setCreatedAt(po.getCreatedAt());
        dto.setUpdatedAt(po.getUpdatedAt());
        dto.setStatus(po.getStatus());
        dto.setCreatedBy(po.getCreatedBy());
        dto.setApprovedBy(po.getApprovedBy());
        dto.setFinanceApprovalDate(po.getFinanceApprovalDate());
        dto.setPaymentTerms(po.getPaymentTerms());
        dto.setExpectedDeliveryDate(po.getExpectedDeliveryDate());
        dto.setTotalAmount(po.getTotalAmount());
        dto.setCurrency(po.getCurrency());
        if (requestOrder != null) {
            dto.setRequestOrderId(requestOrder.getId());

            RequestOrderDTO requestOrderDTO = new RequestOrderDTO();
            requestOrderDTO.setId(requestOrder.getId());
            requestOrderDTO.setTitle(requestOrder.getTitle());
            requestOrderDTO.setDescription(requestOrder.getDescription());
            requestOrderDTO.setRequesterName(requestOrder.getRequesterName());
            requestOrderDTO.setDeadline(requestOrder.getDeadline());
            requestOrderDTO.setStatus(requestOrder.getStatus());
            requestOrderDTO.setPartyType(requestOrder.getPartyType());
            requestOrderDTO.setCreatedAt(requestOrder.getCreatedAt());
            requestOrderDTO.setCreatedBy(requestOrder.getCreatedBy());
            requestOrderDTO.setApprovedAt(requestOrder.getApprovedAt());
            requestOrderDTO.setApprovedBy(requestOrder.getApprovedBy());
            requestOrderDTO.setEmployeeRequestedBy(requestOrder.getEmployeeRequestedBy());
            requestOrderDTO.setRejectionReason(requestOrder.getRejectionReason());
            dto.setRequestOrder(requestOrderDTO);
        }

        if (offer != null) {
            dto.setOfferId(offer.getId());

            OfferDTO offerDTO = new OfferDTO();
            offerDTO.setId(offer.getId());
            offerDTO.setTitle(offer.getTitle());
            offerDTO.setDescription(offer.getDescription());
            offerDTO.setCreatedBy(offer.getCreatedBy());
            offerDTO.setCreatedAt(offer.getCreatedAt());
            offerDTO.setStatus(offer.getStatus());
            offerDTO.setFinanceStatus(offer.getFinanceStatus());
            offerDTO.setValidUntil(offer.getValidUntil());
            offerDTO.setNotes(offer.getNotes());
            offerDTO.setCurrentAttemptNumber(offer.getCurrentAttemptNumber());
            offerDTO.setTotalRetries(offer.getTotalRetries());
            dto.setOffer(offerDTO);
        }

        List<PurchaseOrderItemDTO> itemDTOs = po.getPurchaseOrderItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        dto.setPurchaseOrderItems(itemDTOs);

        return dto;
    }

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
                .paymentStatus(item.getPaymentStatus())              // ← ADD THIS
                .paymentRequestItemId(item.getPaymentRequestItemId()) // ← ADD THIS
                .purchaseOrderId(item.getPurchaseOrder().getId())
                .build();

        // ✅ ADD THESE DIRECT FIELDS
        if (item.getItemType() != null) {
            dto.setItemTypeId(item.getItemType().getId());
            dto.setItemTypeName(item.getItemType().getName());  // ADD THIS
            dto.setMeasuringUnit(item.getItemType().getMeasuringUnit() != null ?
                    item.getItemType().getMeasuringUnit().getName() : null);

            // ✅ CREATE AND SET THE FULL itemType OBJECT
            ItemTypeDTO itemTypeDTO = new ItemTypeDTO();
            itemTypeDTO.setId(item.getItemType().getId());
            itemTypeDTO.setName(item.getItemType().getName());
            itemTypeDTO.setMeasuringUnit(item.getItemType().getMeasuringUnit() != null ?
                    item.getItemType().getMeasuringUnit().getName() : null);

            // Add category info
            if (item.getItemType().getItemCategory() != null) {
                itemTypeDTO.setItemCategoryId(item.getItemType().getItemCategory().getId());
                itemTypeDTO.setItemCategoryName(item.getItemType().getItemCategory().getName());
            }

            dto.setItemType(itemTypeDTO);  // ✅ SET THE itemType OBJECT
        }

        if (item.getMerchant() != null) {
            dto.setMerchantId(item.getMerchant().getId());
            dto.setMerchantName(item.getMerchant().getName());  // ADD THIS

            MerchantDTO merchantDTO = new MerchantDTO();
            merchantDTO.setId(item.getMerchant().getId());
            merchantDTO.setName(item.getMerchant().getName());
            merchantDTO.setContactEmail(item.getMerchant().getContactEmail());
            merchantDTO.setContactPhone(item.getMerchant().getContactPhone());
            merchantDTO.setContactSecondPhone(item.getMerchant().getContactSecondPhone());
            merchantDTO.setContactPersonName(item.getMerchant().getContactPersonName());
            merchantDTO.setAddress(item.getMerchant().getAddress());
            merchantDTO.setPhotoUrl(item.getMerchant().getPhotoUrl());
            dto.setMerchant(merchantDTO);
        }

        // ✅ ADD CURRENCY
        dto.setCurrency(item.getPurchaseOrder().getCurrency());

        // Equipment spec - also set itemTypeName for display
        if (item.getEquipmentSpec() != null) {
            if (dto.getItemTypeName() == null) {
                dto.setItemTypeName(item.getEquipmentSpec().getName());
            }
            if (dto.getMeasuringUnit() == null) {
                dto.setMeasuringUnit("unit");
            }
            EquipmentPurchaseSpec spec = item.getEquipmentSpec();
            EquipmentPurchaseSpecDTO specDTO = new EquipmentPurchaseSpecDTO();
            specDTO.setId(spec.getId());
            specDTO.setName(spec.getName());
            specDTO.setDescription(spec.getDescription());
            specDTO.setModel(spec.getModel());
            specDTO.setManufactureYear(spec.getManufactureYear());
            specDTO.setCountryOfOrigin(spec.getCountryOfOrigin());
            specDTO.setSpecifications(spec.getSpecifications());
            specDTO.setEstimatedBudget(spec.getEstimatedBudget());
            if (spec.getEquipmentType() != null) {
                specDTO.setEquipmentTypeId(spec.getEquipmentType().getId());
                specDTO.setEquipmentTypeName(spec.getEquipmentType().getName());
            }
            if (spec.getBrand() != null) {
                specDTO.setEquipmentBrandId(spec.getBrand().getId());
                specDTO.setEquipmentBrandName(spec.getBrand().getName());
            }
            dto.setEquipmentSpec(specDTO);
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderDTO> getAllPurchaseOrderDTOs() {
        List<PurchaseOrder> purchaseOrders = purchaseOrderRepository.findAllWithDetails(); // CHANGED
        return purchaseOrders.stream()
                .map(this::convertToBasicDTO)
                .collect(Collectors.toList());
    }

    private PurchaseOrderDTO convertToBasicDTO(PurchaseOrder po) {
        PurchaseOrderDTO dto = new PurchaseOrderDTO();
        dto.setId(po.getId());
        dto.setPoNumber(po.getPoNumber());
        dto.setCreatedAt(po.getCreatedAt());
        dto.setUpdatedAt(po.getUpdatedAt());
        dto.setStatus(po.getStatus());
        dto.setTotalAmount(po.getTotalAmount());
        dto.setCurrency(po.getCurrency());
        dto.setPaymentStatus(po.getPaymentStatus());
        dto.setPaymentRequestId(po.getPaymentRequestId());
        dto.setExpectedDeliveryDate(po.getExpectedDeliveryDate());

        if (po.getRequestOrder() != null) {
            dto.setRequestOrderId(po.getRequestOrder().getId());

            RequestOrderDTO requestOrderDTO = new RequestOrderDTO();
            requestOrderDTO.setId(po.getRequestOrder().getId());
            requestOrderDTO.setTitle(po.getRequestOrder().getTitle());
            requestOrderDTO.setDescription(po.getRequestOrder().getDescription());
            requestOrderDTO.setRequesterName(po.getRequestOrder().getRequesterName());
            requestOrderDTO.setDeadline(po.getRequestOrder().getDeadline());
            requestOrderDTO.setRequesterId(po.getRequestOrder().getRequesterId());
            requestOrderDTO.setPartyType(po.getRequestOrder().getPartyType());
            dto.setRequestOrder(requestOrderDTO);
        }

        if (po.getOffer() != null) {
            dto.setOfferId(po.getOffer().getId());

            OfferDTO offerDTO = new OfferDTO();
            offerDTO.setId(po.getOffer().getId());
            offerDTO.setTitle(po.getOffer().getTitle());
            offerDTO.setDescription(po.getOffer().getDescription());
            offerDTO.setCreatedBy(po.getOffer().getCreatedBy());
            offerDTO.setCreatedAt(po.getOffer().getCreatedAt());
            dto.setOffer(offerDTO);
        }

        // ✅ ADD THIS: Include purchase order items
        if (po.getPurchaseOrderItems() != null && !po.getPurchaseOrderItems().isEmpty()) {
            List<PurchaseOrderItemDTO> itemDTOs = po.getPurchaseOrderItems().stream()
                    .map(this::convertItemToDTO)
                    .collect(Collectors.toList());
            dto.setPurchaseOrderItems(itemDTOs);
        }

        return dto;
    }

    /**
     * FIXED: Create multiple purchase orders grouped by merchant
     * Simplified version - returns minimal data to avoid transaction issues
     */


    /**
     * NEW: Create purchase order for specific merchant
     */
    private PurchaseOrder createPurchaseOrderForMerchant(
            Offer offer,
            Merchant merchant,
            List<OfferItem> items,
            String username) {

        String poNumber = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .createdAt(LocalDateTime.now())
                .status("PENDING")
                .requestOrder(offer.getRequestOrder())
                .offer(offer)
                .createdBy(username)
                .purchaseOrderItems(new ArrayList<>())
                .paymentTerms("Net 30")
                .currency("EGP")
                .build();

        PurchaseOrder savedPO = purchaseOrderRepository.save(po);

        double totalAmount = 0.0;
        int maxDeliveryDays = 0;

        // Create PO items
        for (OfferItem offerItem : items) {
            PurchaseOrderItem poItem = new PurchaseOrderItem();
            poItem.setQuantity(offerItem.getQuantity());
            poItem.setUnitPrice(offerItem.getUnitPrice().doubleValue());
            poItem.setTotalPrice(offerItem.getTotalPrice().doubleValue());
            // ✅ REMOVED: poItem.setCurrency(offerItem.getCurrency()); - PurchaseOrderItem doesn't have this field
            poItem.setEstimatedDeliveryDays(offerItem.getEstimatedDeliveryDays() != null ?
                    offerItem.getEstimatedDeliveryDays() : 30);
            poItem.setDeliveryNotes(offerItem.getDeliveryNotes());
            poItem.setComment(offerItem.getComment());
            poItem.setPurchaseOrder(savedPO);
            poItem.setOfferItem(offerItem);
            poItem.setItemType(offerItem.getRequestOrderItem().getItemType());
            poItem.setMerchant(merchant);

            // Copy equipment spec from request order item to PO item
            if (offerItem.getRequestOrderItem().getEquipmentSpec() != null) {
                poItem.setEquipmentSpec(offerItem.getRequestOrderItem().getEquipmentSpec());
            }
            poItem.setItemReceipts(new ArrayList<>());

            savedPO.getPurchaseOrderItems().add(poItem);
            totalAmount += poItem.getTotalPrice();
            maxDeliveryDays = Math.max(maxDeliveryDays, poItem.getEstimatedDeliveryDays());
        }

        savedPO.setTotalAmount(totalAmount);
        savedPO.setExpectedDeliveryDate(LocalDateTime.now().plusDays(maxDeliveryDays > 0 ? maxDeliveryDays : 30));

        return purchaseOrderRepository.save(savedPO);
    }

    /**
     * Unified PO status update logic - checks BOTH delivery completion AND payment status
     * Call this from delivery processing, issue resolution, AND payment processing
     */
    @Transactional
    public void updatePurchaseOrderStatusComplete(UUID purchaseOrderId) {
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        boolean hasItemsToArrive = false;
        boolean hasDisputedItems = false;

        // Check delivery status of all items
        for (PurchaseOrderItem item : po.getPurchaseOrderItems()) {
            if ("DISPUTED".equals(item.getStatus())) {
                hasDisputedItems = true;
            }
            if (!"COMPLETED".equals(item.getStatus())) {
                hasItemsToArrive = true;
            }
        }

        String oldStatus = po.getStatus();

        // Check if fully paid OR payment is in a terminal failed/rejected state
        boolean isFullyPaid = po.getPaymentStatus() == POPaymentStatus.PAID;
        boolean isPaymentTerminated = po.getPaymentStatus() == POPaymentStatus.PAYMENT_FAILED
                || po.getPaymentStatus() == POPaymentStatus.REJECTED;

        // Determine PO status based on BOTH delivery AND payment
        if (hasDisputedItems && hasItemsToArrive) {
            po.setStatus("PARTIAL_DISPUTED");
        } else if (hasDisputedItems) {
            po.setStatus("DISPUTED");
        } else if (hasItemsToArrive) {
            po.setStatus("PARTIAL");
        } else if (!isFullyPaid && !isPaymentTerminated) {
            // All items delivered but payment is still pending (not paid, failed, or rejected)
            po.setStatus("AWAITING_PAYMENT");
        } else {
            // All items delivered AND (fully paid OR payment failed/rejected)
            po.setStatus("COMPLETED");
        }

        purchaseOrderRepository.save(po);

        // Update ItemType base prices ONLY when FULLY COMPLETED (items + payment)
        // Note: We only update prices if payment was successful (PAID), not if it failed/rejected
        if ("COMPLETED".equals(po.getStatus()) && !"COMPLETED".equals(oldStatus) && isFullyPaid) {
            log.info("PO fully completed (delivery + payment), updating base prices...");

            try {
                Set<UUID> itemTypeIds = po.getPurchaseOrderItems().stream()
                        .filter(item -> item.getItemType() != null)
                        .map(item -> item.getItemType().getId())
                        .collect(Collectors.toSet());

                for (UUID itemTypeId : itemTypeIds) {
                    try {
                        itemTypeService.updateItemTypeBasePriceFromCompletedPOs(itemTypeId, "SYSTEM");
                    } catch (Exception e) {
                        log.warn("Failed to update base price for item type: {}", e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to collect item types: {}", e.getMessage());
            }
        }

        // Equipment is now created during the receiving step (receive-equipment endpoint)
        // instead of auto-creating with placeholder data on PO completion.
    }
}