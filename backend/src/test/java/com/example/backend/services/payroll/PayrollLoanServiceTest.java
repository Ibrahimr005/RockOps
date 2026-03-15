package com.example.backend.services.payroll;

import com.example.backend.models.payroll.Loan;
import com.example.backend.repositories.payroll.LoanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PayrollLoanServiceTest {

    @Mock
    private LoanRepository loanRepository;

    @InjectMocks
    private PayrollLoanService payrollLoanService;

    private UUID employeeId;
    private LocalDate periodStart;
    private LocalDate periodEnd;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        periodStart = LocalDate.of(2026, 2, 1);
        periodEnd = LocalDate.of(2026, 2, 28);
    }

    private Loan buildApprovedLoan(BigDecimal loanAmount, BigDecimal monthlyInstallment,
                                    BigDecimal remainingBalance, LocalDate disbursementDate) {
        return Loan.builder()
                .id(UUID.randomUUID())
                .loanNumber("LOAN-2026-000001")
                .loanAmount(loanAmount)
                .monthlyInstallment(monthlyInstallment)
                .remainingBalance(remainingBalance)
                .disbursementDate(disbursementDate)
                .installmentMonths(12)
                .status(Loan.LoanStatus.APPROVED)
                .createdBy("admin")
                .createdAt(java.time.LocalDateTime.now())
                .build();
    }

    // ==================== calculateLoanDeductionForPayroll ====================

    @Test
    void calculateLoanDeductionForPayroll_noActiveLoans_returnsZero() {
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(Collections.emptyList());

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    @Test
    void calculateLoanDeductionForPayroll_loanWithMonthlyInstallment_returnsThatAmount() {
        Loan loan = buildApprovedLoan(
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("9500.00"),
                LocalDate.of(2026, 1, 15));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(new BigDecimal("500.00")));
    }

    @Test
    void calculateLoanDeductionForPayroll_loanNotYetStarted_returnsZero() {
        // Disbursement date is after period end
        Loan loan = buildApprovedLoan(
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("10000.00"),
                LocalDate.of(2026, 3, 15));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    @Test
    void calculateLoanDeductionForPayroll_loanWithZeroRemainingBalance_returnsZero() {
        Loan loan = buildApprovedLoan(
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                BigDecimal.ZERO,
                LocalDate.of(2026, 1, 1));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    @Test
    void calculateLoanDeductionForPayroll_loanWithNullDisbursementDate_returnsZero() {
        Loan loan = buildApprovedLoan(
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("10000.00"),
                null);
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    @Test
    void calculateLoanDeductionForPayroll_multipleLoans_sumsAllInstallments() {
        Loan loan1 = buildApprovedLoan(
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("9500.00"),
                LocalDate.of(2026, 1, 1));
        Loan loan2 = buildApprovedLoan(
                new BigDecimal("6000.00"),
                new BigDecimal("300.00"),
                new BigDecimal("5700.00"),
                LocalDate.of(2026, 1, 1));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan1, loan2));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(new BigDecimal("800.00")));
    }

    @Test
    void calculateLoanDeductionForPayroll_loanWithNullMonthlyInstallmentButHasAmountAndPeriod_calculatesFromFormula() {
        // When monthlyInstallment is null, falls back to loanAmount / repaymentPeriod
        Loan loan = Loan.builder()
                .id(UUID.randomUUID())
                .loanNumber("LOAN-2026-000002")
                .loanAmount(new BigDecimal("1200.00"))
                .monthlyInstallment(null)
                .installmentMonths(12)
                .remainingBalance(new BigDecimal("1200.00"))
                .disbursementDate(LocalDate.of(2026, 1, 1))
                .status(Loan.LoanStatus.APPROVED)
                .createdBy("admin")
                .createdAt(java.time.LocalDateTime.now())
                .build();
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        // 1200 / 12 = 100.00
        assertEquals(0, result.compareTo(new BigDecimal("100.00")));
    }

    @Test
    void calculateLoanDeductionForPayroll_negativeRemainingBalance_treatedAsZeroRemaining() {
        // Negative remaining balance means loan is fully paid
        Loan loan = buildApprovedLoan(
                new BigDecimal("1000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("-10.00"),
                LocalDate.of(2026, 1, 1));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.calculateLoanDeductionForPayroll(
                employeeId, periodStart, periodEnd);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    // ==================== getActiveLoans ====================

    @Test
    void getActiveLoans_delegatesToRepository() {
        Loan loan = buildApprovedLoan(new BigDecimal("5000.00"), new BigDecimal("250.00"),
                new BigDecimal("5000.00"), LocalDate.of(2026, 1, 1));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        List<Loan> result = payrollLoanService.getActiveLoans(employeeId);

        assertEquals(1, result.size());
        verify(loanRepository).findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED);
    }

    @Test
    void getActiveLoans_noLoans_returnsEmptyList() {
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(Collections.emptyList());

        List<Loan> result = payrollLoanService.getActiveLoans(employeeId);

        assertTrue(result.isEmpty());
    }

    // ==================== getTotalRemainingBalance ====================

    @Test
    void getTotalRemainingBalance_noLoans_returnsZero() {
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(Collections.emptyList());

        BigDecimal result = payrollLoanService.getTotalRemainingBalance(employeeId);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }

    @Test
    void getTotalRemainingBalance_loansWithBalances_sumsCorrectly() {
        Loan loan1 = buildApprovedLoan(new BigDecimal("10000.00"), new BigDecimal("500.00"),
                new BigDecimal("7500.00"), LocalDate.of(2025, 6, 1));
        Loan loan2 = buildApprovedLoan(new BigDecimal("3000.00"), new BigDecimal("150.00"),
                new BigDecimal("2100.00"), LocalDate.of(2025, 9, 1));
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan1, loan2));

        BigDecimal result = payrollLoanService.getTotalRemainingBalance(employeeId);

        assertEquals(0, result.compareTo(new BigDecimal("9600.00")));
    }

    @Test
    void getTotalRemainingBalance_loanWithNullRemainingBalance_treatedAsZero() {
        Loan loan = Loan.builder()
                .id(UUID.randomUUID())
                .loanNumber("LOAN-2026-000003")
                .loanAmount(new BigDecimal("5000.00"))
                .monthlyInstallment(new BigDecimal("250.00"))
                .installmentMonths(20)
                .remainingBalance(null)
                .disbursementDate(LocalDate.of(2026, 1, 1))
                .status(Loan.LoanStatus.APPROVED)
                .createdBy("admin")
                .createdAt(java.time.LocalDateTime.now())
                .build();
        when(loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED))
                .thenReturn(List.of(loan));

        BigDecimal result = payrollLoanService.getTotalRemainingBalance(employeeId);

        assertEquals(0, result.compareTo(BigDecimal.ZERO));
    }
}