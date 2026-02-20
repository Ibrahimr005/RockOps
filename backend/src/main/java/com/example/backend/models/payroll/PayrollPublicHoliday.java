package com.example.backend.models.payroll;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "payroll_public_holidays", indexes = {
        @Index(name = "idx_payroll_holiday_payroll", columnList = "payroll_id"),
        @Index(name = "idx_payroll_holiday_start_date", columnList = "start_date"),
        @Index(name = "idx_payroll_holiday_end_date", columnList = "end_date")
})
@Getter                    // ⭐ Changed from @Data
@Setter                    // ⭐ Changed from @Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"payroll"})
@ToString(exclude = {"payroll"})
public class PayrollPublicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_payroll_holiday_payroll"))
    @JsonManagedReference
    private Payroll payroll;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "holiday_name", nullable = false, length = 200)
    private String holidayName;

    @Column(name = "is_paid", nullable = false)
    @Builder.Default
    private Boolean isPaid = false;

    @Column(name = "is_confirmed")
    @Builder.Default
    private Boolean isConfirmed = false;

    // Business logic methods

    /**
     * Check if this is a single-day holiday
     */
    public boolean isSingleDay() {
        return endDate == null || startDate.equals(endDate);
    }

    /**
     * Get the duration of this holiday in days
     */
    public int getDurationDays() {
        if (endDate == null) {
            return 1;
        }
        return (int) ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }

    /**
     * Check if a given date falls within this holiday period
     */
    public boolean containsDate(LocalDate date) {
        if (date == null) {
            return false;
        }

        if (isSingleDay()) {
            return startDate.equals(date);
        }

        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    /**
     * Validation: end date must be after or equal to start date
     */
    @PrePersist
    @PreUpdate
    private void validateDates() {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalStateException(
                    "Holiday end date cannot be before start date: " +
                            holidayName + " (" + startDate + " to " + endDate + ")"
            );
        }
    }
}