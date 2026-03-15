package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.DeductionReviewSummaryDTO;
import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollDeduction;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeductionReviewServiceTest {

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private PayrollCalculationEngine calculationEngine;

    @Mock
    private EmployeeDeductionService employeeDeductionService;

    @Mock
    private PayrollLoanService loanService;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private DeductionReviewService deductionReviewService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
    }

    private EmployeePayroll buildEmployeePayroll(String name, BigDecimal gross, BigDecimal totalDeductions) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName(name);
        ep.setGrossPay(gross);
        ep.setTotalDeductions(totalDeductions);
        ep.setNetPay(gross.subtract(totalDeductions));
        ep.setAbsenceDeductionAmount(BigDecimal.ZERO);
        ep.setLateDeductionAmount(BigDecimal.ZERO);
        ep.setLeaveDeductionAmount(BigDecimal.ZERO);
        ep.setLoanDeductionAmount(BigDecimal.ZERO);
        ep.setOtherDeductionAmount(BigDecimal.ZERO);
        ep.setDeductions(new ArrayList<>());
        ep.setPayroll(payroll);
        return ep;
    }

    // ==================== processDeductionReview ====================

    @Test
    void processDeductionReview_noEmployees_shouldReturnSuccessWithZeros() throws Exception {
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(0, result.getTotalEmployees());
        assertEquals(BigDecimal.ZERO.setScale(2), result.getTotalDeductionAmount());
        assertTrue(result.getIssues().isEmpty());
    }

    @Test
    void processDeductionReview_singleEmployeeNoDeductions_shouldSucceed() throws Exception {
        EmployeePayroll ep = buildEmployeePayroll("Alice", new BigDecimal("5000"), BigDecimal.ZERO);
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertEquals("SUCCESS", result.getStatus());
        assertEquals(1, result.getTotalEmployees());
        assertEquals(0, result.getEmployeesWithDeductions());
        verify(calculationEngine).calculateEmployeePayroll(ep);
        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void processDeductionReview_employeeWithDeductions_shouldCountEmployeesWithDeductions() throws Exception {
        EmployeePayroll ep = buildEmployeePayroll("Bob", new BigDecimal("6000"), new BigDecimal("1000"));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertEquals(1, result.getEmployeesWithDeductions());
        assertEquals(new BigDecimal("1000.00"), result.getTotalDeductionAmount());
    }

    @Test
    void processDeductionReview_loanDeductionAbove1000_shouldAddInfoIssue() throws Exception {
        EmployeePayroll ep = buildEmployeePayroll("Charlie", new BigDecimal("8000"), new BigDecimal("1500"));
        ep.setLoanDeductionAmount(new BigDecimal("1500"));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId())).thenReturn(List.of(UUID.randomUUID()));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertFalse(result.getIssues().isEmpty());
        assertTrue(result.getIssues().stream().anyMatch(i -> "INFO".equals(i.getSeverity())));
    }

    @Test
    void processDeductionReview_deductionsExceed50PercentGross_shouldAddWarningIssue() throws Exception {
        EmployeePayroll ep = buildEmployeePayroll("Dave", new BigDecimal("2000"), new BigDecimal("1200"));
        ep.setNetPay(new BigDecimal("800"));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertTrue(result.getIssues().stream().anyMatch(i -> "WARNING".equals(i.getSeverity())));
    }

    @Test
    void processDeductionReview_negativeNetPay_shouldAddErrorIssue() throws Exception {
        EmployeePayroll ep = buildEmployeePayroll("Eve", new BigDecimal("1000"), new BigDecimal("500"));
        ep.setNetPay(new BigDecimal("-100"));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertTrue(result.getIssues().stream().anyMatch(i -> "ERROR".equals(i.getSeverity())));
    }

    @Test
    void processDeductionReview_calculationEngineThrows_shouldAddErrorIssueAndContinue() throws Exception {
        EmployeePayroll ep1 = buildEmployeePayroll("Fail", new BigDecimal("5000"), BigDecimal.ZERO);
        EmployeePayroll ep2 = buildEmployeePayroll("OK", new BigDecimal("4000"), BigDecimal.ZERO);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep1, ep2));
        doThrow(new RuntimeException("Calc error")).when(calculationEngine).calculateEmployeePayroll(ep1);
        when(loanRepository.findActiveEmployeeLoanIds(ep2.getEmployeeId())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertEquals(2, result.getTotalEmployees());
        assertTrue(result.getIssues().stream().anyMatch(i -> "ERROR".equals(i.getSeverity())));
        assertEquals("SUCCESS_WITH_ERRORS", result.getStatus());
    }

    @Test
    void processDeductionReview_marksDeductionProcessed() throws Exception {
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        deductionReviewService.processDeductionReview(payroll);

        assertTrue(payroll.getDeductionProcessed());
        assertNotNull(payroll.getDeductionSummary());
    }

    @Test
    void processDeductionReview_aggregatesLoanCounts() throws Exception {
        UUID loanId1 = UUID.randomUUID();
        UUID loanId2 = UUID.randomUUID();

        EmployeePayroll ep1 = buildEmployeePayroll("E1", new BigDecimal("5000"), new BigDecimal("500"));
        ep1.setLoanDeductionAmount(new BigDecimal("500"));

        EmployeePayroll ep2 = buildEmployeePayroll("E2", new BigDecimal("5000"), new BigDecimal("300"));
        ep2.setLoanDeductionAmount(new BigDecimal("300"));

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep1, ep2));
        when(loanRepository.findActiveEmployeeLoanIds(ep1.getEmployeeId())).thenReturn(List.of(loanId1));
        when(loanRepository.findActiveEmployeeLoanIds(ep2.getEmployeeId())).thenReturn(List.of(loanId2));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        DeductionReviewSummaryDTO result = deductionReviewService.processDeductionReview(payroll);

        assertEquals(2, result.getActiveLoansCount());
        assertEquals(2, result.getLoanDeductionsApplied());
    }

    // ==================== getEmployeeDeductionsForPeriod ====================

    @Test
    void getEmployeeDeductionsForPeriod_delegatesToEmployeeDeductionService() {
        UUID employeeId = UUID.randomUUID();
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        List<EmployeeDeductionDTO> expected = List.of(mock(EmployeeDeductionDTO.class));

        when(employeeDeductionService.getDeductionsForPayrollPeriod(employeeId, start, end))
                .thenReturn(expected);

        List<EmployeeDeductionDTO> result =
                deductionReviewService.getEmployeeDeductionsForPeriod(employeeId, start, end);

        assertEquals(expected, result);
        verify(employeeDeductionService).getDeductionsForPayrollPeriod(employeeId, start, end);
    }

    // ==================== getPayrollDeductionSummaries ====================

    @Test
    void getPayrollDeductionSummaries_filtersByPositiveDeductions() {
        EmployeePayroll withDeductions = buildEmployeePayroll("Has", new BigDecimal("5000"), new BigDecimal("500"));
        EmployeePayroll noDeductions = buildEmployeePayroll("None", new BigDecimal("5000"), BigDecimal.ZERO);

        when(employeePayrollRepository.findByPayrollId(payrollId))
                .thenReturn(List.of(withDeductions, noDeductions));

        List<DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO> result =
                deductionReviewService.getPayrollDeductionSummaries(payrollId);

        assertEquals(1, result.size());
        assertEquals("Has", result.get(0).getEmployeeName());
    }

    @Test
    void getPayrollDeductionSummaries_sortsByTotalDeductionsDescending() {
        EmployeePayroll ep1 = buildEmployeePayroll("Small", new BigDecimal("5000"), new BigDecimal("200"));
        EmployeePayroll ep2 = buildEmployeePayroll("Large", new BigDecimal("8000"), new BigDecimal("1000"));

        when(employeePayrollRepository.findByPayrollId(payrollId))
                .thenReturn(List.of(ep1, ep2));

        List<DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO> result =
                deductionReviewService.getPayrollDeductionSummaries(payrollId);

        assertEquals(2, result.size());
        assertEquals("Large", result.get(0).getEmployeeName());
    }

    @Test
    void getPayrollDeductionSummaries_emptyPayroll_returnsEmptyList() {
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        List<DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO> result =
                deductionReviewService.getPayrollDeductionSummaries(payrollId);

        assertTrue(result.isEmpty());
    }

    // ==================== getLoanDeductionsForPayroll ====================

    @Test
    void getLoanDeductionsForPayroll_noLoanDeductions_returnsEmptyList() {
        EmployeePayroll ep = buildEmployeePayroll("Alice", new BigDecimal("5000"), BigDecimal.ZERO);
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));

        List<java.util.Map<String, Object>> result =
                deductionReviewService.getLoanDeductionsForPayroll(payrollId);

        assertTrue(result.isEmpty());
    }

    @Test
    void getLoanDeductionsForPayroll_withLoanDeductions_returnsRecords() {
        EmployeePayroll ep = buildEmployeePayroll("Bob", new BigDecimal("6000"), new BigDecimal("500"));
        ep.setLoanDeductionAmount(new BigDecimal("500"));

        PayrollDeduction loanDeduction = new PayrollDeduction();
        loanDeduction.setDeductionType(PayrollDeduction.DeductionType.LOAN_REPAYMENT);
        loanDeduction.setDeductionAmount(new BigDecimal("500"));
        loanDeduction.setDescription("Loan repayment");
        loanDeduction.setReferenceId(UUID.randomUUID());
        ep.setDeductions(List.of(loanDeduction));

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));

        List<java.util.Map<String, Object>> result =
                deductionReviewService.getLoanDeductionsForPayroll(payrollId);

        assertEquals(1, result.size());
        assertEquals(ep.getEmployeeId(), result.get(0).get("employeeId"));
        assertEquals("Bob", result.get(0).get("employeeName"));
    }
}