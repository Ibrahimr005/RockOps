package com.example.backend.dto.warehouse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemTypePriceHistoryDTO {
    private UUID approvalId;
    private String warehouseName;
    private Double approvedPrice;
    private Integer quantity;
    private String approvedBy;
    private String approvedAt;
}