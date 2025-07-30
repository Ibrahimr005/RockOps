package com.example.backend.models.hr;

import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.payroll.Loan;
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

    private String status;  // ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED

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
    @JsonBackReference("warehouse-employee")
    private Warehouse warehouse;

    @ManyToOne
    @JsonManagedReference
    @JoinColumn(name = "job_position_id", referencedColumnName = "id")
    private JobPosition jobPosition;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Attendance> attendances;

    // NEW: Loan relationship
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonBackReference("employee-loans")
    private List<Loan> loans;

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
        BigDecimal multiplier = salaryMultiplier != null ? salaryMultiplier : BigDecimal.ONE;

        if (jobPosition != null) {
            switch (jobPosition.getContractType()) {
                case HOURLY:
                    // For hourly contracts: if override is set, use it; otherwise calculate from job position
                    if (baseSalaryOverride != null) {
                        return baseSalaryOverride.multiply(multiplier);
                    } else {
                        // Calculate from job position hourly rate
                        if (jobPosition.getHourlyRate() != null && jobPosition.getHoursPerShift() != null &&
                                jobPosition.getWorkingDaysPerWeek() != null) {
                            return BigDecimal.valueOf(jobPosition.getHourlyRate())
                                    .multiply(BigDecimal.valueOf(jobPosition.getHoursPerShift()))
                                    .multiply(BigDecimal.valueOf(jobPosition.getWorkingDaysPerWeek()))
                                    .multiply(BigDecimal.valueOf(4))
                                    .multiply(multiplier);
                        }
                    }
                    break;
                case DAILY:
                    // For daily contracts: if override is set, use it; otherwise calculate from job position
                    if (baseSalaryOverride != null) {
                        return baseSalaryOverride.multiply(multiplier);
                    } else {
                        // Calculate from job position daily rate
                        if (jobPosition.getDailyRate() != null && jobPosition.getWorkingDaysPerMonth() != null) {
                            return BigDecimal.valueOf(jobPosition.getDailyRate())
                                    .multiply(BigDecimal.valueOf(jobPosition.getWorkingDaysPerMonth()))
                                    .multiply(multiplier);
                        }
                    }
                    break;
                case MONTHLY:
                    // For monthly contracts: use override or job position monthly salary
                    BigDecimal monthlySalary = baseSalaryOverride != null ? baseSalaryOverride :
                            BigDecimal.valueOf(jobPosition.getMonthlyBaseSalary() != null ?
                                    jobPosition.getMonthlyBaseSalary() : jobPosition.getBaseSalary());
                    return monthlySalary.multiply(multiplier);
                default:
                    // Fallback to base salary calculation
                    return getBaseSalary().multiply(multiplier);
            }
        }

        // Fallback to base salary if no job position or calculation failed
        return getBaseSalary().multiply(multiplier);
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

    // NEW: Loan-related helper methods

    /**
     * Get all loans for this employee
     * @return List of loans (never null)
     */
    public List<Loan> getLoans() {
        return loans != null ? loans : Collections.emptyList();
    }

    /**
     * Get active loans for this employee
     * @return List of active loans
     */
    public List<Loan> getActiveLoans() {
        return getLoans().stream()
                .filter(loan -> loan.getStatus() == Loan.LoanStatus.ACTIVE)
                .toList();
    }

    /**
     * Get pending loans for this employee
     * @return List of pending loans
     */
    public List<Loan> getPendingLoans() {
        return getLoans().stream()
                .filter(loan -> loan.getStatus() == Loan.LoanStatus.PENDING)
                .toList();
    }

    /**
     * Get total outstanding loan balance for this employee
     * @return Total outstanding balance across all active and pending loans
     */
    public BigDecimal getTotalOutstandingLoanBalance() {
        return getLoans().stream()
                .filter(loan -> loan.getStatus() == Loan.LoanStatus.ACTIVE ||
                        loan.getStatus() == Loan.LoanStatus.PENDING)
                .map(Loan::getRemainingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get total loan amount ever borrowed by this employee
     * @return Total amount borrowed (including completed loans)
     */
    public BigDecimal getTotalLoanAmountBorrowed() {
        return getLoans().stream()
                .filter(loan -> loan.getStatus() != Loan.LoanStatus.REJECTED &&
                        loan.getStatus() != Loan.LoanStatus.CANCELLED)
                .map(Loan::getLoanAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get monthly loan repayment amount (sum of all active loan installments)
     * @return Total monthly repayment amount
     */
    public BigDecimal getMonthlyLoanRepayment() {
        return getActiveLoans().stream()
                .map(Loan::getInstallmentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate net monthly salary after loan deductions
     * @return Net salary after loan repayments
     */
    public BigDecimal getNetMonthlySalaryAfterLoans() {
        return getMonthlySalary().subtract(getMonthlyLoanRepayment());
    }

    /**
     * Check if employee has any active loans
     * @return true if employee has active loans
     */
    public boolean hasActiveLoans() {
        return !getActiveLoans().isEmpty();
    }

    /**
     * Check if employee has any pending loan applications
     * @return true if employee has pending loans
     */
    public boolean hasPendingLoans() {
        return !getPendingLoans().isEmpty();
    }

    /**
     * Get loan utilization ratio (outstanding balance / monthly salary)
     * This helps assess loan risk
     * @return Loan utilization ratio as percentage
     */
    public BigDecimal getLoanUtilizationRatio() {
        BigDecimal monthlySalary = getMonthlySalary();
        if (monthlySalary.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal outstandingBalance = getTotalOutstandingLoanBalance();
        return outstandingBalance.divide(monthlySalary, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    /**
     * Check if employee is eligible for new loan based on outstanding balance
     * @param maxOutstandingLimit Maximum allowed outstanding balance
     * @return true if eligible for new loan
     */
    public boolean isEligibleForNewLoan(BigDecimal maxOutstandingLimit) {
        // Check if employee has pending loans
        if (hasPendingLoans()) {
            return false;
        }

        // Check if outstanding balance is below limit
        return getTotalOutstandingLoanBalance().compareTo(maxOutstandingLimit) < 0;
    }

    /**
     * Get maximum loan amount employee can request
     * @param maxOutstandingLimit Maximum allowed outstanding balance
     * @return Maximum loan amount available
     */
    public BigDecimal getMaxAvailableLoanAmount(BigDecimal maxOutstandingLimit) {
        if (!isEligibleForNewLoan(maxOutstandingLimit)) {
            return BigDecimal.ZERO;
        }

        return maxOutstandingLimit.subtract(getTotalOutstandingLoanBalance());
    }

    /**
     * Get loan summary statistics for this employee
     * @return Map containing loan statistics
     */
    public java.util.Map<String, Object> getLoanSummary() {
        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("totalLoans", getLoans().size());
        summary.put("activeLoans", getActiveLoans().size());
        summary.put("pendingLoans", getPendingLoans().size());
        summary.put("totalBorrowed", getTotalLoanAmountBorrowed());
        summary.put("totalOutstanding", getTotalOutstandingLoanBalance());
        summary.put("monthlyRepayment", getMonthlyLoanRepayment());
        summary.put("netSalary", getNetMonthlySalaryAfterLoans());
        summary.put("utilizationRatio", getLoanUtilizationRatio());
        return summary;
    }

    // Existing equipment/driver methods remain unchanged

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