package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.EmployeePayroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeePayrollRepository extends JpaRepository<EmployeePayroll, UUID> {
    
    /**
     * Find all employee payrolls for a specific payroll
     */
    List<EmployeePayroll> findByPayrollId(UUID payrollId);
    
    /**
     * Find employee payroll by payroll and employee
     */
    Optional<EmployeePayroll> findByPayrollIdAndEmployeeId(UUID payrollId, UUID employeeId);
    
    /**
     * Find all employee payrolls for a specific employee (ordered by most recent end date)
     */
    List<EmployeePayroll> findByEmployeeIdOrderByPayroll_EndDateDesc(UUID employeeId);
    
    /**
     * Find uncalculated employee payrolls (for validation before locking)
     */
    List<EmployeePayroll> findByPayrollIdAndCalculatedAtIsNull(UUID payrollId);
    
    /**
     * Count uncalculated employee payrolls
     */
    long countByPayrollIdAndCalculatedAtIsNull(UUID payrollId);
    
    /**
     * Find employee payrolls by date range (for quarterly forgiveness tracking)
     */
    @Query("SELECT ep FROM EmployeePayroll ep " +
           "JOIN ep.payroll p " +
           "WHERE ep.employeeId = :employeeId " +
           "AND p.endDate >= :startDate " +
           "AND p.startDate <= :endDate " +
           "ORDER BY p.startDate ASC")
    List<EmployeePayroll> findByEmployeeIdAndDateRange(
        @Param("employeeId") UUID employeeId,
        @Param("startDate") java.time.LocalDate startDate,
        @Param("endDate") java.time.LocalDate endDate
    );
    
    /**
     * Get employee payrolls with totals for a payroll period
     */
    @Query("SELECT ep FROM EmployeePayroll ep " +
           "WHERE ep.payroll.id = :payrollId " +
           "AND ep.calculatedAt IS NOT NULL " +
           "ORDER BY ep.employeeName ASC")
    List<EmployeePayroll> findCalculatedByPayrollId(@Param("payrollId") UUID payrollId);
    
    /**
     * Find employee payrolls by contract type for a payroll
     */
    @Query("SELECT ep FROM EmployeePayroll ep " +
           "WHERE ep.payroll.id = :payrollId " +
           "AND ep.contractType = :contractType")
    List<EmployeePayroll> findByPayrollIdAndContractType(
        @Param("payrollId") UUID payrollId,
        @Param("contractType") com.example.backend.models.hr.JobPosition.ContractType contractType
    );
    
    /**
     * Check if employee payroll exists
     */
    boolean existsByPayrollIdAndEmployeeId(UUID payrollId, UUID employeeId);
    
    /**
     * Count employee payrolls in a payroll
     */
    long countByPayrollId(UUID payrollId);
}