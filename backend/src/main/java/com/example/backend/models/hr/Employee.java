package com.example.backend.models.hr;

import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Employee
{
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String middleName;

    private LocalDate birthDate;

    private String email;

    private String phoneNumber;

    private String address;

    private String city;

    private String country;

    private String maritalStatus;

    private String militaryStatus;

    private String nationalIDNumber;

    private String license;

    private LocalDate hireDate;

    private String managerName;

    private String education;

    // Image fields
    @Column(length = 1024) // Increase length to accommodate longer URLs
    private String photoUrl;

    @Column(length = 1024) // Increase length to accommodate longer URLs
    private String idFrontImage;

    @Column(length = 1024) // Increase length to accommodate longer URLs
    private String idBackImage;


    private String gender;

    private String status;  // ACTIVE, O N_LEAVE, SUSPENDED, TERMINATED

    // Additional salary attributes
    private BigDecimal baseSalaryOverride;
    private BigDecimal salaryMultiplier;

    // Relationships
    @ManyToOne
    @JoinColumn(name = "site_id", referencedColumnName = "id")
    @JsonBackReference
    private Site site;

    @ManyToOne
    @JoinColumn(name = "warehouse_id", referencedColumnName = "id")
    @JsonBackReference("warehouse-employee") // Update this annotation
    private Warehouse warehouse;

    @ManyToOne
    @JsonManagedReference
    @JoinColumn(name = "job_position_id", referencedColumnName = "id")
    private JobPosition jobPosition;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Attendance> attendances;


    // Helper methods
    public String getFullName() {
        if (middleName != null && !middleName.isEmpty()) {
            return firstName + " " + middleName + " " + lastName;
        }
        return firstName + " " + lastName;
    }

    /**
     * Get the base salary for this employee
     * If a base salary override is set, use that value
     * Otherwise, use the job position's base salary
     * @return The base salary as BigDecimal
     */
    public BigDecimal getBaseSalary() {
        // If override is set, use that
        if (baseSalaryOverride != null) {
            return baseSalaryOverride;
        }

        // Otherwise use job position's salary if available
        if (jobPosition != null) {
            return BigDecimal.valueOf(jobPosition.getBaseSalary());
        }

        // Default to zero if no salary data available
        return BigDecimal.ZERO;
    }

    /**
     * Calculate the monthly salary based on contract type
     * @return Monthly salary amount
     */
    public BigDecimal getMonthlySalary() {
        BigDecimal baseSalary = getBaseSalary();
        BigDecimal multiplier = salaryMultiplier != null ? salaryMultiplier : BigDecimal.ONE;

        if (jobPosition != null) {
            switch (jobPosition.getContractType()) {
                case HOURLY:
                    // For hourly contracts, calculate based on standard working hours
                    return baseSalary.multiply(multiplier)
                            .multiply(BigDecimal.valueOf(jobPosition.getWorkingDaysPerWeek() * 4))
                            .multiply(BigDecimal.valueOf(jobPosition.getHoursPerShift()));
                case DAILY:
                    // For daily contracts, calculate based on working days per month
                    return baseSalary.multiply(multiplier)
                            .multiply(BigDecimal.valueOf(jobPosition.getWorkingDaysPerMonth()));
                case MONTHLY:
                    // For monthly contracts, use the base salary directly
                    return baseSalary.multiply(multiplier);
                default:
                    return baseSalary.multiply(multiplier);
            }
        }

        return baseSalary.multiply(multiplier);
    }

    /**
     * Calculate the annual total compensation
     * @return Annual total
     */
    public BigDecimal getAnnualTotalCompensation() {
        return getMonthlySalary().multiply(BigDecimal.valueOf(12));
    }

    /**
     * Get the contract type from the job position
     * @return Contract type as string
     */
    public String getContractType() {
        if (jobPosition != null) {
            return jobPosition.getContractType().name();
        }
        return null;
    }

    public boolean canDrive(String equipmentTypeName) {
        if (this.jobPosition == null || equipmentTypeName == null) {
            return false;
        }

        // Generate the expected position name for this equipment type
        String requiredPosition = equipmentTypeName + " Driver";
        return this.jobPosition.getPositionName().equals(requiredPosition);
    }

    // Update the isDriver method to be more general
    public boolean isDriver() {
        if (this.jobPosition == null) {
            return false;
        }

        // Check if the position name contains "Driver" or "Operator"
        String positionName = this.jobPosition.getPositionName().toLowerCase();
        return positionName.contains("driver") || positionName.contains("operator");
    }

    // Add a method to get the equipment types this employee can drive
    public List<String> getEquipmentTypesCanDrive() {
        if (this.jobPosition == null || !isDriver()) {
            return Collections.emptyList();
        }

        String positionName = this.jobPosition.getPositionName();

        // Handle both "X Driver" and "X Operator" patterns
        if (positionName.endsWith(" Driver")) {
            return Collections.singletonList(positionName.substring(0, positionName.length() - 7));
        } else if (positionName.endsWith(" Operator")) {
            return Collections.singletonList(positionName.substring(0, positionName.length() - 9));
        }

        return Collections.emptyList();
    }

    // Helper method to get equipment type the employee can drive (if any)
    public String getEquipmentTypeCanDrive() {
        if (this.jobPosition == null || !this.jobPosition.getPositionName().endsWith(" Driver")) {
            return null;
        }

        // Extract the equipment type from the position name (remove " Driver" suffix)
        return this.jobPosition.getPositionName().substring(0, this.jobPosition.getPositionName().length() - 7);
    }

    public boolean canDrive(EquipmentType equipmentType) {
        if (this.jobPosition == null || equipmentType == null) {
            return false;
        }

        // Get the employee's position
        String employeePosition = this.jobPosition.getPositionName();

        // Check if it matches the required position or any of the alternative formats
        if (employeePosition.equalsIgnoreCase(equipmentType.getRequiredDriverPosition())) {
            return true;
        }

        // Check alternative formats for flexibility
        for (String alternativeFormat : equipmentType.getAlternativePositionFormats()) {
            if (employeePosition.equalsIgnoreCase(alternativeFormat)) {
                return true;
            }
        }

        // For even more flexibility, check if the position contains the equipment type name
        // and includes "driver" or "operator"
        String positionLower = employeePosition.toLowerCase();
        String typeLower = equipmentType.getName().toLowerCase();

        return (positionLower.contains(typeLower) &&
                (positionLower.contains("driver") || positionLower.contains("operator")));
    }

    /**
     * Check if employee can drive the specified equipment type
     * @param equipmentType The equipment type to check
     * @return true if employee can drive this equipment type
     */
    public boolean canDriveEquipmentType(EquipmentType equipmentType) {
        return canDrive(equipmentType);
    }
}