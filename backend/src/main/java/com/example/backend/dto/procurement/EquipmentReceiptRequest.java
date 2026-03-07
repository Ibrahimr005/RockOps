package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentReceiptRequest {

    private String processedBy;
    private String deliveryNotes;
    private List<EquipmentReceiptData> equipmentItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquipmentReceiptData {
        private UUID purchaseOrderItemId;
        private String serialNumber;
        private double shipping;
        private double customs;
        private double taxes;
        private String countryOfOrigin;
        private LocalDate deliveredDate;
        private String notes;
    }
}
