package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer numberOfDays;
    private String status; // PENDING, APPROVED, REJECTED
    private String reason;
    private String approvedBy;
    private LocalDate approvedAt;
    private String rejectedBy;
    private LocalDate rejectedAt;
    private String rejectionReason;
}
