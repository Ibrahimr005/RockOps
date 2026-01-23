package com.example.backend.services.payroll;

import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.PayrollAttendanceSnapshot;
import com.example.backend.models.payroll.PayrollDeduction;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Core calculation engine for payroll
 * Handles all three contract types: MONTHLY, DAILY, HOURLY
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollCalculationEngine {

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    private final EmployeePayrollRepository employeePayrollRepository;
    private final PayrollRepository payrollRepository;
    private final PayrollLoanService loanService;
    private final EmployeeDeductionService employeeDeductionService;

    /**
     * Main calculation method - delegates to contract-specific calculators
     */
    @Transactional
    public void calculateEmployeePayroll(EmployeePayroll employeePayroll) {
        log.info("Calculating payroll for employee: {} ({})",
                employeePayroll.getEmployeeName(),
                employeePayroll.getContractType());

        // Calculate attendance summary
        calculateAttendanceSummary(employeePayroll);

        // Calculate based on contract type
        switch (employeePayroll.getContractType()) {
            case MONTHLY:
                calculateMonthlyPayroll(employeePayroll);
                break;
            case DAILY:
                calculateDailyPayroll(employeePayroll);
                break;
            case HOURLY:
                calculateHourlyPayroll(employeePayroll);
                break;
        }

        // Calculate net pay
        BigDecimal netPay = employeePayroll.getGrossPay()
                .subtract(employeePayroll.getTotalDeductions());

        // Prevent negative pay
        if (netPay.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Negative pay detected for employee {}: {}. Setting to zero.",
                    employeePayroll.getEmployeeName(), netPay);
            netPay = BigDecimal.ZERO;
        }

        employeePayroll.setNetPay(netPay.setScale(SCALE, ROUNDING_MODE));
        employeePayroll.setCalculatedAt(LocalDateTime.now());

        employeePayrollRepository.save(employeePayroll);

        log.info("Payroll calculation completed: {} - Gross: {}, Deductions: {}, Net: {}",
                employeePayroll.getEmployeeName(),
                employeePayroll.getGrossPay(),
                employeePayroll.getTotalDeductions(),
                employeePayroll.getNetPay());
    }

    /**
     * Calculate MONTHLY employee payroll
     * Formula: Gross = Base Salary + Overtime
     *          Deductions = Absence + Late + Excess Leave + Loans + Other
     */
    private void calculateMonthlyPayroll(EmployeePayroll ep) {
        // Gross Pay = Base Salary + Overtime
        BigDecimal baseSalary = ep.getMonthlyBaseSalary() != null ?
                ep.getMonthlyBaseSalary() : BigDecimal.ZERO;

        BigDecimal overtimePay = calculateOvertimePay(ep);
        BigDecimal grossPay = baseSalary.add(overtimePay);

        ep.setGrossPay(grossPay.setScale(SCALE, ROUNDING_MODE));
        ep.setOvertimePay(overtimePay.setScale(SCALE, ROUNDING_MODE));

        // Calculate deductions
        calculateMonthlyDeductions(ep);

        log.debug("MONTHLY calculation - Base: {}, Overtime: {}, Gross: {}",
                baseSalary, overtimePay, grossPay);
    }

    /**
     * Calculate DAILY employee payroll
     * Formula: Gross = Attended Days × Daily Rate + Overtime
     *          Deductions = Loans + Other (no attendance-based deductions)
     */
    private void calculateDailyPayroll(EmployeePayroll ep) {
        BigDecimal dailyRate = ep.getDailyRate() != null ?
                ep.getDailyRate() : BigDecimal.ZERO;

        Integer attendedDays = ep.getAttendedDays() != null ?
                ep.getAttendedDays() : 0;

        BigDecimal basePay = dailyRate.multiply(BigDecimal.valueOf(attendedDays));
        BigDecimal overtimePay = calculateOvertimePay(ep);
        BigDecimal grossPay = basePay.add(overtimePay);

        ep.setGrossPay(grossPay.setScale(SCALE, ROUNDING_MODE));
        ep.setOvertimePay(overtimePay.setScale(SCALE, ROUNDING_MODE));

        // Calculate deductions (no attendance-based for DAILY)
        calculateNonAttendanceDeductions(ep);

        log.debug("DAILY calculation - Days: {}, Rate: {}, Base: {}, Overtime: {}, Gross: {}",
                attendedDays, dailyRate, basePay, overtimePay, grossPay);
    }

    /**
     * Calculate HOURLY employee payroll
     * Formula: Gross = Worked Hours × Hourly Rate + Overtime
     *          Deductions = Loans + Other (no attendance-based deductions)
     */
    private void calculateHourlyPayroll(EmployeePayroll ep) {
        BigDecimal hourlyRate = ep.getHourlyRate() != null ?
                ep.getHourlyRate() : BigDecimal.ZERO;

        BigDecimal workedHours = ep.getTotalWorkedHours() != null ?
                ep.getTotalWorkedHours() : BigDecimal.ZERO;

        BigDecimal basePay = workedHours.multiply(hourlyRate);
        BigDecimal overtimePay = calculateOvertimePay(ep);
        BigDecimal grossPay = basePay.add(overtimePay);

        ep.setGrossPay(grossPay.setScale(SCALE, ROUNDING_MODE));
        ep.setOvertimePay(overtimePay.setScale(SCALE, ROUNDING_MODE));

        // Calculate deductions (no attendance-based for HOURLY)
        calculateNonAttendanceDeductions(ep);

        log.debug("HOURLY calculation - Hours: {}, Rate: {}, Base: {}, Overtime: {}, Gross: {}",
                workedHours, hourlyRate, basePay, overtimePay, grossPay);
    }

    /**
     * Calculate overtime pay based on contract type
     */
    private BigDecimal calculateOvertimePay(EmployeePayroll ep) {
        if (ep.getOvertimeHours() == null ||
                ep.getOvertimeHours().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal overtimeRate;
        BigDecimal overtimeMultiplier = new BigDecimal("1.5"); // 1.5x for overtime

        switch (ep.getContractType()) {
            case HOURLY:
                // For hourly: overtime rate = hourly rate × 1.5
                overtimeRate = ep.getHourlyRate().multiply(overtimeMultiplier);
                break;

            case MONTHLY:
                // For monthly: calculate hourly equivalent from monthly salary
                // Assuming 160 hours per month (8 hours × 20 working days)
                BigDecimal hourlyEquivalent = ep.getMonthlyBaseSalary()
                        .divide(new BigDecimal("160"), SCALE, ROUNDING_MODE);
                overtimeRate = hourlyEquivalent.multiply(overtimeMultiplier);
                break;

            case DAILY:
                // For daily: calculate hourly from daily rate (assuming 8 hours/day)
                BigDecimal dailyHourly = ep.getDailyRate()
                        .divide(new BigDecimal("8"), SCALE, ROUNDING_MODE);
                overtimeRate = dailyHourly.multiply(overtimeMultiplier);
                break;

            default:
                return BigDecimal.ZERO;
        }

        return ep.getOvertimeHours()
                .multiply(overtimeRate)
                .setScale(SCALE, ROUNDING_MODE);
    }

    /**
     * Calculate deductions for MONTHLY employees
     * Includes: Absence, Late, Excess Leave, Loans, Other
     */
    private void calculateMonthlyDeductions(EmployeePayroll ep) {
        // 1. Absence deduction
        BigDecimal absenceDeduction = calculateAbsenceDeduction(ep);
        ep.setAbsenceDeductionAmount(absenceDeduction);

        // 2. Late deduction (with forgiveness logic)
        BigDecimal lateDeduction = calculateLateDeduction(ep);
        ep.setLateDeductionAmount(lateDeduction);

        // 3. Excess leave deduction
        BigDecimal leaveDeduction = calculateExcessLeaveDeduction(ep);
        ep.setLeaveDeductionAmount(leaveDeduction);

        // 4. Loan deduction
        BigDecimal loanDeduction = calculateLoanDeduction(ep);
        ep.setLoanDeductionAmount(loanDeduction);

        // 5. Other deductions (tax, insurance, etc.)
        BigDecimal otherDeduction = calculateOtherDeductions(ep);
        ep.setOtherDeductionAmount(otherDeduction);

        // Total deductions
        BigDecimal totalDeductions = absenceDeduction
                .add(lateDeduction)
                .add(leaveDeduction)
                .add(loanDeduction)
                .add(otherDeduction);

        ep.setTotalDeductions(totalDeductions.setScale(SCALE, ROUNDING_MODE));

        log.debug("MONTHLY deductions - Absence: {}, Late: {}, Leave: {}, Loan: {}, Other: {}, Total: {}",
                absenceDeduction, lateDeduction, leaveDeduction, loanDeduction, otherDeduction, totalDeductions);
    }

    /**
     * Calculate deductions for DAILY and HOURLY employees
     * Only: Loans + Other (no attendance-based deductions)
     */
    private void calculateNonAttendanceDeductions(EmployeePayroll ep) {
        // Set attendance-based deductions to zero
        ep.setAbsenceDeductionAmount(BigDecimal.ZERO);
        ep.setLateDeductionAmount(BigDecimal.ZERO);
        ep.setLeaveDeductionAmount(BigDecimal.ZERO);

        // Calculate loan deduction
        BigDecimal loanDeduction = calculateLoanDeduction(ep);
        ep.setLoanDeductionAmount(loanDeduction);

        // Calculate other deductions
        BigDecimal otherDeduction = calculateOtherDeductions(ep);
        ep.setOtherDeductionAmount(otherDeduction);

        // Total deductions
        BigDecimal totalDeductions = loanDeduction.add(otherDeduction);
        ep.setTotalDeductions(totalDeductions.setScale(SCALE, ROUNDING_MODE));

        log.debug("Non-attendance deductions - Loan: {}, Other: {}, Total: {}",
                loanDeduction, otherDeduction, totalDeductions);
    }

    /**
     * Calculate absence deduction (MONTHLY only)
     * Formula: Unexcused Absences × Absent Deduction Rate
     */
    private BigDecimal calculateAbsenceDeduction(EmployeePayroll ep) {
        if (ep.getAbsentDeduction() == null ||
                ep.getAbsentDays() == null ||
                ep.getAbsentDays() == 0) {
            return BigDecimal.ZERO;
        }

        // Count only unexcused absences (exclude public holidays)
        long unexcusedAbsences = ep.getAttendanceSnapshots().stream()
                .filter(s -> s.getStatus() == com.example.backend.models.hr.Attendance.AttendanceStatus.ABSENT)
                .filter(s -> !s.getIsPublicHoliday()) // Skip public holidays
                .filter(s -> !s.getIsExcusedAbsence()) // Skip excused absences
                .count();

        BigDecimal deduction = ep.getAbsentDeduction()
                .multiply(BigDecimal.valueOf(unexcusedAbsences))
                .setScale(SCALE, ROUNDING_MODE);

        log.debug("Absence deduction: {} absences × {} = {}",
                unexcusedAbsences, ep.getAbsentDeduction(), deduction);

        return deduction;
    }

    /**
     * Calculate late deduction with forgiveness logic (MONTHLY only)
     * Two-tier forgiveness:
     * 1. Grace period (minutes) - immediate forgiveness
     * 2. Quarterly count - forgive N occurrences per quarter
     */
    private BigDecimal calculateLateDeduction(EmployeePayroll ep) {
        if (ep.getLateDeduction() == null) {
            return BigDecimal.ZERO;
        }

        Integer graceMinutes = ep.getLateForgivenessMinutes() != null ?
                ep.getLateForgivenessMinutes() : 0;
        Integer quarterlyForgiveness = ep.getLateForgivenessCountPerQuarter() != null ?
                ep.getLateForgivenessCountPerQuarter() : 0;

        // Get all late snapshots
        List<PayrollAttendanceSnapshot> lateSnapshots = ep.getAttendanceSnapshots().stream()
                .filter(s -> s.getLateMinutes() != null && s.getLateMinutes() > 0)
                .sorted((a, b) -> a.getAttendanceDate().compareTo(b.getAttendanceDate()))
                .collect(Collectors.toList());

        if (lateSnapshots.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // Get quarterly forgiveness already used in previous payrolls this quarter
        int forgivenessUsed = getForgivenessUsedInQuarter(ep);

        int chargedLateCount = 0;
        int forgivenLateCount = 0;

        for (PayrollAttendanceSnapshot snapshot : lateSnapshots) {
            boolean forgiven = false;

            // Tier 1: Grace period forgiveness
            if (snapshot.getLateMinutes() <= graceMinutes) {
                forgiven = true;
                log.debug("Late arrival on {} forgiven (grace period): {} minutes",
                        snapshot.getAttendanceDate(), snapshot.getLateMinutes());
            }
            // Tier 2: Quarterly forgiveness
            else if (forgivenessUsed + forgivenLateCount < quarterlyForgiveness) {
                forgiven = true;
                forgivenLateCount++;
                log.debug("Late arrival on {} forgiven (quarterly {}/{})",
                        snapshot.getAttendanceDate(),
                        forgivenessUsed + forgivenLateCount,
                        quarterlyForgiveness);
            }
            // No forgiveness - charge
            else {
                chargedLateCount++;
                log.debug("Late arrival on {} charged: {} minutes",
                        snapshot.getAttendanceDate(), snapshot.getLateMinutes());
            }

            snapshot.setIsLateForgiven(forgiven);
        }

        // Update summary counts
        ep.setForgivenLateDays(forgivenLateCount);
        ep.setChargedLateDays(chargedLateCount);

        BigDecimal deduction = ep.getLateDeduction()
                .multiply(BigDecimal.valueOf(chargedLateCount))
                .setScale(SCALE, ROUNDING_MODE);

        log.info("Late deduction summary - Total: {}, Forgiven: {}, Charged: {}, Amount: {}",
                lateSnapshots.size(), forgivenLateCount, chargedLateCount, deduction);

        return deduction;
    }

    /**
     * Get quarterly forgiveness already used in previous payrolls this quarter
     */
    private int getForgivenessUsedInQuarter(EmployeePayroll ep) {
        LocalDate payrollDate = ep.getPayroll().getStartDate();
        int quarter = getCurrentQuarter(payrollDate);
        int year = payrollDate.getYear();

        // Get start and end of current quarter
        LocalDate quarterStart = getQuarterStart(year, quarter);
        LocalDate quarterEnd = getQuarterEnd(year, quarter);

        // Query previous payrolls in same quarter using date range
        List<EmployeePayroll> previousPayrolls = employeePayrollRepository
                .findByEmployeeIdAndDateRange(
                        ep.getEmployeeId(),
                        quarterStart,
                        quarterEnd
                );

        // Sum up forgiven late days from previous payrolls
        int totalForgiven = previousPayrolls.stream()
                .filter(p -> !p.getId().equals(ep.getId())) // Exclude current payroll
                .mapToInt(p -> p.getForgivenLateDays() != null ? p.getForgivenLateDays() : 0)
                .sum();

        log.debug("Quarterly forgiveness used so far: {}", totalForgiven);
        return totalForgiven;
    }

    /**
     * Calculate excess leave deduction (MONTHLY only)
     */
    private BigDecimal calculateExcessLeaveDeduction(EmployeePayroll ep) {
        if (ep.getLeaveDeduction() == null ||
                ep.getExcessLeaveDays() == null ||
                ep.getExcessLeaveDays() == 0) {
            return BigDecimal.ZERO;
        }

        // TODO: Integrate with Leave module to calculate excess leave
        // For now, use the value set in attendance summary

        BigDecimal deduction = ep.getLeaveDeduction()
                .multiply(BigDecimal.valueOf(ep.getExcessLeaveDays()))
                .setScale(SCALE, ROUNDING_MODE);

        log.debug("Excess leave deduction: {} days × {} = {}",
                ep.getExcessLeaveDays(), ep.getLeaveDeduction(), deduction);

        return deduction;
    }

    /**
     * Calculate loan deductions
     */
    private BigDecimal calculateLoanDeduction(EmployeePayroll ep) {
        BigDecimal loanDeduction = loanService.calculateLoanDeductionForPayroll(
                ep.getEmployeeId(),
                ep.getPayroll().getStartDate(),
                ep.getPayroll().getEndDate()
        );

        // Create deduction record
        if (loanDeduction.compareTo(BigDecimal.ZERO) > 0) {
            PayrollDeduction deduction = PayrollDeduction.builder()
                    .employeePayroll(ep)
                    .deductionType(PayrollDeduction.DeductionType.LOAN_REPAYMENT)
                    .deductionAmount(loanDeduction)
                    .description("Loan repayment for period")
                    .build();
            ep.addDeduction(deduction);
        }

        return loanDeduction;
    }

    /**
     * Calculate other deductions (tax, insurance, pension, etc.)
     * Now integrates with the EmployeeDeduction system for configured recurring deductions
     */
    private BigDecimal calculateOtherDeductions(EmployeePayroll ep) {
        BigDecimal total = BigDecimal.ZERO;

        // First, get configured employee deductions from the new system
        List<EmployeeDeductionService.CalculatedDeduction> configuredDeductions =
            employeeDeductionService.calculateDeductionsForPayroll(
                ep.getEmployeeId(),
                ep.getPayroll().getStartDate(),
                ep.getPayroll().getEndDate(),
                ep.getGrossPay(),
                ep.getMonthlyBaseSalary()
            );

        // Track deduction IDs for recording
        List<UUID> appliedDeductionIds = new java.util.ArrayList<>();

        // Apply configured deductions (excluding loan deductions which are handled separately)
        for (EmployeeDeductionService.CalculatedDeduction configured : configuredDeductions) {
            // Skip loan deductions - they are handled in calculateLoanDeduction
            if (configured.getCategory() == com.example.backend.models.payroll.DeductionType.DeductionCategory.LOANS) {
                continue;
            }

            if (configured.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                PayrollDeduction.DeductionType deductionType = mapCategoryToDeductionType(configured.getCategory());

                PayrollDeduction deduction = PayrollDeduction.builder()
                    .employeePayroll(ep)
                    .deductionType(deductionType)
                    .deductionAmount(configured.getAmount())
                    .referenceId(configured.getDeductionId())
                    .description(configured.getName())
                    .calculationDetails("Configured deduction: " + configured.getCalculationMethod())
                    .build();
                ep.addDeduction(deduction);

                total = total.add(configured.getAmount());
                appliedDeductionIds.add(configured.getDeductionId());

                log.debug("Applied configured deduction: {} - {} = {}",
                    configured.getName(), configured.getCategory(), configured.getAmount());
            }
        }

        // Record that deductions were applied (updates tracking in EmployeeDeduction)
        if (!appliedDeductionIds.isEmpty()) {
            employeeDeductionService.recordDeductionsApplied(
                appliedDeductionIds,
                ep.getPayroll().getEndDate()
            );
        }

        // Also sum up any manually added deductions that were already on the employee payroll
        BigDecimal manualDeductions = ep.getDeductions().stream()
            .filter(d -> d.getReferenceId() == null) // Only manual deductions (not from configured system)
            .filter(d -> d.getDeductionType() == PayrollDeduction.DeductionType.TAX ||
                    d.getDeductionType() == PayrollDeduction.DeductionType.INSURANCE ||
                    d.getDeductionType() == PayrollDeduction.DeductionType.PENSION ||
                    d.getDeductionType() == PayrollDeduction.DeductionType.ADVANCE_SALARY ||
                    d.getDeductionType() == PayrollDeduction.DeductionType.OTHER)
            .map(PayrollDeduction::getDeductionAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        total = total.add(manualDeductions);

        log.info("Total other deductions for {}: {} (configured: {}, manual: {})",
            ep.getEmployeeName(), total,
            total.subtract(manualDeductions), manualDeductions);

        return total.setScale(SCALE, ROUNDING_MODE);
    }

    /**
     * Map DeductionType.DeductionCategory to PayrollDeduction.DeductionType
     */
    private PayrollDeduction.DeductionType mapCategoryToDeductionType(
            com.example.backend.models.payroll.DeductionType.DeductionCategory category) {
        return switch (category) {
            case STATUTORY -> PayrollDeduction.DeductionType.TAX;
            case BENEFITS -> PayrollDeduction.DeductionType.INSURANCE;
            case LOANS -> PayrollDeduction.DeductionType.LOAN_REPAYMENT;
            case VOLUNTARY -> PayrollDeduction.DeductionType.OTHER;
            case GARNISHMENT -> PayrollDeduction.DeductionType.OTHER;
            case OTHER -> PayrollDeduction.DeductionType.OTHER;
        };
    }

    /**
     * Calculate attendance summary from snapshots
     */

    // Helper methods for quarter calculations

    private int getCurrentQuarter(LocalDate date) {
        int month = date.getMonthValue();
        return (month - 1) / 3 + 1; // Q1: 1-3, Q2: 4-6, Q3: 7-9, Q4: 10-12
    }

    private LocalDate getQuarterStart(int year, int quarter) {
        int startMonth = (quarter - 1) * 3 + 1;
        return LocalDate.of(year, startMonth, 1);
    }

    private LocalDate getQuarterEnd(int year, int quarter) {
        int endMonth = quarter * 3;
        return LocalDate.of(year, endMonth, 1).plusMonths(1).minusDays(1);
    }

    /**
     * Calculate attendance summary from snapshots
     * HANDLES PAID vs UNPAID PUBLIC HOLIDAYS CORRECTLY
     *
     * CRITICAL BUSINESS RULES:
     * - PAID public holidays: Count as working days AND attended days (employee gets paid)
     * - UNPAID public holidays: Count as OFF days (not working days, no payment)
     * - For MONTHLY employees: Working days exclude UNPAID holidays
     */
    private void calculateAttendanceSummary(EmployeePayroll ep) {
        List<PayrollAttendanceSnapshot> snapshots = ep.getAttendanceSnapshots();

        if (snapshots.isEmpty()) {
            log.warn("No attendance snapshots for employee payroll: {}", ep.getId());
            return;
        }

        int totalWorkingDays = 0;
        int attendedDays = 0;
        int absentDays = 0;
        int lateDays = 0;
        int paidHolidayCount = 0;
        int unpaidHolidayCount = 0;
        BigDecimal totalWorkedHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;

        for (PayrollAttendanceSnapshot snapshot : snapshots) {

            // Check if this is a paid or unpaid holiday
            boolean isPaidHoliday = snapshot.isPaidPublicHoliday();
            boolean isUnpaidHoliday = snapshot.isUnpaidPublicHoliday();

            // ⭐ COUNT WORKING DAYS
            if (ep.getContractType() == JobPosition.ContractType.MONTHLY) {
                // For MONTHLY employees:
                // - Include PAID holidays as working days
                // - Exclude UNPAID holidays from working days
                // - Exclude weekends

                if (isPaidHoliday) {
                    // PAID holiday counts as working day
                    totalWorkingDays++;
                    paidHolidayCount++;

                } else if (!isUnpaidHoliday &&
                        snapshot.getDayType() == com.example.backend.models.hr.Attendance.DayType.WORKING_DAY) {
                    // Regular working day (not weekend, not unpaid holiday)
                    totalWorkingDays++;

                } else if (isUnpaidHoliday) {
                    // UNPAID holiday - don't count as working day
                    unpaidHolidayCount++;
                }

            } else {
                // For DAILY/HOURLY employees: count all days they actually worked
                if (snapshot.getStatus() == com.example.backend.models.hr.Attendance.AttendanceStatus.PRESENT ||
                        snapshot.getStatus() == com.example.backend.models.hr.Attendance.AttendanceStatus.LATE ||
                        snapshot.getStatus() == com.example.backend.models.hr.Attendance.AttendanceStatus.HALF_DAY) {
                    totalWorkingDays++;
                }
            }

            // ⭐ COUNT ATTENDANCE
            if (snapshot.getStatus() != null) {
                switch (snapshot.getStatus()) {
                    case PRESENT:
                    case LATE:
                    case HALF_DAY:
                    case EARLY_OUT:
                        attendedDays++;
                        break;

                    case ABSENT:
                        // Only count as absent if:
                        // - Not a PAID holiday (paid holidays count as attended)
                        // - Not an UNPAID holiday (unpaid holidays are OFF, not absent)
                        if (!isPaidHoliday && !isUnpaidHoliday) {
                            absentDays++;
                        }
                        break;

                    case OFF:
                        // OFF days don't count toward attendance
                        break;
                }
            }

            // ⭐ SPECIAL CASE: PAID HOLIDAYS
            // Even though employee didn't work, count as attended day for payroll
            if (isPaidHoliday) {
                // If not already counted (due to status), add to attended days
                if (snapshot.getStatus() != com.example.backend.models.hr.Attendance.AttendanceStatus.PRESENT &&
                        snapshot.getStatus() != com.example.backend.models.hr.Attendance.AttendanceStatus.LATE &&
                        snapshot.getStatus() != com.example.backend.models.hr.Attendance.AttendanceStatus.HALF_DAY) {
                    attendedDays++;
                }


            }

            // Count late days
            if (snapshot.getLateMinutes() != null && snapshot.getLateMinutes() > 0) {
                lateDays++;
            }

            // Sum hours
            if (snapshot.getWorkedHours() != null) {
                totalWorkedHours = totalWorkedHours.add(snapshot.getWorkedHours());
            }
            if (snapshot.getOvertimeHours() != null) {
                overtimeHours = overtimeHours.add(snapshot.getOvertimeHours());
            }
        }

        ep.setTotalWorkingDays(totalWorkingDays);
        ep.setAttendedDays(attendedDays);
        ep.setAbsentDays(absentDays);
        ep.setLateDays(lateDays);
        ep.setTotalWorkedHours(totalWorkedHours.setScale(2, RoundingMode.HALF_UP));
        ep.setOvertimeHours(overtimeHours.setScale(2, RoundingMode.HALF_UP));

        log.info("Attendance summary for {}: Working={}, Attended={}, Absent={}, Late={}, " +
                        "PaidHolidays={}, UnpaidHolidays={}, Hours={}, OT={}",
                ep.getEmployeeName(), totalWorkingDays, attendedDays, absentDays, lateDays,
                paidHolidayCount, unpaidHolidayCount, totalWorkedHours, overtimeHours);
    }
}