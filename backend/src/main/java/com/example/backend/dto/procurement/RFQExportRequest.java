// RFQExportRequest.java
package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RFQExportRequest {
    private UUID offerId;
    private List<RFQItemSelection> items;
    private String language; // "en" or "ar"
    private String filename;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RFQItemSelection {
        private UUID itemTypeId;
        private String itemTypeName;
        private String measuringUnit;
        private double requestedQuantity;
    }
}