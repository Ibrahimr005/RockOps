package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnItemDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequestItem;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.procurement.PurchaseOrderReturnRepository;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderReturnService {

    private final PurchaseOrderReturnRepository purchaseOrderReturnRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final IncomingPaymentRequestService incomingPaymentRequestService;
    private final EntityIdGeneratorService entityIdGeneratorService;

    /**
     * Create ONE PO return request with all items
     * Creates MULTIPLE incoming payment requests (one per merchant)
     */
    @Transactional
    public PurchaseOrderReturnResponseDTO createPurchaseOrderReturn(
            UUID purchaseOrderId,
            CreatePurchaseOrderReturnDTO createDTO,
            String username) {

        log.info("Creating PO return for PO: {} by user: {}", purchaseOrderId, username);

        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        // Validate all items belong to this PO
        List<UUID> itemIds = createDTO.getItems().stream()
                .map(CreatePurchaseOrderReturnDTO.ReturnItemRequest::getPurchaseOrderItemId)
                .collect(Collectors.toList());

        List<PurchaseOrderItem> poItems = purchaseOrderItemRepository.findAllById(itemIds);

        for (PurchaseOrderItem item : poItems) {
            if (!item.getPurchaseOrder().getId().equals(purchaseOrderId)) {
                throw new RuntimeException("Item " + item.getId() + " does not belong to PO " + purchaseOrderId);
            }
        }

        // Generate return ID
        String returnId = entityIdGeneratorService.generateNextId(EntityTypeConfig.PURCHASE_ORDER_RETURN);

        // Create ONE PurchaseOrderReturn for all items
        PurchaseOrderReturn poReturn = PurchaseOrderReturn.builder()
                .returnId(returnId)
                .purchaseOrder(purchaseOrder)
                .status(PurchaseOrderReturnStatus.PENDING)
                .reason(createDTO.getReason())
                .requestedBy(username)
                .requestedAt(LocalDateTime.now())
                .returnItems(new ArrayList<>())
                .build();

        // Add ALL return items
        for (CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest : createDTO.getItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemRequest.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("PO Item not found"));

            // Validate return quantity
            if (itemRequest.getReturnQuantity() > poItem.getQuantity()) {
                throw new RuntimeException("Return quantity cannot exceed purchased quantity for item: " + poItem.getItemType().getName());
            }

            BigDecimal unitPrice = BigDecimal.valueOf(poItem.getUnitPrice());
            BigDecimal returnQuantity = BigDecimal.valueOf(itemRequest.getReturnQuantity());
            BigDecimal totalReturn = unitPrice.multiply(returnQuantity);

            PurchaseOrderReturnItem returnItem = PurchaseOrderReturnItem.builder()
                    .purchaseOrderReturn(poReturn)
                    .purchaseOrderItem(poItem)
                    .merchant(poItem.getMerchant())  // Set merchant from PO item
                    .itemTypeName(poItem.getItemType().getName())
                    .returnQuantity(returnQuantity)
                    .unitPrice(unitPrice)
                    .totalReturnAmount(totalReturn)
                    .reason(itemRequest.getReason())
                    .build();

            poReturn.addReturnItem(returnItem);
        }

        // Calculate total return amount
        poReturn.calculateTotalReturnAmount();

        // Save the ONE PO return
        PurchaseOrderReturn savedReturn = purchaseOrderReturnRepository.save(poReturn);

        // Create MULTIPLE incoming payment requests - one per merchant
        createIncomingPaymentRequestsForReturn(savedReturn);

        log.info("Created PO return: {} with total amount: {}", returnId, savedReturn.getTotalReturnAmount());

        return convertToDTO(savedReturn);
    }

    /**
     * Create incoming payment requests grouped by merchant
     */
    private void createIncomingPaymentRequestsForReturn(PurchaseOrderReturn poReturn) {
        // Group items by merchant (direct access now)
        Map<UUID, List<PurchaseOrderReturnItem>> itemsByMerchant = poReturn.getReturnItems().stream()
                .collect(Collectors.groupingBy(item -> item.getMerchant().getId()));

        log.info("Creating {} incoming payment request(s) - one per merchant", itemsByMerchant.size());

        // Create one IncomingPaymentRequest per merchant
        for (Map.Entry<UUID, List<PurchaseOrderReturnItem>> entry : itemsByMerchant.entrySet()) {
            UUID merchantId = entry.getKey();
            List<PurchaseOrderReturnItem> merchantItems = entry.getValue();

            List<IncomingPaymentRequestItem> incomingPaymentItems = new ArrayList<>();
            BigDecimal merchantTotal = BigDecimal.ZERO;

            for (PurchaseOrderReturnItem returnItem : merchantItems) {
                IncomingPaymentRequestItem item = new IncomingPaymentRequestItem();
                item.setPurchaseOrderItem(returnItem.getPurchaseOrderItem());
                item.setIssue(null);
                item.setItemName(returnItem.getItemTypeName());
                item.setAffectedQuantity(returnItem.getReturnQuantity().doubleValue());
                item.setUnitPrice(returnItem.getUnitPrice());
                item.setTotalRefundAmount(returnItem.getTotalReturnAmount());
                item.setIssueType(null);
                item.setIssueDescription(returnItem.getReason());

                incomingPaymentItems.add(item);
                merchantTotal = merchantTotal.add(returnItem.getTotalReturnAmount());
            }

            incomingPaymentRequestService.createIncomingPaymentFromPOReturn(
                    poReturn.getPurchaseOrder().getId(),
                    merchantId,
                    poReturn.getId(),
                    incomingPaymentItems,
                    merchantTotal
            );
        }
    }

    /**
     * Get all PO returns
     */
    @Transactional(readOnly = true)
    public List<PurchaseOrderReturnResponseDTO> getAllPurchaseOrderReturns() {
        log.info("Fetching all PO returns");
        List<PurchaseOrderReturn> returns = purchaseOrderReturnRepository.findAllByOrderByCreatedAtDesc();
        return returns.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get PO returns by status
     */
    @Transactional(readOnly = true)
    public List<PurchaseOrderReturnResponseDTO> getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus status) {
        log.info("Fetching PO returns with status: {}", status);
        List<PurchaseOrderReturn> returns = purchaseOrderReturnRepository.findByStatusOrderByCreatedAtDesc(status);
        return returns.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get PO return by ID
     */
    @Transactional(readOnly = true)
    public PurchaseOrderReturnResponseDTO getPurchaseOrderReturnById(UUID id) {
        log.info("Fetching PO return: {}", id);
        PurchaseOrderReturn poReturn = purchaseOrderReturnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PO Return not found"));
        return convertToDTO(poReturn);
    }

    /**
     * Convert entity to DTO
     */
    private PurchaseOrderReturnResponseDTO convertToDTO(PurchaseOrderReturn poReturn) {
        List<PurchaseOrderReturnItemDTO> itemDTOs = poReturn.getReturnItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());

        // Get unique merchant names from items (direct access)
        String merchantNames = poReturn.getReturnItems().stream()
                .map(item -> item.getMerchant().getName())
                .distinct()
                .collect(Collectors.joining(", "));

        return PurchaseOrderReturnResponseDTO.builder()
                .id(poReturn.getId())
                .returnId(poReturn.getReturnId())
                .purchaseOrderId(poReturn.getPurchaseOrder().getId())
                .purchaseOrderNumber(poReturn.getPurchaseOrder().getPoNumber())
                .merchantId(null)
                .merchantName(merchantNames)
                .totalReturnAmount(poReturn.getTotalReturnAmount())
                .status(poReturn.getStatus().name())
                .reason(poReturn.getReason())
                .requestedBy(poReturn.getRequestedBy())
                .requestedAt(poReturn.getRequestedAt())
                .approvedBy(poReturn.getApprovedBy())        // ✅ ADD THIS
                .approvedAt(poReturn.getApprovedAt())        // ✅ ADD THIS
                .createdAt(poReturn.getCreatedAt())
                .updatedAt(poReturn.getUpdatedAt())
                .returnItems(itemDTOs)
                .build();
    }

    private PurchaseOrderReturnItemDTO convertItemToDTO(PurchaseOrderReturnItem item) {
        PurchaseOrderReturnItemDTO dto = new PurchaseOrderReturnItemDTO();
        dto.setId(item.getId());
        dto.setPurchaseOrderItemId(item.getPurchaseOrderItem().getId());
        dto.setItemTypeName(item.getItemTypeName());
        dto.setReturnQuantity(item.getReturnQuantity().doubleValue());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalReturnAmount(item.getTotalReturnAmount());
        dto.setReason(item.getReason());
        dto.setCreatedAt(item.getCreatedAt());
        return dto;
    }
}