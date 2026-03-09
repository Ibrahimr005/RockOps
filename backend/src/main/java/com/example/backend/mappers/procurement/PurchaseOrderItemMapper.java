package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.EquipmentPurchaseSpecDTO;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderItemDTO;
import com.example.backend.mappers.merchant.MerchantMapper;
import com.example.backend.mappers.warehouse.ItemTypeMapper;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
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

        // Equipment Spec
        if (item.getEquipmentSpec() != null) {
            builder.equipmentSpec(toSpecDTO(item.getEquipmentSpec()));
        }

        return builder.build();
    }

    private EquipmentPurchaseSpecDTO toSpecDTO(EquipmentPurchaseSpec spec) {
        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setId(spec.getId());
        dto.setName(spec.getName());
        dto.setDescription(spec.getDescription());
        dto.setModel(spec.getModel());
        dto.setManufactureYear(spec.getManufactureYear());
        dto.setCountryOfOrigin(spec.getCountryOfOrigin());
        dto.setSpecifications(spec.getSpecifications());
        dto.setEstimatedBudget(spec.getEstimatedBudget());
        if (spec.getEquipmentType() != null) {
            dto.setEquipmentTypeId(spec.getEquipmentType().getId());
            dto.setEquipmentTypeName(spec.getEquipmentType().getName());
        }
        if (spec.getBrand() != null) {
            dto.setEquipmentBrandId(spec.getBrand().getId());
            dto.setEquipmentBrandName(spec.getBrand().getName());
        }
        return dto;
    }

    public List<PurchaseOrderItemDTO> toDTOList(List<PurchaseOrderItem> items) {
        if (items == null) return new ArrayList<>();
        return items.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
