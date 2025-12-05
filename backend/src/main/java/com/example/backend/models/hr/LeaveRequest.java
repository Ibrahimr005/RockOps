package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "leave_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonBackReference("employee-leave-requests")
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LeaveStatus status = LeaveStatus.PENDING;

    @Column(length = 1000)
    private String reason;

    @Column(name = "days_requested")
    private Integer daysRequested;

    // Approval/Rejection details
    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_comments", length = 1000)
    private String reviewComments;

    // Emergency contact during leave
    @Column(name = "emergency_contact")
    private String emergencyContact;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    // Work delegation
    @Column(name = "work_delegated_to")
    private String workDelegatedTo;

    @Column(name = "delegation_notes", length = 1000)
    private String delegationNotes;

    // Audit fields
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Enums
    public enum LeaveType {
        VACATION("Vacation Leave"),
        SICK("Sick Leave"),
        PERSONAL("Personal Leave"),
        MATERNITY("Maternity Leave"),
        PATERNITY("Paternity Leave"),
        UNPAID("Unpaid Leave"),
        EMERGENCY("Emergency Leave"),
        BEREAVEMENT("Bereavement Leave"),
        ANNUAL("Annual Leave"),
        COMPENSATORY("Compensatory Leave");

        private final String displayName;

        LeaveType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }

        public boolean requiresVacationBalance() {
            return this == VACATION || this == ANNUAL || this == PERSONAL;
        }
    }

    public enum LeaveStatus {
        PENDING("Pending Review"),
        APPROVED("Approved"),
        REJECTED("Rejected"),
        CANCELLED("Cancelled"),
        IN_PROGRESS("In Progress"),
        COMPLETED("Completed");

        private final String displayName;

        LeaveStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Helper methods
    @PrePersist
    @PreUpdate
    private void calculateDaysRequested() {
        if (startDate != null && endDate != null) {
            this.daysRequested = (int) ChronoUnit.DAYS.between(startDate, endDate) + 1;
        }
    }

    public boolean isApproved() {
        return status == LeaveStatus.APPROVED;
    }

    public boolean isPending() {
        return status == LeaveStatus.PENDING;
    }

    public boolean canBeModified() {
        return status == LeaveStatus.PENDING;
    }

    public boolean overlapsWithDates(LocalDate start, LocalDate end) {
        return !(this.endDate.isBefore(start) || this.startDate.isAfter(end));
    }

    public int calculateWorkingDays() {
        // Calculation changed to exclude Friday (5) and Saturday (6)
        int workingDays = 0;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            int dayValue = current.getDayOfWeek().getValue();

            // Exclude Friday (5) and Saturday (6). This includes 1, 2, 3, 4 (Mon-Thu) and 7 (Sun).
            if (dayValue != 5 && dayValue != 6) {
                workingDays++;
            }
            current = current.plusDays(1);
        }

        return workingDays;
    }
}