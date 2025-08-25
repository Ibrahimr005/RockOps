package com.example.backend.dto.hr.employee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for employee creation/update requests
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequestDTO {
    private String firstName;
    private String lastName;
    private String middleName;
    private String email;
    private String phoneNumber;
    private String mobilePhone;
    private String address;
    private String city;
    private String country;
    private String birthDate; // In ISO format (YYYY-MM-DD)
    private String hireDate;  // In ISO format (YYYY-MM-DD)
    private String maritalStatus;
    private String militaryStatus;
    private String nationalIDNumber;
    private String gender;
    private String status;  // ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED
    private String education;
    private String photoUrl;
    private String idFrontImage;
    private String idBackImage;

    // Financial details
    private BigDecimal baseSalaryOverride;

    // Relationships
    private UUID jobPositionId;
    private UUID siteId;

}