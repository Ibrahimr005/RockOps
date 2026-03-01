package com.example.backend.models.hr;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * SalaryHistory - Tracks all salary changes for employees.
 */
@Entity
@Table(name = "salary_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "previous_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal previousSalary;

    @Column(name = "new_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal newSalary;

    @Column(name = "change_type", nullable = false, length = 30)
    private String changeType; // EMPLOYEE_INCREASE, POSITION_INCREASE, PROMOTION, MANUAL

    @Column(name = "change_reason", length = 1000)
    private String changeReason;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType; // SALARY_INCREASE_REQUEST, PROMOTION_REQUEST

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "changed_by")
    private String changedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
