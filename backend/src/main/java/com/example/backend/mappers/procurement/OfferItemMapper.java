package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.OfferItemDTO;
import com.example.backend.mappers.merchant.MerchantMapper;
import com.example.backend.mappers.warehouse.ItemTypeMapper;
import com.example.backend.models.procurement.Offer.OfferItem;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OfferItemMapper {

    private final MerchantMapper merchantMapper;
    private final ItemTypeMapper itemTypeMapper;
    private final RequestOrderItemMapper requestOrderItemMapper;

    public OfferItemMapper(MerchantMapper merchantMapper,
                           ItemTypeMapper itemTypeMapper,
                           RequestOrderItemMapper requestOrderItemMapper) {
        this.merchantMapper = merchantMapper;
        this.itemTypeMapper = itemTypeMapper;
        this.requestOrderItemMapper = requestOrderItemMapper;
    }

    public OfferItemDTO toDTO(OfferItem offerItem) {
        if (offerItem == null) return null;

        OfferItemDTO.OfferItemDTOBuilder builder = OfferItemDTO.builder()
                .id(offerItem.getId())
                .quantity(offerItem.getQuantity())
                .unitPrice(offerItem.getUnitPrice())
                .totalPrice(offerItem.getTotalPrice())
                .currency(offerItem.getCurrency())
                .estimatedDeliveryDays(offerItem.getEstimatedDeliveryDays())
                .deliveryNotes(offerItem.getDeliveryNotes())
                .comment(offerItem.getComment())
                .financeStatus(offerItem.getFinanceStatus())
                .rejectionReason(offerItem.getRejectionReason())
                .financeApprovedBy(offerItem.getFinanceApprovedBy())
                .finalized(offerItem.isFinalized());

        // Parent offer reference (minimal)
        if (offerItem.getOffer() != null) {
            builder.offerId(offerItem.getOffer().getId());
        }

        // Merchant
        if (offerItem.getMerchant() != null) {
            builder.merchantId(offerItem.getMerchant().getId())
                    .merchant(merchantMapper.toDTO(offerItem.getMerchant()));
        }

        // Request Order Item
        if (offerItem.getRequestOrderItem() != null) {
            builder.requestOrderItemId(offerItem.getRequestOrderItem().getId())
                    .requestOrderItem(requestOrderItemMapper.toDTO(offerItem.getRequestOrderItem()));
        }

        // Item Type
        if (offerItem.getItemType() != null) {
            builder.itemTypeId(offerItem.getItemType().getId())
                    .itemType(itemTypeMapper.toDTO(offerItem.getItemType()));
        }

        // Purchase Order Item reference
        if (offerItem.getPurchaseOrderItem() != null) {
            builder.purchaseOrderItemId(offerItem.getPurchaseOrderItem().getId())
                    .hasPurchaseOrderItem(true);
        } else {
            builder.hasPurchaseOrderItem(false);
        }

        return builder.build();
    }

    public List<OfferItemDTO> toDTOList(List<OfferItem> offerItems) {
        if (offerItems == null) return new ArrayList<>();
        return offerItems.stream().map(this::toDTO).collect(Collectors.toList());
    }
}