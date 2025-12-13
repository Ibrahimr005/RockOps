package com.example.backend.dtos;

import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDirectPurchaseStepDto {

    private DirectPurchaseStepStatus status;

    private String responsiblePerson;

    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate expectedEndDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate actualEndDate;

    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost must be non-negative")
    private BigDecimal expectedCost;

    @DecimalMin(value = "0.0", inclusive = true, message = "Advanced payment must be non-negative")
    private BigDecimal advancedPayment;

    @DecimalMin(value = "0.0", inclusive = true, message = "Actual cost must be non-negative")
    private BigDecimal actualCost;

    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastChecked;
}
