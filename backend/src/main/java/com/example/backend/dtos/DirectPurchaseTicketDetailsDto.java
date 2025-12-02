package com.example.backend.dtos;

import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DirectPurchaseTicketDetailsDto {

    private UUID id;
    private UUID equipmentId;
    private UUID merchantId;
    private UUID responsiblePersonId;
    private String sparePart;
    private BigDecimal expectedPartsCost;
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

    // Related entity information
    private String equipmentName;
    private String equipmentModel;
    private String equipmentSerialNumber;
    private String equipmentType;
    private String site;
    private String merchantName;
    private String responsiblePersonName;
    private String responsiblePersonPhone;
    private String responsiblePersonEmail;

    // Steps
    private List<DirectPurchaseStepDto> steps;

    // Progress information
    private Integer totalSteps;
    private Integer completedSteps;
}
