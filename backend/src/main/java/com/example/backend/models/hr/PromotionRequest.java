package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "promotion_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employee", "currentJobPosition", "promotedToJobPosition"})
@ToString(exclude = {"employee", "currentJobPosition", "promotedToJobPosition"})
public class PromotionRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // Employee being promoted
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonManagedReference("employee-promotion-requests")
    private Employee employee;

    // Current position at time of request
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_job_position_id", nullable = false)
    @JsonManagedReference("current-position-promotions")
    private JobPosition currentJobPosition;

    // Position being promoted to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promoted_to_job_position_id", nullable = false)
    @JsonManagedReference("promoted-position-promotions")
    private JobPosition promotedToJobPosition;

    // Request details
    @Column(name = "request_title", nullable = false, length = 200)
    private String requestTitle;

    @Column(name = "justification", length = 2000)
    private String justification; // Why this employee deserves promotion

    @Column(name = "proposed_effective_date")
    private LocalDate proposedEffectiveDate;

    @Column(name = "actual_effective_date")
    private LocalDate actualEffectiveDate; // When promotion actually takes effect

    // Salary details
    @Column(name = "current_salary", precision = 12, scale = 2)
    private BigDecimal currentSalary;

    @Column(name = "proposed_salary", precision = 12, scale = 2)
    private BigDecimal proposedSalary;

    @Column(name = "approved_salary", precision = 12, scale = 2)
    private BigDecimal approvedSalary; // Final approved salary (may differ from proposed)

    // Status tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PromotionStatus status = PromotionStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    @Builder.Default
    private PromotionPriority priority = PromotionPriority.NORMAL;

    // Workflow tracking
    @Column(name = "requested_by", nullable = false, length = 100)
    private String requestedBy; // HR employee who submitted the request

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy; // HR manager who reviewed

    @Column(name = "approved_by", length = 100)
    private String approvedBy; // Final approver (could be HR manager or higher)

    // Comments and feedback
    @Column(name = "hr_comments", length = 1000)
    private String hrComments; // Comments from HR employee

    @Column(name = "manager_comments", length = 1000)
    private String managerComments; // Comments from reviewing manager

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason; // Reason for rejection if applicable

    // Performance metrics (optional)
    @Column(name = "performance_rating")
    private String performanceRating; // e.g., "Excellent", "Good", etc.

    @Column(name = "years_in_current_position")
    private Integer yearsInCurrentPosition;

    @Column(name = "educational_qualifications", length = 500)
    private String educationalQualifications;

    @Column(name = "additional_certifications", length = 500)
    private String additionalCertifications;

    // Department transfer handling
    @Column(name = "involves_department_change")
    @Builder.Default
    private Boolean involvesDepartmentChange = false;

    @Column(name = "requires_additional_training")
    @Builder.Default
    private Boolean requiresAdditionalTraining = false;

    @Column(name = "training_plan", length = 1000)
    private String trainingPlan;

    // Audit fields
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "implemented_at")
    private LocalDateTime implementedAt; // When promotion was actually applied

    // Enums
    public enum PromotionStatus {
        DRAFT,           // Being prepared
        PENDING,         // Submitted and awaiting review
        UNDER_REVIEW,    // Being reviewed by HR manager
        APPROVED,        // Approved but not yet implemented
        IMPLEMENTED,     // Promotion has been applied
        REJECTED,        // Request was rejected
        CANCELLED,       // Request was cancelled
        EXPIRED          // Request expired without action
    }

    public enum PromotionPriority {
        LOW,
        NORMAL,
        HIGH,
        URGENT
    }

    // Helper methods
    public String getEmployeeName() {
        return employee != null ? employee.getFullName() : "Unknown Employee";
    }

    public String getCurrentPositionName() {
        return currentJobPosition != null ? currentJobPosition.getPositionName() : "Unknown Position";
    }

    public String getPromotedToPositionName() {
        return promotedToJobPosition != null ? promotedToJobPosition.getPositionName() : "Unknown Position";
    }

    public String getCurrentDepartmentName() {
        return currentJobPosition != null && currentJobPosition.getDepartment() != null 
            ? currentJobPosition.getDepartment().getName() : "Unknown Department";
    }

    public String getPromotedToDepartmentName() {
        return promotedToJobPosition != null && promotedToJobPosition.getDepartment() != null 
            ? promotedToJobPosition.getDepartment().getName() : "Unknown Department";
    }

    public boolean isInterdepartmentalPromotion() {
        if (currentJobPosition == null || promotedToJobPosition == null) {
            return false;
        }
        
        UUID currentDeptId = currentJobPosition.getDepartment() != null 
            ? currentJobPosition.getDepartment().getId() : null;
        UUID promotedDeptId = promotedToJobPosition.getDepartment() != null 
            ? promotedToJobPosition.getDepartment().getId() : null;
            
        return currentDeptId != null && promotedDeptId != null && !currentDeptId.equals(promotedDeptId);
    }

    public BigDecimal getSalaryIncrease() {
        if (proposedSalary != null && currentSalary != null) {
            return proposedSalary.subtract(currentSalary);
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getSalaryIncreasePercentage() {
        if (currentSalary != null && currentSalary.compareTo(BigDecimal.ZERO) > 0 && proposedSalary != null) {
            return getSalaryIncrease()
                .divide(currentSalary, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        }
        return BigDecimal.ZERO;
    }

    public boolean isPending() {
        return status == PromotionStatus.PENDING || status == PromotionStatus.UNDER_REVIEW;
    }

    public boolean isCompleted() {
        return status == PromotionStatus.IMPLEMENTED || status == PromotionStatus.REJECTED || status == PromotionStatus.CANCELLED;
    }

    public boolean canBeImplemented() {
        return status == PromotionStatus.APPROVED && actualEffectiveDate != null && 
               !actualEffectiveDate.isAfter(LocalDate.now());
    }

    public long getDaysToEffectiveDate() {
        if (proposedEffectiveDate != null) {
            return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), proposedEffectiveDate);
        }
        return 0;
    }

    public boolean isOverdue() {
        return status == PromotionStatus.APPROVED && proposedEffectiveDate != null && 
               proposedEffectiveDate.isBefore(LocalDate.now());
    }

    // Validation methods
    public boolean isValidRequest() {
        return employee != null && 
               currentJobPosition != null && 
               promotedToJobPosition != null && 
               requestTitle != null && !requestTitle.trim().isEmpty() &&
               proposedEffectiveDate != null;
    }

    public String getValidationErrors() {
        StringBuilder errors = new StringBuilder();
        
        if (employee == null) errors.append("Employee is required. ");
        if (currentJobPosition == null) errors.append("Current job position is required. ");
        if (promotedToJobPosition == null) errors.append("Promoted to job position is required. ");
        if (requestTitle == null || requestTitle.trim().isEmpty()) errors.append("Request title is required. ");
        if (proposedEffectiveDate == null) errors.append("Proposed effective date is required. ");
        
        if (currentJobPosition != null && promotedToJobPosition != null && 
            currentJobPosition.getId().equals(promotedToJobPosition.getId())) {
            errors.append("Cannot promote to the same position. ");
        }
        
        if (proposedEffectiveDate != null && proposedEffectiveDate.isBefore(LocalDate.now())) {
            errors.append("Proposed effective date cannot be in the past. ");
        }
        
        return errors.toString().trim();
    }

    // Pre-persist validation
    @PrePersist
    @PreUpdate
    private void validateRequest() {
        if (!isValidRequest()) {
            throw new IllegalStateException("Invalid promotion request: " + getValidationErrors());
        }
        
        // Auto-detect department change
        this.involvesDepartmentChange = isInterdepartmentalPromotion();
        
        // Set submission time if moving to pending status
        if (status == PromotionStatus.PENDING && submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
}