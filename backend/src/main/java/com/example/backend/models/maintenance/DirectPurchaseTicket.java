package com.example.backend.models.maintenance;

import com.example.backend.models.contact.Contact;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "direct_purchase_tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectPurchaseTicket {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id")  // Nullable for new workflow - set in Step 2
    private Merchant merchant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id", nullable = false)
    private User responsibleUser;

    // ========== NEW 4-STEP WORKFLOW FIELDS ==========

    @Column(name = "title", length = 500)
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @Column(name = "is_legacy_ticket", nullable = false)
    @Builder.Default
    private Boolean isLegacyTicket = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_step", nullable = false)
    @Builder.Default
    private DirectPurchaseWorkflowStep currentStep = DirectPurchaseWorkflowStep.CREATION;

    // Step 1 - Creation timestamps and optional fields
    @Column(name = "step1_started_at")
    private LocalDateTime step1StartedAt;

    @Column(name = "step1_completed_at")
    private LocalDateTime step1CompletedAt;

    @Column(name = "step1_completed", nullable = false)
    @Builder.Default
    private Boolean step1Completed = false;

    @Column(name = "expected_cost", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost must be non-negative")
    private BigDecimal expectedCost;

    @Column(name = "expected_end_date")
    private java.time.LocalDate expectedEndDate;

    // Step 2 - Purchasing fields and timestamps
    @Column(name = "down_payment", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = true, message = "Down payment must be non-negative")
    private BigDecimal downPayment;

    @Column(name = "step2_started_at")
    private LocalDateTime step2StartedAt;

    @Column(name = "step2_completed_at")
    private LocalDateTime step2CompletedAt;

    @Column(name = "step2_completed", nullable = false)
    @Builder.Default
    private Boolean step2Completed = false;

    // Step 3 - Finalize Purchasing fields and timestamps
    @Column(name = "actual_total_purchasing_cost", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = true, message = "Actual total purchasing cost must be non-negative")
    private BigDecimal actualTotalPurchasingCost;

    @Column(name = "remaining_payment", precision = 10, scale = 2)
    private BigDecimal remainingPayment;

    @Column(name = "step3_started_at")
    private LocalDateTime step3StartedAt;

    @Column(name = "step3_completed_at")
    private LocalDateTime step3CompletedAt;

    @Column(name = "step3_completed", nullable = false)
    @Builder.Default
    private Boolean step3Completed = false;

    // Step 4 - Transporting fields and timestamps
    @Column(name = "transport_from_location", length = 500)
    private String transportFromLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_to_site_id")
    private Site transportToSite;

    @Column(name = "actual_transportation_cost", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = true, message = "Actual transportation cost must be non-negative")
    private BigDecimal actualTransportationCost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_responsible_contact_id")
    private Contact transportResponsibleContact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_responsible_employee_id")
    private Employee transportResponsibleEmployee;

    @Column(name = "step4_started_at")
    private LocalDateTime step4StartedAt;

    @Column(name = "step4_completed_at")
    private LocalDateTime step4CompletedAt;

    @Column(name = "step4_completed", nullable = false)
    @Builder.Default
    private Boolean step4Completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // ========== LEGACY FIELDS (for backwards compatibility) ==========

    @Column(name = "spare_part", length = 255)
    @Size(max = 255, message = "Spare part name must not exceed 255 characters")
    private String sparePart;

    // For legacy tickets only - new workflow calculates from items
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected parts cost must be non-negative")
    @Column(name = "expected_parts_cost", precision = 10, scale = 2)
    private BigDecimal expectedPartsCost;

    // For legacy tickets only - new workflow handles in Step 4
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected transportation cost must be non-negative")
    @Column(name = "expected_transportation_cost", precision = 10, scale = 2)
    private BigDecimal expectedTransportationCost;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private DirectPurchaseStatus status = DirectPurchaseStatus.IN_PROGRESS;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    // ========== RELATIONSHIPS ==========

    @OneToMany(mappedBy = "directPurchaseTicket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("stepNumber ASC")
    private List<DirectPurchaseStep> steps = new ArrayList<>();

    @OneToMany(mappedBy = "directPurchaseTicket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DirectPurchaseItem> items = new ArrayList<>();

    // ========== CALCULATED FIELDS & HELPER METHODS ==========

    /**
     * Calculate total expected cost from items
     * For new workflow tickets, this is calculated from items
     * For legacy tickets, use the old expectedPartsCost + expectedTransportationCost
     * @return Total expected cost
     */
    public BigDecimal getTotalExpectedCost() {
        if (isLegacyTicket != null && isLegacyTicket) {
            // Legacy calculation
            if (expectedPartsCost == null || expectedTransportationCost == null) {
                return BigDecimal.ZERO;
            }
            return expectedPartsCost.add(expectedTransportationCost);
        }

        // New workflow: calculate from items
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .map(DirectPurchaseItem::getTotalExpectedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total actual cost
     * For new workflow tickets, this includes actual purchasing cost + actual transportation cost
     * For legacy tickets, use the old step-based calculation
     * @return Total actual cost
     */
    public BigDecimal getTotalActualCost() {
        if (isLegacyTicket != null && isLegacyTicket) {
            // Legacy calculation from steps
            if (steps == null || steps.isEmpty()) {
                return BigDecimal.ZERO;
            }
            return steps.stream()
                    .filter(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED)
                    .map(DirectPurchaseStep::getActualCost)
                    .filter(cost -> cost != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // New workflow: purchasing cost + transportation cost
        BigDecimal purchasingCost = actualTotalPurchasingCost != null ? actualTotalPurchasingCost : BigDecimal.ZERO;
        BigDecimal transportCost = actualTransportationCost != null ? actualTransportationCost : BigDecimal.ZERO;
        return purchasingCost.add(transportCost);
    }

    /**
     * Calculate total expected purchasing cost from items (Step 2)
     * @return Sum of expected costs for all items
     */
    public BigDecimal getTotalExpectedPurchasingCost() {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .map(DirectPurchaseItem::getTotalExpectedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total actual purchasing cost from items (Step 3)
     * @return Sum of actual costs for all items
     */
    public BigDecimal getTotalActualPurchasingCostFromItems() {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .map(DirectPurchaseItem::getTotalActualCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate remaining payment (Step 3)
     * @return Actual total purchasing cost - down payment
     */
    public BigDecimal calculateRemainingPayment() {
        BigDecimal actualCost = actualTotalPurchasingCost != null ? actualTotalPurchasingCost : BigDecimal.ZERO;
        BigDecimal down = downPayment != null ? downPayment : BigDecimal.ZERO;
        return actualCost.subtract(down);
    }

    // ========== ITEM MANAGEMENT HELPER METHODS ==========

    /**
     * Add an item to this ticket
     */
    public void addItem(DirectPurchaseItem item) {
        if (items == null) {
            items = new ArrayList<>();
        }
        items.add(item);
        item.setDirectPurchaseTicket(this);
    }

    /**
     * Remove an item from this ticket
     */
    public void removeItem(DirectPurchaseItem item) {
        if (items != null) {
            items.remove(item);
            item.setDirectPurchaseTicket(null);
        }
    }

    /**
     * Check if all items have expected costs set (Step 2 validation)
     */
    public boolean allItemsHaveExpectedCosts() {
        if (items == null || items.isEmpty()) {
            return false;
        }
        return items.stream().allMatch(DirectPurchaseItem::hasExpectedCost);
    }

    /**
     * Check if all items have actual costs set (Step 3 validation)
     */
    public boolean allItemsHaveActualCosts() {
        if (items == null || items.isEmpty()) {
            return false;
        }
        return items.stream().allMatch(DirectPurchaseItem::hasActualCost);
    }

    // ========== LEGACY STEP MANAGEMENT HELPER METHODS ==========

    public void addStep(DirectPurchaseStep step) {
        if (steps == null) {
            steps = new ArrayList<>();
        }
        steps.add(step);
        step.setDirectPurchaseTicket(this);
    }

    public void removeStep(DirectPurchaseStep step) {
        if (steps != null) {
            steps.remove(step);
            step.setDirectPurchaseTicket(null);
        }
    }

    // Check if all steps are completed (legacy tickets only)
    public boolean isFullyCompleted() {
        if (isLegacyTicket != null && isLegacyTicket) {
            // Legacy: check if all steps are completed
            if (steps == null || steps.isEmpty()) {
                return false;
            }
            return steps.stream().allMatch(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED);
        } else {
            // New workflow: check if all 4 steps are completed
            return step1Completed && step2Completed && step3Completed && step4Completed;
        }
    }

    // ========== WORKFLOW STEP PROGRESSION HELPERS ==========

    /**
     * Check if ticket can progress to next step
     */
    public boolean canProgressToNextStep() {
        if (isLegacyTicket != null && isLegacyTicket) {
            return false; // Legacy tickets don't use workflow progression
        }

        switch (currentStep) {
            case CREATION:
                return step1Completed;
            case PURCHASING:
                return step2Completed;
            case FINALIZE_PURCHASING:
                return step3Completed;
            case TRANSPORTING:
                return step4Completed;
            case COMPLETED:
                return false; // Already completed
            default:
                return false;
        }
    }

    /**
     * Progress to next workflow step
     */
    public void progressToNextStep() {
        if (!canProgressToNextStep()) {
            return;
        }

        switch (currentStep) {
            case CREATION:
                currentStep = DirectPurchaseWorkflowStep.PURCHASING;
                step2StartedAt = LocalDateTime.now();
                break;
            case PURCHASING:
                currentStep = DirectPurchaseWorkflowStep.FINALIZE_PURCHASING;
                step3StartedAt = LocalDateTime.now();
                break;
            case FINALIZE_PURCHASING:
                currentStep = DirectPurchaseWorkflowStep.TRANSPORTING;
                step4StartedAt = LocalDateTime.now();
                break;
            case TRANSPORTING:
                currentStep = DirectPurchaseWorkflowStep.COMPLETED;
                completedAt = LocalDateTime.now();
                status = DirectPurchaseStatus.COMPLETED;
                break;
            default:
                break;
        }
    }

    /**
     * Get current workflow step as a readable string
     */
    public String getCurrentStepDisplay() {
        if (isLegacyTicket != null && isLegacyTicket) {
            return "Legacy Ticket";
        }

        switch (currentStep) {
            case CREATION:
                return "Step 1: Creation";
            case PURCHASING:
                return "Step 2: Purchasing";
            case FINALIZE_PURCHASING:
                return "Step 3: Finalize Purchasing";
            case TRANSPORTING:
                return "Step 4: Transporting";
            case COMPLETED:
                return "Completed";
            default:
                return "Unknown";
        }
    }

    /**
     * Get progress percentage (0-100)
     */
    public int getProgressPercentage() {
        if (isLegacyTicket != null && isLegacyTicket) {
            // Legacy: calculate based on completed steps
            if (steps == null || steps.isEmpty()) {
                return 0;
            }
            long completed = steps.stream().filter(DirectPurchaseStep::isCompleted).count();
            return (int) ((completed * 100) / steps.size());
        }

        // New workflow: 25% per completed step
        int completedSteps = 0;
        if (step1Completed) completedSteps++;
        if (step2Completed) completedSteps++;
        if (step3Completed) completedSteps++;
        if (step4Completed) completedSteps++;

        return completedSteps * 25;
    }

    /**
     * Get number of completed steps (for new workflow)
     */
    public int getCompletedStepsCount() {
        if (isLegacyTicket != null && isLegacyTicket) {
            if (steps == null) return 0;
            return (int) steps.stream().filter(DirectPurchaseStep::isCompleted).count();
        }

        int count = 0;
        if (step1Completed) count++;
        if (step2Completed) count++;
        if (step3Completed) count++;
        if (step4Completed) count++;
        return count;
    }

    /**
     * Get total number of steps
     */
    public int getTotalStepsCount() {
        if (isLegacyTicket != null && isLegacyTicket) {
            return steps != null ? steps.size() : 0;
        }
        return 4; // New workflow always has 4 steps
    }

    // ========== RESPONSIBLE PERSON INFO ==========

    /**
     * Get responsible person name from user
     */
    public String getResponsiblePersonName() {
        if (responsibleUser != null) {
            return responsibleUser.getFirstName() + " " + responsibleUser.getLastName();
        }
        return null;
    }

    public String getResponsiblePersonPhone() {
        // User model doesn't have phone, return null
        return null;
    }

    public String getResponsiblePersonEmail() {
        if (responsibleUser != null) {
            return responsibleUser.getUsername(); // Username is typically email
        }
        return null;
    }

    // ========== TRANSPORT RESPONSIBLE PERSON INFO ==========

    /**
     * Get transport responsible person name (either from contact or employee)
     */
    public String getTransportResponsiblePersonName() {
        if (transportResponsibleContact != null) {
            return transportResponsibleContact.getFullName();
        }
        if (transportResponsibleEmployee != null) {
            return transportResponsibleEmployee.getFullName();
        }
        return null;
    }

    /**
     * Get transport responsible person phone
     */
    public String getTransportResponsiblePersonPhone() {
        if (transportResponsibleContact != null) {
            return transportResponsibleContact.getPhoneNumber();
        }
        if (transportResponsibleEmployee != null) {
            return transportResponsibleEmployee.getPhoneNumber();
        }
        return null;
    }

    /**
     * Get transport responsible person email
     */
    public String getTransportResponsiblePersonEmail() {
        if (transportResponsibleContact != null) {
            return transportResponsibleContact.getEmail();
        }
        if (transportResponsibleEmployee != null) {
            return transportResponsibleEmployee.getEmail();
        }
        return null;
    }

    /**
     * Get transport responsible person type (CONTACT or EMPLOYEE)
     */
    public String getTransportResponsiblePersonType() {
        if (transportResponsibleContact != null) {
            return "CONTACT";
        }
        if (transportResponsibleEmployee != null) {
            return "EMPLOYEE";
        }
        return null;
    }

    /**
     * Check if transport responsible person is assigned
     */
    public boolean hasTransportResponsiblePerson() {
        return transportResponsibleContact != null || transportResponsibleEmployee != null;
    }

    // Status enum
    public enum DirectPurchaseStatus {
        IN_PROGRESS, COMPLETED, CANCELLED
    }
}
