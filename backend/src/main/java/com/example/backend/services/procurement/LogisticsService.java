package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.Logistics.*;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.Logistics.*;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.LogisticsPurchaseOrderRepository;
import com.example.backend.repositories.procurement.LogisticsRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LogisticsService {

    private final LogisticsRepository logisticsRepository;
    private final LogisticsPurchaseOrderRepository logisticsPurchaseOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final MerchantRepository merchantRepository;
    private final PaymentRequestRepository paymentRequestRepository;

    @Transactional
    public LogisticsResponseDTO createLogistics(CreateLogisticsDTO dto, UUID userId, String username) {
        // Validate merchant
        Merchant merchant = merchantRepository.findById(dto.getMerchantId())
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Generate logistics number
        String logisticsNumber = generateLogisticsNumber();

        // Create logistics entity
        Logistics logistics = Logistics.builder()
                .logisticsNumber(logisticsNumber)
                .merchant(merchant)
                .merchantName(merchant.getName())
                .totalCost(dto.getTotalCost())
                .currency(dto.getCurrency())
                .carrierCompany(dto.getCarrierCompany())
                .driverName(dto.getDriverName())
                .driverPhone(dto.getDriverPhone())
                .notes(dto.getNotes())
                .status(LogisticsStatus.PENDING_APPROVAL)
                .createdBy(username)
                .createdAt(LocalDateTime.now())
                .requestedAt(LocalDateTime.now())
                .build();

        // Calculate total value of all selected items across all POs
        BigDecimal grandTotalItemsValue = BigDecimal.ZERO;

        // First pass: calculate total value
        for (CreateLogisticsDTO.LogisticsPurchaseOrderDTO poDto : dto.getPurchaseOrders()) {
            List<PurchaseOrderItem> items = purchaseOrderItemRepository
                    .findAllByIdIn(poDto.getSelectedItemIds());

            BigDecimal poItemsTotal = items.stream()
                    .map(item -> BigDecimal.valueOf(item.getUnitPrice())
                            .multiply(BigDecimal.valueOf(item.getQuantity()))
                            .setScale(2, RoundingMode.HALF_UP))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            grandTotalItemsValue = grandTotalItemsValue.add(poItemsTotal);
        }


        if (grandTotalItemsValue.compareTo(BigDecimal.ZERO) == 0) {
            throw new RuntimeException("Total items value cannot be zero");
        }

        // Second pass: create logistics purchase orders with calculated percentages
// Second pass: create logistics purchase orders with calculated percentages
        for (CreateLogisticsDTO.LogisticsPurchaseOrderDTO poDto : dto.getPurchaseOrders()) {
            PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(poDto.getPurchaseOrderId())
                    .orElseThrow(() -> new RuntimeException("Purchase Order not found: " + poDto.getPurchaseOrderId()));

            List<PurchaseOrderItem> items = purchaseOrderItemRepository
                    .findAllByIdIn(poDto.getSelectedItemIds());

            if (items.isEmpty()) {
                throw new RuntimeException("No items found for PO: " + poDto.getPurchaseOrderId());
            }

            // Calculate total value of selected items for this PO
            BigDecimal poItemsTotal = items.stream()
                    .map(item -> BigDecimal.valueOf(item.getUnitPrice())
                            .multiply(BigDecimal.valueOf(item.getQuantity()))
                            .setScale(2, RoundingMode.HALF_UP))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Calculate percentage and allocated cost
            BigDecimal percentage = poItemsTotal
                    .divide(grandTotalItemsValue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal allocatedCost = dto.getTotalCost()
                    .multiply(percentage)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

            // Create LogisticsPurchaseOrder
            LogisticsPurchaseOrder logisticsPO = LogisticsPurchaseOrder.builder()
                    .logistics(logistics)
                    .purchaseOrder(purchaseOrder)
                    .allocatedCost(allocatedCost)
                    .costPercentage(percentage)
                    .totalItemsValue(poItemsTotal)
                    .createdAt(LocalDateTime.now())
                    .build();

            // Create LogisticsPurchaseOrderItem entries
            for (PurchaseOrderItem item : items) {
                BigDecimal itemTotal = BigDecimal.valueOf(item.getUnitPrice())
                        .multiply(BigDecimal.valueOf(item.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP);

                LogisticsPurchaseOrderItem logisticsItem = LogisticsPurchaseOrderItem.builder()
                        .logisticsPurchaseOrder(logisticsPO)
                        .purchaseOrderItem(item)
                        .itemTypeName(item.getItemType().getName())
                        .quantity(BigDecimal.valueOf(item.getQuantity()))
                        .unitPrice(BigDecimal.valueOf(item.getUnitPrice()))
                        .totalValue(itemTotal)
                        .createdAt(LocalDateTime.now())
                        .build();

                logisticsPO.getItems().add(logisticsItem);
            }

            logistics.getPurchaseOrders().add(logisticsPO);
        }

        // Save logistics (will cascade to all related entities)
        Logistics savedLogistics = logisticsRepository.save(logistics);

        // Create payment request
        PaymentRequest paymentRequest = createPaymentRequest(savedLogistics, userId, username);
        savedLogistics.setPaymentRequest(paymentRequest);
        savedLogistics = logisticsRepository.save(savedLogistics);

        return convertToResponseDTO(savedLogistics);
    }

    private PaymentRequest createPaymentRequest(Logistics logistics, UUID userId, String username) {
        String requestNumber = generatePaymentRequestNumber();

        PaymentRequest paymentRequest = PaymentRequest.builder()
                .requestNumber(requestNumber)
                .requestedAmount(logistics.getTotalCost())
                .currency(logistics.getCurrency())
                .description("Logistics payment for " + logistics.getLogisticsNumber() +
                        " - " + logistics.getCarrierCompany())
                .status(PaymentRequestStatus.PENDING)
                .merchant(logistics.getMerchant())
                .merchantName(logistics.getMerchantName())
                .requestedByUserId(userId)
                .requestedByUserName(username)
                .requestedAt(LocalDateTime.now())
                .build();

        return paymentRequestRepository.save(paymentRequest);
    }

    @Transactional(readOnly = true)
    public LogisticsResponseDTO getLogisticsById(UUID id) {
        Logistics logistics = logisticsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Logistics not found"));
        return convertToResponseDTO(logistics);
    }

    @Transactional(readOnly = true)
    public List<LogisticsListDTO> getAllLogistics() {
        List<Logistics> logistics = logisticsRepository.findAllOrderByCreatedAtDesc();
        return logistics.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LogisticsListDTO> getPendingApprovalLogistics() {
        List<Logistics> logistics = logisticsRepository.findByStatus(LogisticsStatus.PENDING_APPROVAL);
        return logistics.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LogisticsListDTO> getHistoryLogistics() {
        List<LogisticsStatus> historyStatuses = List.of(
                LogisticsStatus.APPROVED,
                LogisticsStatus.REJECTED,
                LogisticsStatus.PAID
        );
        List<Logistics> logistics = logisticsRepository.findByStatusIn(historyStatuses);
        return logistics.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<POLogisticsDTO> getLogisticsByPurchaseOrder(UUID purchaseOrderId) {
        List<LogisticsPurchaseOrder> logisticsPOs = logisticsPurchaseOrderRepository
                .findByPurchaseOrderId(purchaseOrderId);

        return logisticsPOs.stream()
                .map(this::convertToPOLogisticsDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalLogisticsCostForPO(UUID purchaseOrderId) {
        List<LogisticsPurchaseOrder> logisticsPOs = logisticsPurchaseOrderRepository
                .findByPurchaseOrderId(purchaseOrderId);

        return logisticsPOs.stream()
                .map(LogisticsPurchaseOrder::getAllocatedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public void handlePaymentRequestApproval(UUID paymentRequestId) {
        Logistics logistics = logisticsRepository.findByPaymentRequestId(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Logistics not found for payment request"));

        PaymentRequest paymentRequest = paymentRequestRepository.findById(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Payment request not found"));

        logistics.setStatus(LogisticsStatus.APPROVED);
        logistics.setApprovedAt(LocalDateTime.now());
        logistics.setApprovedBy(paymentRequest.getApprovedByUserName());

        logisticsRepository.save(logistics);
    }

    @Transactional
    public void handlePaymentRequestRejection(UUID paymentRequestId, String rejectionReason, String rejectedBy) {
        Logistics logistics = logisticsRepository.findByPaymentRequestId(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Logistics not found for payment request"));

        logistics.setStatus(LogisticsStatus.REJECTED);
        logistics.setRejectedAt(LocalDateTime.now());
        logistics.setRejectedBy(rejectedBy);
        logistics.setRejectionReason(rejectionReason);

        logisticsRepository.save(logistics);
    }

    @Transactional
    public void handlePaymentCompletion(UUID paymentRequestId) {
        Logistics logistics = logisticsRepository.findByPaymentRequestId(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Logistics not found for payment request"));

        logistics.setStatus(LogisticsStatus.PAID);
        logisticsRepository.save(logistics);
    }

    private String generateLogisticsNumber() {
        String prefix = "LOG-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        long count = logisticsRepository.countByLogisticsNumberStartingWith(prefix);
        return prefix + String.format("%04d", count + 1);
    }

    private String generatePaymentRequestNumber() {
        String prefix = "PR-LOG-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        // You might want to add a counter here similar to logistics number
        return prefix + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private LogisticsResponseDTO convertToResponseDTO(Logistics logistics) {
        List<LogisticsResponseDTO.LogisticsPODetailDTO> poDetails = logistics.getPurchaseOrders().stream()
                .map(lpo -> {
                    List<LogisticsResponseDTO.LogisticsItemDetailDTO> items = lpo.getItems().stream()
                            .map(item -> {
                                PurchaseOrderItem poItem = item.getPurchaseOrderItem();
                                return LogisticsResponseDTO.LogisticsItemDetailDTO.builder()
                                        .purchaseOrderItemId(poItem.getId())
                                        .itemTypeName(item.getItemTypeName())
                                        .itemCategoryName(poItem.getItemType().getItemCategory().getName())
                                        .quantity(item.getQuantity())
                                        .measuringUnit(poItem.getItemType().getMeasuringUnit())
                                        .unitPrice(item.getUnitPrice())
                                        .totalValue(item.getTotalValue())
                                        .build();
                            })
                            .collect(Collectors.toList());

                    return LogisticsResponseDTO.LogisticsPODetailDTO.builder()
                            .purchaseOrderId(lpo.getPurchaseOrder().getId())
                            .poNumber(lpo.getPurchaseOrder().getPoNumber())
                            .allocatedCost(lpo.getAllocatedCost())
                            .costPercentage(lpo.getCostPercentage())
                            .totalItemsValue(lpo.getTotalItemsValue())
                            .items(items)
                            .build();
                })
                .collect(Collectors.toList());

        return LogisticsResponseDTO.builder()
                .id(logistics.getId())
                .logisticsNumber(logistics.getLogisticsNumber())
                .merchantId(logistics.getMerchant() != null ? logistics.getMerchant().getId() : null)
                .merchantName(logistics.getMerchantName())
                .totalCost(logistics.getTotalCost())
                .currency(logistics.getCurrency())
                .carrierCompany(logistics.getCarrierCompany())
                .driverName(logistics.getDriverName())
                .driverPhone(logistics.getDriverPhone())
                .notes(logistics.getNotes())
                .status(logistics.getStatus())
                .paymentRequestId(logistics.getPaymentRequestId())
                .paymentRequestNumber(logistics.getPaymentRequest() != null ?
                        logistics.getPaymentRequest().getRequestNumber() : null)
                .purchaseOrders(poDetails)
                .createdBy(logistics.getCreatedBy())
                .createdAt(logistics.getCreatedAt())
                .updatedBy(logistics.getUpdatedBy())
                .updatedAt(logistics.getUpdatedAt())
                .requestedAt(logistics.getRequestedAt())
                .approvedAt(logistics.getApprovedAt())
                .approvedBy(logistics.getApprovedBy())
                .rejectedAt(logistics.getRejectedAt())
                .rejectedBy(logistics.getRejectedBy())
                .rejectionReason(logistics.getRejectionReason())
                .build();
    }


    private LogisticsListDTO convertToListDTO(Logistics logistics) {
        return LogisticsListDTO.builder()
                .id(logistics.getId())
                .logisticsNumber(logistics.getLogisticsNumber())
                .merchantName(logistics.getMerchantName())
                .carrierCompany(logistics.getCarrierCompany())
                .driverName(logistics.getDriverName())
                .totalCost(logistics.getTotalCost())
                .currency(logistics.getCurrency())
                .status(logistics.getStatus())
                .paymentRequestId(logistics.getPaymentRequestId())
                .paymentRequestNumber(logistics.getPaymentRequest() != null ?
                        logistics.getPaymentRequest().getRequestNumber() : null)
                .purchaseOrderCount(logistics.getPurchaseOrders().size())
                .createdBy(logistics.getCreatedBy())
                .createdAt(logistics.getCreatedAt())
                .approvedAt(logistics.getApprovedAt())
                .approvedBy(logistics.getApprovedBy())  // ADD THIS
                .rejectedAt(logistics.getRejectedAt())
                .rejectedBy(logistics.getRejectedBy())  // ADD THIS
                .build();
    }

    private POLogisticsDTO convertToPOLogisticsDTO(LogisticsPurchaseOrder lpo) {
        List<POLogisticsDTO.LogisticsItemDetailDTO> items = lpo.getItems().stream()
                .map(item -> {
                    PurchaseOrderItem poItem = item.getPurchaseOrderItem();
                    return POLogisticsDTO.LogisticsItemDetailDTO.builder()
                            .purchaseOrderItemId(poItem.getId())
                            .itemTypeName(item.getItemTypeName())
                            .itemCategoryName(poItem.getItemType().getItemCategory().getName())
                            .quantity(item.getQuantity())
                            .measuringUnit(poItem.getItemType().getMeasuringUnit())
                            .unitPrice(item.getUnitPrice())
                            .totalValue(item.getTotalValue())
                            .build();
                })
                .collect(Collectors.toList());

        Logistics logistics = lpo.getLogistics();
        return POLogisticsDTO.builder()
                .logisticsId(logistics.getId())
                .logisticsNumber(logistics.getLogisticsNumber())
                .merchantName(logistics.getMerchantName())
                .carrierCompany(logistics.getCarrierCompany())
                .driverName(logistics.getDriverName())
                .driverPhone(logistics.getDriverPhone())
                .allocatedCost(lpo.getAllocatedCost())
                .costPercentage(lpo.getCostPercentage())
                .currency(logistics.getCurrency())
                .totalLogisticsCost(logistics.getTotalCost())
                .status(logistics.getStatus())
                .paymentRequestId(logistics.getPaymentRequestId())
                .items(items)
                .notes(logistics.getNotes())
                .createdAt(logistics.getCreatedAt())
                .createdBy(logistics.getCreatedBy())
                .build();
    }
}