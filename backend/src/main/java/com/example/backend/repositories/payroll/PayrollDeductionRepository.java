//package com.example.backend.repositories.payroll;
//
//import com.example.backend.models.payroll.PayrollDeduction;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//import org.springframework.stereotype.Repository;
//
//import java.math.BigDecimal;
//import java.util.List;
//import java.util.UUID;
//
//@Repository
//public interface PayrollDeductionRepository extends JpaRepository<PayrollDeduction, UUID> {
//
//    /**
//     * Find all deductions for an employee payroll
//     */
//    List<PayrollDeduction> findByEmployeePayrollId(UUID employeePayrollId);
//
//    /**
//     * Find deductions by type for an employee payroll
//     */
//    List<PayrollDeduction> findByEmployeePayrollIdAndDeductionType(
//        UUID employeePayrollId,
//        PayrollDeduction.DeductionType deductionType
//    );
//
//    /**
//     * Find deductions by type across all payrolls
//     */
//    List<PayrollDeduction> findByDeductionType(PayrollDeduction.DeductionType deductionType);
//
//    /**
//     * Find deduction by reference ID (e.g., loan_id)
//     */
//    List<PayrollDeduction> findByReferenceId(UUID referenceId);
//
//    /**
//     * Sum total deductions for an employee payroll
//     */
//    @Query("SELECT COALESCE(SUM(pd.deductionAmount), 0) FROM PayrollDeduction pd " +
//           "WHERE pd.employeePayroll.id = :employeePayrollId")
//    BigDecimal sumDeductionsByEmployeePayroll(@Param("employeePayrollId") UUID employeePayrollId);
//
//    /**
//     * Sum deductions by type for an employee payroll
//     */
//    @Query("SELECT COALESCE(SUM(pd.deductionAmount), 0) FROM PayrollDeduction pd " +
//           "WHERE pd.employeePayroll.id = :employeePayrollId " +
//           "AND pd.deductionType = :deductionType")
//    BigDecimal sumDeductionsByTypeAndEmployeePayroll(
//        @Param("employeePayrollId") UUID employeePayrollId,
//        @Param("deductionType") PayrollDeduction.DeductionType deductionType
//    );
//
//    /**
//     * Count deductions for an employee payroll
//     */
//    long countByEmployeePayrollId(UUID employeePayrollId);
//
//    /**
//     * Delete deductions by reference ID (for loan cancellation scenarios)
//     */
//    void deleteByReferenceId(UUID referenceId);
//
//    /**
//     * Find loan deductions for an employee across payrolls
//     */
//    @Query("SELECT pd FROM PayrollDeduction pd " +
//           "JOIN pd.employeePayroll ep " +
//           "WHERE ep.employeeId = :employeeId " +
//           "AND pd.deductionType = 'LOAN_REPAYMENT' " +
//           "ORDER BY ep.payroll.year DESC, ep.payroll.month DESC")
//    List<PayrollDeduction> findLoanDeductionsByEmployee(@Param("employeeId") UUID employeeId);
//}