package com.example.backend.dto.hr.leave;

import com.example.backend.models.hr.LeaveRequest.LeaveStatus;
import com.example.backend.models.hr.LeaveRequest.LeaveType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class LeaveRequestFilterDTO {
    private UUID employeeId;
    private String employeeName;
    private LeaveStatus status;
    private LeaveType leaveType;
    private UUID departmentId;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fromDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate toDate;
    
    // Pagination
    private int page = 0;
    private int size = 20;
    private String sortBy = "createdAt";
    private String sortDirection = "desc";
}