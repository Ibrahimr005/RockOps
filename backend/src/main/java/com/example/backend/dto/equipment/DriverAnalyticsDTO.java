package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverAnalyticsDTO {
    private String driverName;
    private Double totalHours;
    private Double percentage;
} 