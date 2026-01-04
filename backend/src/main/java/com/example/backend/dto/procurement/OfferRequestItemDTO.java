// OfferRequestItemDTO.java
package com.example.backend.dto.procurement;

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
public class OfferRequestItemDTO {
    private UUID id;
    private UUID offerId;
    private UUID itemTypeId;
    private String itemTypeName;
    private String itemTypeMeasuringUnit;
    private double quantity;
    private String comment;
    private UUID originalRequestOrderItemId;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime lastModifiedAt;
    private String lastModifiedBy;
}