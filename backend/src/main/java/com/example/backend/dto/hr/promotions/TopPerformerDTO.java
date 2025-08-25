package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for top performers in promotions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopPerformerDTO {
    private UUID employeeId;
    private String employeeName;
    private String currentPosition;
    private String department;
    private Integer totalPromotions;
    private Double averageTimeBetweenPromotions;
    private BigDecimal totalSalaryIncrease;
    private LocalDateTime lastPromotionDate;
}
