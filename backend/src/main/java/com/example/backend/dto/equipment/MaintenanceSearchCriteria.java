package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceSearchCriteria {
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID technicianId;
    private UUID maintenanceTypeId;
    private String status;
    private String description; // For text search in descriptions
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private Boolean hasLinkedTransactions; // Filter for maintenance records with/without linked transactions
} 