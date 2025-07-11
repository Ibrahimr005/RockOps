package com.example.backend.models.finance.generalLedger;

import com.example.backend.models.user.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "accounting_periods")
@Data
public class AccountingPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name; // e.g., "January 2025"

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private PeriodStatus status = PeriodStatus.OPEN;

    @ManyToOne
    @JoinColumn(name = "closed_by")
    private User closedBy;

    private LocalDateTime closedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private String closingNotes;

    // Helper method to check if a date falls within this period
    public boolean includesDate(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }
}