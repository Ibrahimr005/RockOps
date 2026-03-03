package com.example.backend.models.payroll;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * LoanFinanceRequestStatusHistory Entity - Tracks status changes for loan finance requests
 */
@Entity
@Table(name = "loan_finance_request_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanFinanceRequestStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_finance_request_id", nullable = false)
    private LoanFinanceRequest loanFinanceRequest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanFinanceRequest.RequestStatus status;

    @Column(name = "changed_by_user_id")
    private UUID changedByUserId;

    @Column(name = "changed_by_user_name", length = 100)
    private String changedByUserName;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(length = 1000)
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }
}
