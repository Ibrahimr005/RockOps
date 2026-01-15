// OfferRequestItemMapper.java
package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.OfferRequestItemDTO;
import com.example.backend.models.procurement.OfferRequestItem;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class OfferRequestItemMapper {

    public OfferRequestItemDTO toDTO(OfferRequestItem entity) {
        if (entity == null) return null;

        return OfferRequestItemDTO.builder()
                .id(entity.getId())
                .offerId(entity.getOffer() != null ? entity.getOffer().getId() : null)
                .itemTypeId(entity.getItemType() != null ? entity.getItemType().getId() : null)
                .itemTypeName(entity.getItemType() != null ? entity.getItemType().getName() : null)
                .itemTypeMeasuringUnit(entity.getItemType() != null ? entity.getItemType().getMeasuringUnit() : null)
                .quantity(entity.getQuantity())
                .comment(entity.getComment())
                .originalRequestOrderItemId(entity.getOriginalRequestOrderItemId())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedAt(entity.getLastModifiedAt())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    public List<OfferRequestItemDTO> toDTOList(List<OfferRequestItem> entities) {
        if (entities == null) return null;
        return entities.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}