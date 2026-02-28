// RequestOrderItemMapper.java
package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.RequestOrderItemDTO;
import com.example.backend.mappers.warehouse.ItemTypeMapper;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class RequestOrderItemMapper {

    private final ItemTypeMapper itemTypeMapper;

    public RequestOrderItemMapper(ItemTypeMapper itemTypeMapper) {
        this.itemTypeMapper = itemTypeMapper;
    }

    public RequestOrderItemDTO toDTO(RequestOrderItem requestOrderItem) {
        if (requestOrderItem == null)
            return null;

        RequestOrderItemDTO.RequestOrderItemDTOBuilder builder = RequestOrderItemDTO.builder()
                .id(requestOrderItem.getId())
                .quantity(requestOrderItem.getQuantity())
                .comment(requestOrderItem.getComment());

        // Parent request order ID
        if (requestOrderItem.getRequestOrder() != null) {
            builder.requestOrderId(requestOrderItem.getRequestOrder().getId());
        }

        // Item Type
        if (requestOrderItem.getItemType() != null) {
            builder.itemTypeId(requestOrderItem.getItemType().getId())
                    .itemType(itemTypeMapper.toDTO(requestOrderItem.getItemType()));
        }

        // Equipment Spec
        if (requestOrderItem.getEquipmentSpec() != null) {
            builder.equipmentSpecId(requestOrderItem.getEquipmentSpec().getId())
                    .equipmentName(requestOrderItem.getEquipmentSpec().getName() +
                            (requestOrderItem.getEquipmentSpec().getModel() != null
                                    && !requestOrderItem.getEquipmentSpec().getModel().isEmpty()
                                            ? " " + requestOrderItem.getEquipmentSpec().getModel()
                                            : ""));
        }

        return builder.build();
    }

    public List<RequestOrderItemDTO> toDTOList(List<RequestOrderItem> items) {
        if (items == null)
            return new ArrayList<>();
        return items.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
