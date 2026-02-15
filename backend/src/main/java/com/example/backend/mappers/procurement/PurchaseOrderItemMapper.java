package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderItemDTO;
import com.example.backend.mappers.merchant.MerchantMapper;
import com.example.backend.mappers.warehouse.ItemTypeMapper;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class PurchaseOrderItemMapper {

    private final MerchantMapper merchantMapper;
    private final ItemTypeMapper itemTypeMapper;

    public PurchaseOrderItemMapper(MerchantMapper merchantMapper, ItemTypeMapper itemTypeMapper) {
        this.merchantMapper = merchantMapper;
        this.itemTypeMapper = itemTypeMapper;
    }

    public PurchaseOrderItemDTO toDTO(PurchaseOrderItem item) {
        if (item == null) return null;

        PurchaseOrderItemDTO.PurchaseOrderItemDTOBuilder builder = PurchaseOrderItemDTO.builder()
                .id(item.getId())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .comment(item.getComment())
                .status(item.getStatus())
                .estimatedDeliveryDays(item.getEstimatedDeliveryDays())
                .deliveryNotes(item.getDeliveryNotes());

        // Parent Purchase Order ID
        if (item.getPurchaseOrder() != null) {
            builder.purchaseOrderId(item.getPurchaseOrder().getId());
        }

        // Offer Item ID
        if (item.getOfferItem() != null) {
            builder.offerItemId(item.getOfferItem().getId());
        }

        // Item Type
        if (item.getItemType() != null) {
            builder.itemTypeId(item.getItemType().getId())
                    .itemType(itemTypeMapper.toDTO(item.getItemType()));
        }

        // Merchant
        if (item.getMerchant() != null) {
            builder.merchantId(item.getMerchant().getId())
                    .merchant(merchantMapper.toDTO(item.getMerchant()));
        }

        return builder.build();
    }

    public List<PurchaseOrderItemDTO> toDTOList(List<PurchaseOrderItem> items) {
        if (items == null) return new ArrayList<>();
        return items.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
