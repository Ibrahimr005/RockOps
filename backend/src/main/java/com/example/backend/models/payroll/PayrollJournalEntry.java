package com.example.backend.models.payroll;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payroll_journal_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollJournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payslip_id", nullable = false)
    @JsonBackReference
    private Payslip payslip;

    @Column(name = "journal_entry_reference")
    private String journalEntryReference;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JournalEntryStatus status = JournalEntryStatus.PENDING;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum JournalEntryStatus {
        PENDING, POSTED, FAILED
    }
}