// PayslipRepository.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, UUID> {

    // Find payslips by employee
    List<Payslip> findByEmployeeIdOrderByPayDateDesc(UUID employeeId);

    // Find payslips by period
    List<Payslip> findByPayPeriodStartBetweenOrderByPayDateDesc(LocalDate startDate, LocalDate endDate);

    // Find payslips by pay date
    List<Payslip> findByPayDateOrderByEmployeeFirstNameAsc(LocalDate payDate);

    // Find payslips by status
    List<Payslip> findByStatusOrderByPayDateDesc(Payslip.PayslipStatus status);

    // Find specific payslip for employee and period
    Optional<Payslip> findByEmployeeIdAndPayPeriodStartAndPayPeriodEnd(
            UUID employeeId, LocalDate payPeriodStart, LocalDate payPeriodEnd);

    // Check if payslip exists for employee and period
    boolean existsByEmployeeIdAndPayPeriodStartAndPayPeriodEnd(
            UUID employeeId, LocalDate payPeriodStart, LocalDate payPeriodEnd);

    // Get payslips by department
    @Query("SELECT p FROM Payslip p JOIN p.employee e JOIN e.jobPosition jp JOIN jp.department d " +
            "WHERE d.name = :departmentName AND p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate " +
            "ORDER BY p.payDate DESC")
    List<Payslip> findByDepartmentAndPeriod(@Param("departmentName") String departmentName,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    // Get payroll summary for reporting
    @Query("SELECT SUM(p.grossSalary) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalGrossPayrollByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(p.netPay) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalNetPayrollByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(p.totalDeductions) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalDeductionsByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Find payslips by employee with pagination
     */
    Page<Payslip> findByEmployeeId(UUID employeeId, Pageable pageable);

    /**
     * Find payslips by period with pagination
     */
    Page<Payslip> findByPayPeriodStartBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    /**
     * Find payslips by status with pagination
     */
    Page<Payslip> findByStatus(Payslip.PayslipStatus status, Pageable pageable);

    /**
     * Find payslips by status (list)
     */
    List<Payslip> findByStatus(Payslip.PayslipStatus status);

}
