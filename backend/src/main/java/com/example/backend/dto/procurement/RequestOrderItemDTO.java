package com.example.backend.dto.procurement;

import com.example.backend.dto.warehouse.ItemTypeDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestOrderItemDTO {
    private UUID id;
    private double quantity;
    private String comment;

    // Parent request order ID (minimal reference to avoid circular deps)
    private UUID requestOrderId;

    // Item type information (full DTO)
    private UUID itemTypeId;
    private ItemTypeDTO itemType;
}