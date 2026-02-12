package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestResponseDTO {
    private UUID id;
    private String requestNumber;

    // ========================================
    // SOURCE POLYMORPHISM
    // ========================================

    /**
     * Type of source: PURCHASE_ORDER, MAINTENANCE, PAYROLL_BATCH, LOAN
     */
    private String sourceType;
    private UUID sourceId;
    private String sourceNumber;
    private String sourceDescription;

    // ========================================
    // TARGET POLYMORPHISM
    // ========================================

    /**
     * Type of target: MERCHANT, EMPLOYEE, EMPLOYEE_GROUP
     */
    private String targetType;
    private UUID targetId;
    private String targetName;
    private String targetDetails;

    // ========================================
    // PAYROLL BATCH INFO (when sourceType = PAYROLL_BATCH)
    // ========================================

    private UUID payrollBatchId;
    private String batchNumber;
    private String paymentTypeName;
    private String paymentTypeCode;
    private Integer batchEmployeeCount;
    private String payrollNumber;
    private UUID payrollId;
    private String payrollPeriod;

    /**
     * List of employees in the batch (for payroll batch details display)
     */
    private List<BatchEmployeeDTO> batchEmployees;

    // Purchase Order info (legacy, kept for backward compatibility)
    private UUID purchaseOrderId;
    private String purchaseOrderNumber;

    // Offer Financial Review info
    private UUID offerFinancialReviewId;
    private String budgetCategory;

    // Maintenance info (for maintenance-sourced payment requests)
    private UUID maintenanceStepId;
    private UUID maintenanceRecordId;
    private String maintenanceStepDescription;

    // Amount info
    private BigDecimal requestedAmount;
    private BigDecimal totalPaidAmount;
    private BigDecimal remainingAmount;
    private String currency;

    private String description;
    private PaymentRequestStatus status;

    // Requester info
    private UUID requestedByUserId;
    private String requestedByUserName;
    private String requestedByDepartment;
    private LocalDateTime requestedAt;

    // Review info
    private UUID reviewedByUserId;
    private String reviewedByUserName;
    private LocalDateTime reviewedAt;
    private String reviewNotes;

    // Approval info
    private UUID approvedByUserId;
    private String approvedByUserName;
    private LocalDateTime approvedAt;
    private String approvalNotes;

    // Rejection info
    private UUID rejectedByUserId;
    private String rejectedByUserName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    // Payment dates
    private LocalDate paymentDueDate;
    private LocalDate paymentScheduledDate;

    // Merchant info
    private UUID merchantId;
    private String merchantName;
    private String merchantAccountNumber;
    private String merchantBankName;
    private String merchantContactPerson;
    private String merchantContactPhone;
    private String merchantContactEmail;

    // Related items and payments
    private List<PaymentRequestItemResponseDTO> items;
    private List<AccountPayablePaymentResponseDTO> payments;

    private String metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;

    private String requestOrderTitle;  // Title from RequestOrder via PurchaseOrder

}