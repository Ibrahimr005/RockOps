package com.example.backend.dto.hr.employee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for employee responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private String middleName;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String mobilePhone;
    private String address;
    private String city;
    private String country;
    private String birthDate;
    private String hireDate;
    private String maritalStatus;
    private String militaryStatus;
    private String nationalIDNumber;
    private String license;
    private String gender;
    private String status;
    private String contractType;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String language;
    private String education;
    private String managerName;

    // Image URLs
    private String photoUrl;
    private String idFrontImageUrl;
    private String idBackImageUrl;

    // Relationships
    private UUID siteId;
    private String siteName;
    private UUID warehouseId;
    private String warehouseName;
    private UUID jobPositionId;
    private String jobPositionName;
    private String jobPositionDepartment;

    // Financial details
    private Double baseSalary;
    private BigDecimal baseSalaryOverride;
    private Double salaryMultiplier;
    private BigDecimal adjustedBaseSalary;
    private BigDecimal monthlySalary;
    private BigDecimal bonus;
    private BigDecimal commission;
    private BigDecimal totalCompensation;
    private BigDecimal annualTotalCompensation;

    // Employment details
    private String experienceLevel;
    private String employmentType;
    private Integer workingHours;
    private Integer workingDays;
    private String shifts;
    private Integer probationPeriod;
    private String vacationPolicy;
}