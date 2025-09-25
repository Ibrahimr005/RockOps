package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.PurchaseOrderDTO;
import com.example.backend.dto.procurement.PurchaseOrderItemDTO;
import com.example.backend.models.procurement.PurchaseOrder;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class PurchaseOrderMapper {

    private final PurchaseOrderItemMapper purchaseOrderItemMapper;
    private final RequestOrderMapper requestOrderMapper;
    private final OfferMapper offerMapper;

    public PurchaseOrderMapper(PurchaseOrderItemMapper purchaseOrderItemMapper,
                               RequestOrderMapper requestOrderMapper,
                               OfferMapper offerMapper) {
        this.purchaseOrderItemMapper = purchaseOrderItemMapper;
        this.requestOrderMapper = requestOrderMapper;
        this.offerMapper = offerMapper;
    }

    public PurchaseOrderDTO toDTO(PurchaseOrder purchaseOrder) {
        if (purchaseOrder == null) return null;

        PurchaseOrderDTO.PurchaseOrderDTOBuilder builder = PurchaseOrderDTO.builder()
                .id(purchaseOrder.getId())
                .poNumber(purchaseOrder.getPoNumber())
                .createdAt(purchaseOrder.getCreatedAt())
                .updatedAt(purchaseOrder.getUpdatedAt())
                .status(purchaseOrder.getStatus())
                .createdBy(purchaseOrder.getCreatedBy())
                .approvedBy(purchaseOrder.getApprovedBy())
                .financeApprovalDate(purchaseOrder.getFinanceApprovalDate())
                .paymentTerms(purchaseOrder.getPaymentTerms())
                .expectedDeliveryDate(purchaseOrder.getExpectedDeliveryDate())
                .totalAmount(purchaseOrder.getTotalAmount())
                .currency(purchaseOrder.getCurrency());

        // Request Order
        if (purchaseOrder.getRequestOrder() != null) {
            builder.requestOrderId(purchaseOrder.getRequestOrder().getId())
                    .requestOrder(requestOrderMapper.toDTO(purchaseOrder.getRequestOrder()));
        }

        // Offer
        if (purchaseOrder.getOffer() != null) {
            builder.offerId(purchaseOrder.getOffer().getId())
                    .offer(offerMapper.toDTO(purchaseOrder.getOffer()));
        }

        // Purchase Order Items
        if (purchaseOrder.getPurchaseOrderItems() != null) {
            List<PurchaseOrderItemDTO> itemDTOs = purchaseOrder.getPurchaseOrderItems().stream()
                    .map(purchaseOrderItemMapper::toDTO)
                    .collect(Collectors.toList());
            builder.purchaseOrderItems(itemDTOs);
        }

        return builder.build();
    }

    public List<PurchaseOrderDTO> toDTOList(List<PurchaseOrder> purchaseOrders) {
        if (purchaseOrders == null) return new ArrayList<>();
        return purchaseOrders.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
