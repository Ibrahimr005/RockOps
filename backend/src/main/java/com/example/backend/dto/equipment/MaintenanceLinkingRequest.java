package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceLinkingRequest {
    private MaintenanceLinkingAction action;
    private UUID existingMaintenanceId; // For linking to existing maintenance
    private NewMaintenanceRequest newMaintenanceRequest; // For creating new maintenance
    
    public enum MaintenanceLinkingAction {
        LINK_EXISTING,
        CREATE_NEW,
        SKIP_MAINTENANCE
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NewMaintenanceRequest {
        private UUID technicianId;
        private LocalDateTime maintenanceDate;
        private UUID maintenanceTypeId;
        private String description;
        private String status;
    }
} 