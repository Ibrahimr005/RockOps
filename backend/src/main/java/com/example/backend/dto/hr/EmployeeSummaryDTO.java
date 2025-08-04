package com.example.backend.dto.hr;

import com.example.backend.models.hr.Department;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Lightweight DTO for employee summaries in lists
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSummaryDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String status;
    private String photoUrl;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    private BigDecimal monthlySalary;
    private String contractType;
    private Boolean eligibleForPromotion;
    private Integer monthsSinceHire;
    private Long monthsSinceLastPromotion;
    private Integer promotionCount;
    private String siteName;

    // Additional fields for analytics
    private Double performanceRating;
    private String lastPromotionDate;
    private BigDecimal salaryIncreaseTotal;


    private String position;
    private Department department;

    private BigDecimal salary;
    private String employmentType;

}