package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.RequestOrderDTO;
import com.example.backend.dto.procurement.RequestOrderItemDTO;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.RequestOrder;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class RequestOrderMapper {

    private final RequestOrderItemMapper requestOrderItemMapper;

    public RequestOrderMapper(RequestOrderItemMapper requestOrderItemMapper) {
        this.requestOrderItemMapper = requestOrderItemMapper;
    }

    public RequestOrderDTO toDTO(RequestOrder requestOrder) {
        if (requestOrder == null) return null;

        RequestOrderDTO.RequestOrderDTOBuilder builder = RequestOrderDTO.builder()
                .id(requestOrder.getId())
                .title(requestOrder.getTitle())
                .description(requestOrder.getDescription())
                .createdAt(requestOrder.getCreatedAt())
                .createdBy(requestOrder.getCreatedBy())
                .status(requestOrder.getStatus())
                .partyType(requestOrder.getPartyType())
                .requesterId(requestOrder.getRequesterId())
                .requesterName(requestOrder.getRequesterName())
                .updatedAt(requestOrder.getUpdatedAt())
                .updatedBy(requestOrder.getUpdatedBy())
                .approvedAt(requestOrder.getApprovedAt())
                .approvedBy(requestOrder.getApprovedBy())
                .employeeRequestedBy(requestOrder.getEmployeeRequestedBy())
                .deadline(requestOrder.getDeadline())
                .rejectionReason(requestOrder.getRejectionReason());

        // Request Items
        if (requestOrder.getRequestItems() != null) {
            List<RequestOrderItemDTO> itemDTOs = requestOrder.getRequestItems().stream()
                    .map(requestOrderItemMapper::toDTO)
                    .collect(Collectors.toList());
            builder.requestItems(itemDTOs);
        }

// Purchase Orders references (changed from single to multiple)
        if (requestOrder.getPurchaseOrders() != null && !requestOrder.getPurchaseOrders().isEmpty()) {
            List<UUID> purchaseOrderIds = requestOrder.getPurchaseOrders().stream()
                    .map(PurchaseOrder::getId)
                    .collect(Collectors.toList());
            builder.purchaseOrderIds(purchaseOrderIds);
        }

        // Offers list (minimal references)
        if (requestOrder.getOffers() != null) {
            List<UUID> offerIds = requestOrder.getOffers().stream()
                    .map(offer -> offer.getId())
                    .collect(Collectors.toList());
            builder.offerIds(offerIds);
        }

        return builder.build();
    }

    public List<RequestOrderDTO> toDTOList(List<RequestOrder> requestOrders) {
        if (requestOrders == null) return new ArrayList<>();
        return requestOrders.stream().map(this::toDTO).collect(Collectors.toList());
    }
}