package com.example.backend.dtos;

import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.example.backend.models.maintenance.DirectPurchaseWorkflowStep;
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
    private UUID responsibleUserId;
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

    // ========== NEW 4-STEP WORKFLOW FIELDS ==========

    private String title;
    private Boolean isLegacyTicket;
    private DirectPurchaseWorkflowStep currentStep;
    private String currentStepDisplay;
    private Integer progressPercentage;

    // Step 1 - Creation timestamps
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step1StartedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step1CompletedAt;

    private Boolean step1Completed;

    private BigDecimal expectedCost;
    private java.time.LocalDate expectedEndDate;

    // Step 2 - Purchasing
    private BigDecimal downPayment;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step2StartedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step2CompletedAt;

    private Boolean step2Completed;

    // Step 3 - Finalize Purchasing
    private BigDecimal actualTotalPurchasingCost;
    private BigDecimal remainingPayment;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step3StartedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step3CompletedAt;

    private Boolean step3Completed;

    // Step 4 - Transporting
    private String transportFromLocation;
    private UUID transportToSiteId;
    private String transportToSiteName;
    private BigDecimal actualTransportationCost;

    private UUID transportResponsibleContactId;
    private UUID transportResponsibleEmployeeId;
    private String transportResponsiblePersonName;
    private String transportResponsiblePersonPhone;
    private String transportResponsiblePersonEmail;
    private String transportResponsiblePersonType;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step4StartedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime step4CompletedAt;

    private Boolean step4Completed;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime completedAt;

    // Items list (for new workflow)
    private List<DirectPurchaseItemDto> items;

    // Legacy steps (for legacy tickets)
    private List<DirectPurchaseStepDto> steps;

    // Progress information
    private Integer totalSteps;
    private Integer completedSteps;
}
