package com.example.backend.dtos;

import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DirectPurchaseTicketDto {

    private UUID id;

    @NotNull(message = "Equipment ID is required")
    private UUID equipmentId;

    @NotNull(message = "Merchant ID is required")
    private UUID merchantId;

    @NotNull(message = "Responsible person ID is required")
    private UUID responsiblePersonId;

    @NotBlank(message = "Spare part name is required")
    @Size(max = 255, message = "Spare part name must not exceed 255 characters")
    private String sparePart;

    @NotNull(message = "Expected parts cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected parts cost must be non-negative")
    private BigDecimal expectedPartsCost;

    @NotNull(message = "Expected transportation cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected transportation cost must be non-negative")
    private BigDecimal expectedTransportationCost;

    private String description;

    private DirectPurchaseStatus status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    private String createdBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Long version;

    // Computed fields
    private BigDecimal totalExpectedCost;
    private BigDecimal totalActualCost;

    // Related entity information (for display)
    private String equipmentName;
    private String equipmentModel;
    private String equipmentSerialNumber;
    private String merchantName;
    private String responsiblePersonName;
    private String responsiblePersonPhone;
}
