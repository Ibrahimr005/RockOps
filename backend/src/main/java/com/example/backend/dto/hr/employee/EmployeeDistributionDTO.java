package com.example.backend.dto.hr.employee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDistributionDTO {
    private String siteName;
    private String siteLocation;
    private Integer totalEmployees;

    // Employee count by department
    private Map<String, Integer> departmentCounts;

    // Employee count by job position
    private Map<String, Integer> positionCounts;

    // Employee count by employment type (full-time, part-time, etc.)
    private Map<String, Integer> employmentTypeCounts;
}