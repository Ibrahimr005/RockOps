// RequestItemModificationMapper.java
package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.RequestItemModificationDTO;
import com.example.backend.models.procurement.RequestItemModification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class RequestItemModificationMapper {

    public RequestItemModificationDTO toDTO(RequestItemModification entity) {
        if (entity == null) return null;

        return RequestItemModificationDTO.builder()
                .id(entity.getId())
                .offerId(entity.getOffer() != null ? entity.getOffer().getId() : null)
                .timestamp(entity.getTimestamp())
                .actionBy(entity.getActionBy())
                .action(entity.getAction())
                .itemTypeId(entity.getItemTypeId())
                .itemTypeName(entity.getItemTypeName())
                .itemTypeMeasuringUnit(entity.getItemTypeMeasuringUnit())
                .oldQuantity(entity.getOldQuantity())
                .newQuantity(entity.getNewQuantity())
                .oldComment(entity.getOldComment())
                .newComment(entity.getNewComment())
                .notes(entity.getNotes())
                .build();
    }

    public List<RequestItemModificationDTO> toDTOList(List<RequestItemModification> entities) {
        if (entities == null) return null;
        return entities.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}