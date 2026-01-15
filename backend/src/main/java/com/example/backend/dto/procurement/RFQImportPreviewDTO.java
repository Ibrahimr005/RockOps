// RFQImportPreviewDTO.java
package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RFQImportPreviewDTO {
    private List<RFQImportRow> rows;
    private int totalRows;
    private int validRows;
    private int invalidRows;
    private List<String> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RFQImportRow {
        private int rowNumber;
        private String itemName;
        private Double responseQuantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String measuringUnit;

        private Double requestedQuantity;

        private String currency;
        private Integer estimatedDeliveryDays;

        // Validation
        private boolean isValid;
        private String errorMessage;

        // Mapping
        private UUID itemTypeId;
        private UUID requestOrderItemId;
    }
}