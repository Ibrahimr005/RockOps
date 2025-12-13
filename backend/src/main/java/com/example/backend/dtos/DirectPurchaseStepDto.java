package com.example.backend.dtos;

import com.example.backend.models.maintenance.DirectPurchaseStepStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DirectPurchaseStepDto {

    private UUID id;

    private UUID directPurchaseTicketId;

    @NotNull(message = "Step number is required")
    @Min(value = 1, message = "Step number must be 1 or 2")
    @Max(value = 2, message = "Step number must be 1 or 2")
    private Integer stepNumber;

    @NotBlank(message = "Step name is required")
    private String stepName;

    private DirectPurchaseStepStatus status;

    private String responsiblePerson;

    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate expectedEndDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate actualEndDate;

    @NotNull(message = "Expected cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost must be non-negative")
    private BigDecimal expectedCost;

    @DecimalMin(value = "0.0", inclusive = true, message = "Advanced payment must be non-negative")
    private BigDecimal advancedPayment;

    @DecimalMin(value = "0.0", inclusive = true, message = "Actual cost must be non-negative")
    private BigDecimal actualCost;

    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastChecked;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Long version;

    // Computed fields
    private BigDecimal remainingCost;
    private Boolean isCompleted;
    private Boolean isOverdue;
}
