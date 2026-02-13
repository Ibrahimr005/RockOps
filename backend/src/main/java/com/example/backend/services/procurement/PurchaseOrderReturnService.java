package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnItemDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequestItem;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.procurement.PurchaseOrderReturnItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderReturnRepository;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
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
    private final PurchaseOrderReturnItemRepository purchaseOrderReturnItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final MerchantRepository merchantRepository;
    private final IncomingPaymentRequestService incomingPaymentRequestService;

    /**
     * Create PO return requests grouped by merchant
     */
    @Transactional
    public List<PurchaseOrderReturnResponseDTO> createPurchaseOrderReturns(
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

        // Group items by merchant
        Map<UUID, List<CreatePurchaseOrderReturnDTO.ReturnItemRequest>> itemsByMerchant = new HashMap<>();

        for (CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest : createDTO.getItems()) {
            PurchaseOrderItem poItem = poItems.stream()
                    .filter(i -> i.getId().equals(itemRequest.getPurchaseOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("PO Item not found"));

            UUID merchantId = poItem.getMerchant().getId();
            itemsByMerchant.computeIfAbsent(merchantId, k -> new ArrayList<>()).add(itemRequest);
        }

        log.info("Grouped return items into {} merchant(s)", itemsByMerchant.size());

        // Create PO return for each merchant
        List<PurchaseOrderReturnResponseDTO> createdReturns = new ArrayList<>();

        for (Map.Entry<UUID, List<CreatePurchaseOrderReturnDTO.ReturnItemRequest>> entry : itemsByMerchant.entrySet()) {
            UUID merchantId = entry.getKey();
            List<CreatePurchaseOrderReturnDTO.ReturnItemRequest> merchantItems = entry.getValue();

            PurchaseOrderReturnResponseDTO returnDTO = createPurchaseOrderReturnForMerchant(
                    purchaseOrder,
                    merchantId,
                    merchantItems,
                    createDTO.getReason(),
                    username
            );

            createdReturns.add(returnDTO);
        }

        log.info("Successfully created {} PO return request(s)", createdReturns.size());
        return createdReturns;
    }

    /**
     * Create PO return for a specific merchant
     */
    private PurchaseOrderReturnResponseDTO createPurchaseOrderReturnForMerchant(
            PurchaseOrder purchaseOrder,
            UUID merchantId,
            List<CreatePurchaseOrderReturnDTO.ReturnItemRequest> itemRequests,
            String reason,
            String username) {

        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Generate return number
        String returnNumber = generateReturnNumber(purchaseOrder.getPoNumber());

        PurchaseOrderReturn poReturn = PurchaseOrderReturn.builder()
                .purchaseOrder(purchaseOrder)
                .merchant(merchant)
                .returnNumber(returnNumber)
                .status(PurchaseOrderReturnStatus.PENDING)
                .reason(reason)
                .requestedBy(username)
                .requestedAt(LocalDateTime.now())
                .returnItems(new ArrayList<>())
                .build();

        // Create return items
        for (CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest : itemRequests) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemRequest.getPurchaseOrderItemId())
                    .orElseThrow(() -> new RuntimeException("PO Item not found"));

            // Validate return quantity
            if (itemRequest.getReturnQuantity() > poItem.getQuantity()) {
                throw new RuntimeException("Return quantity cannot exceed purchased quantity for item: " + poItem.getItemType().getName());
            }

            BigDecimal unitPrice = BigDecimal.valueOf(poItem.getUnitPrice());
            BigDecimal totalReturn = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getReturnQuantity()));

            PurchaseOrderReturnItem returnItem = PurchaseOrderReturnItem.builder()
                    .purchaseOrderReturn(poReturn)
                    .purchaseOrderItem(poItem)
                    .itemTypeName(poItem.getItemType().getName())
                    .returnQuantity(itemRequest.getReturnQuantity())
                    .unitPrice(unitPrice)
                    .totalReturnAmount(totalReturn)
                    .reason(itemRequest.getReason())
                    .build();

            poReturn.addReturnItem(returnItem);
        }

        // Calculate total return amount
        poReturn.calculateTotalReturnAmount();

        // Save PO return
        PurchaseOrderReturn savedReturn = purchaseOrderReturnRepository.save(poReturn);

        // Create incoming payment request for finance tracking
        createIncomingPaymentRequestForReturn(savedReturn);

        log.info("Created PO return: {} for merchant: {} with total amount: {}",
                returnNumber, merchant.getName(), savedReturn.getTotalReturnAmount());

        return convertToDTO(savedReturn);
    }

    /**
     * Create incoming payment request when PO return is created
     */
    private void createIncomingPaymentRequestForReturn(PurchaseOrderReturn poReturn) {
        List<IncomingPaymentRequestItem> incomingPaymentItems = new ArrayList<>();

        for (PurchaseOrderReturnItem returnItem : poReturn.getReturnItems()) {
            IncomingPaymentRequestItem item = new IncomingPaymentRequestItem();
            item.setPurchaseOrderItem(returnItem.getPurchaseOrderItem());
            item.setIssue(null); // No issue for PO returns
            item.setItemName(returnItem.getItemTypeName());
            item.setAffectedQuantity(returnItem.getReturnQuantity());
            item.setUnitPrice(returnItem.getUnitPrice());
            item.setTotalRefundAmount(returnItem.getTotalReturnAmount());
            item.setIssueType(null);
            item.setIssueDescription(returnItem.getReason());

            incomingPaymentItems.add(item);
        }

        incomingPaymentRequestService.createIncomingPaymentFromPOReturn(
                poReturn.getPurchaseOrder().getId(),
                poReturn.getMerchant().getId(),
                poReturn.getId(),
                incomingPaymentItems,
                poReturn.getTotalReturnAmount()
        );
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
     * Generate return number
     */
    private String generateReturnNumber(String poNumber) {
        String datePart = LocalDateTime.now().toString().substring(0, 10).replace("-", "");
        int randomNum = new Random().nextInt(1000);
        String randomPart = String.format("%03d", randomNum);
        return "RET-" + poNumber + "-" + datePart + "-" + randomPart;
    }

    /**
     * Convert entity to DTO
     */
    private PurchaseOrderReturnResponseDTO convertToDTO(PurchaseOrderReturn poReturn) {
        PurchaseOrderReturnResponseDTO dto = new PurchaseOrderReturnResponseDTO();

        dto.setId(poReturn.getId());
        dto.setReturnNumber(poReturn.getReturnNumber());
        dto.setPurchaseOrderId(poReturn.getPurchaseOrder().getId());
        dto.setPurchaseOrderNumber(poReturn.getPurchaseOrder().getPoNumber());
        dto.setMerchantId(poReturn.getMerchant().getId());
        dto.setMerchantName(poReturn.getMerchant().getName());
        dto.setTotalReturnAmount(poReturn.getTotalReturnAmount());
        dto.setStatus(poReturn.getStatus());
        dto.setReason(poReturn.getReason());
        dto.setRequestedBy(poReturn.getRequestedBy());
        dto.setRequestedAt(poReturn.getRequestedAt());
        dto.setCreatedAt(poReturn.getCreatedAt());
        dto.setUpdatedAt(poReturn.getUpdatedAt());

        List<PurchaseOrderReturnItemDTO> itemDTOs = poReturn.getReturnItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        dto.setReturnItems(itemDTOs);

        return dto;
    }

    private PurchaseOrderReturnItemDTO convertItemToDTO(PurchaseOrderReturnItem item) {
        PurchaseOrderReturnItemDTO dto = new PurchaseOrderReturnItemDTO();
        dto.setId(item.getId());
        dto.setPurchaseOrderItemId(item.getPurchaseOrderItem().getId());
        dto.setItemTypeName(item.getItemTypeName());
        dto.setReturnQuantity(item.getReturnQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalReturnAmount(item.getTotalReturnAmount());
        dto.setReason(item.getReason());
        dto.setCreatedAt(item.getCreatedAt());
        return dto;
    }
}