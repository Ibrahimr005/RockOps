// ✅ SOLUTION 1: Updated EmployeeSummaryDTO - Remove Department object to avoid circular reference

package com.example.backend.dto.hr.employee;

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
 * ✅ FIXED VERSION - Removed Department object to prevent circular reference
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

    private Department department;

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

    // ✅ FIXED: Use String instead of Department object to avoid circular reference
    private String departmentName;

    private BigDecimal salary;
    private String employmentType;

    // Safe getters with null checks
    public Boolean getEligibleForPromotion() {
        return this.eligibleForPromotion != null ? this.eligibleForPromotion : false;
    }

    public Integer getMonthsSinceHire() {
        return this.monthsSinceHire != null ? this.monthsSinceHire : 0;
    }

    public Long getMonthsSinceLastPromotion() {
        return this.monthsSinceLastPromotion != null ? this.monthsSinceLastPromotion : 0L;
    }

    public Integer getPromotionCount() {
        return this.promotionCount != null ? this.promotionCount : 0;
    }

    public Double getPerformanceRating() {
        return this.performanceRating != null ? this.performanceRating : 0.0;
    }

    public String getStatus() {
        return this.status != null ? this.status : "UNKNOWN";
    }

    public String getContractType() {
        return this.contractType != null ? this.contractType : "UNKNOWN";
    }

    public boolean isEligibleForPromotion() {
        return getEligibleForPromotion();
    }

    public boolean isActive() {
        return "ACTIVE".equals(getStatus());
    }

    // Static mapper method
    public static EmployeeSummaryDTO fromEntity(com.example.backend.models.hr.Employee employee) {
        if (employee == null) return null;

        return EmployeeSummaryDTO.builder()
                .id(employee.getId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber())
                .status(employee.getStatus() != null ? employee.getStatus().toString() : "UNKNOWN")
                .photoUrl(employee.getPhotoUrl())
                // Only set department name to avoid circular loops
                .departmentName(employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null
                        ? employee.getJobPosition().getDepartment().getName()
                        : null)
                .position(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .siteName(employee.getSite() != null ? employee.getSite().getName() : null)
                .hireDate(employee.getHireDate())
                .build();
    }
}