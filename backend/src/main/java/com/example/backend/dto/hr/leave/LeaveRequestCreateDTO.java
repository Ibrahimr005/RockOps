package com.example.backend.dto.hr.leave;

import com.example.backend.models.hr.LeaveRequest.LeaveType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LeaveRequestCreateDTO {
    private LeaveType leaveType;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    
    private String reason;
    private String emergencyContact;
    private String emergencyPhone;
    private String workDelegatedTo;
    private String delegationNotes;
    
    // For admin/manager use
    private String employeeId; // UUID as string
}