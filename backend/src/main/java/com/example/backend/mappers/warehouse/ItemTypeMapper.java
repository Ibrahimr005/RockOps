package com.example.backend.mappers.warehouse;

import com.example.backend.dto.warehouse.ItemTypeDTO;
import com.example.backend.models.warehouse.ItemType;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ItemTypeMapper {

    public ItemTypeDTO toDTO(ItemType itemType) {
        if (itemType == null) return null;

        return ItemTypeDTO.builder()
                .id(itemType.getId())
                .name(itemType.getName())
                .comment(itemType.getComment())
                .measuringUnit(itemType.getMeasuringUnit())
                .status(itemType.getStatus())
                .minQuantity(itemType.getMinQuantity())
                .serialNumber(itemType.getSerialNumber())
                .itemCategoryId(itemType.getItemCategory() != null ? itemType.getItemCategory().getId() : null)
                .itemCategoryName(itemType.getItemCategory() != null ? itemType.getItemCategory().getName() : null)
                .build();
    }

    public List<ItemTypeDTO> toDTOList(List<ItemType> itemTypes) {
        if (itemTypes == null) return new ArrayList<>();
        return itemTypes.stream().map(this::toDTO).collect(Collectors.toList());
    }
}