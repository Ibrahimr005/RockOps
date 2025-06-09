package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SarkyValidationInfoDTO {
    private UUID equipmentId;
    private LocalDate latestDate;
    private LocalDate nextAllowedDate;
    private List<LocalDate> existingDates;
    private Boolean canAddToLatestDate;
} 