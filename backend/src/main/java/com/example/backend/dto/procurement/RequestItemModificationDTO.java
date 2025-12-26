// RequestItemModificationDTO.java
package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.RequestItemModification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestItemModificationDTO {
    private UUID id;
    private UUID offerId;
    private LocalDateTime timestamp;
    private String actionBy;
    private RequestItemModification.ModificationAction action;
    private UUID itemTypeId;
    private String itemTypeName;
    private String itemTypeMeasuringUnit;
    private Double oldQuantity;
    private Double newQuantity;
    private String oldComment;
    private String newComment;
    private String notes;
}