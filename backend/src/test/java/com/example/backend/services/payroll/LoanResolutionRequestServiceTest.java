package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanResolutionRequestDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.LoanResolutionRequest;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.repositories.payroll.LoanResolutionRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanResolutionRequestServiceTest {

    @Mock
    private LoanResolutionRequestRepository resolutionRepository;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeDeductionService employeeDeductionService;

    @InjectMocks
    private LoanResolutionRequestService loanResolutionRequestService;

    private UUID loanId;
    private UUID requestId;
    private UUID siteId;
    private UUID employeeId;
    private Site site;
    private Employee employee;
    private Loan activeLoan;
    private LoanResolutionRequest resolutionRequest;

    @BeforeEach
    void setUp() {
        loanId = UUID.randomUUID();
        requestId = UUID.randomUUID();
        siteId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        site = new Site();
        site.setId(siteId);

        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("Ali");
        employee.setLastName("Hassan");
        employee.setSite(site);

        activeLoan = Loan.builder()
                .id(loanId)
                .loanNumber("LOAN-2026-000001")
                .employee(employee)
                .loanAmount(BigDecimal.valueOf(10000))
                .remainingBalance(BigDecimal.valueOf(6000))
                .installmentMonths(12)
                .monthlyInstallment(BigDecimal.valueOf(833))
                .interestRate(BigDecimal.ZERO)
                .loanEffectiveDate(LocalDate.now().minusMonths(6))
                .loanStartDate(LocalDate.now().minusMonths(6))
                .status(Loan.LoanStatus.ACTIVE)
                .financeStatus(Loan.FinanceApprovalStatus.APPROVED)
                .purpose("Car purchase")
                .createdBy("hr")
                .build();

        resolutionRequest = LoanResolutionRequest.builder()
                .id(requestId)
                .loan(activeLoan)
                .employee(employee)
                .site(site)
                .reason("Early settlement")
                .remainingBalance(BigDecimal.valueOf(6000))
                .status(LoanResolutionRequest.ResolutionStatus.PENDING_HR)
                .createdBy("hr_manager")
                .build();
    }

    // ---------------------------------------------------------------
    // createRequest
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("createRequest")
    class CreateRequest {

        @Test
        @DisplayName("throws ResourceNotFoundException when loan not found")
        void throwsWhenLoanNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.createRequest(loanId, "Early settlement", "hr_manager"));
        }

        @Test
        @DisplayName("throws IllegalStateException when loan is in wrong status (e.g., COMPLETED)")
        void throwsWhenLoanInWrongStatus() {
            Loan completedLoan = Loan.builder()
                    .id(loanId)
                    .loanNumber("LOAN-2026-000001")
                    .employee(employee)
                    .loanAmount(BigDecimal.valueOf(10000))
                    .remainingBalance(BigDecimal.ZERO)
                    .installmentMonths(12)
                    .monthlyInstallment(BigDecimal.valueOf(833))
                    .interestRate(BigDecimal.ZERO)
                    .loanEffectiveDate(LocalDate.now().minusMonths(12))
                    .status(Loan.LoanStatus.COMPLETED)
                    .createdBy("hr")
                    .build();

            when(loanRepository.findById(loanId)).thenReturn(Optional.of(completedLoan));

            assertThrows(IllegalStateException.class,
                    () -> loanResolutionRequestService.createRequest(loanId, "reason", "hr_manager"));
        }

        @Test
        @DisplayName("throws IllegalStateException when pending resolution already exists")
        void throwsWhenPendingResolutionExists() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(activeLoan));
            when(resolutionRepository.existsPendingForLoan(loanId)).thenReturn(true);

            assertThrows(IllegalStateException.class,
                    () -> loanResolutionRequestService.createRequest(loanId, "reason", "hr_manager"));
        }

        @Test
        @DisplayName("creates resolution request with PENDING_HR status for ACTIVE loan")
        void createsRequestForActiveLoan() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(activeLoan));
            when(resolutionRepository.existsPendingForLoan(loanId)).thenReturn(false);
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(resolutionRequest);

            loanResolutionRequestService.createRequest(loanId, "Early settlement", "hr_manager");

            ArgumentCaptor<LoanResolutionRequest> captor =
                    ArgumentCaptor.forClass(LoanResolutionRequest.class);
            verify(resolutionRepository).save(captor.capture());

            LoanResolutionRequest saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(LoanResolutionRequest.ResolutionStatus.PENDING_HR);
            assertThat(saved.getLoan()).isEqualTo(activeLoan);
            assertThat(saved.getEmployee()).isEqualTo(employee);
            assertThat(saved.getSite()).isEqualTo(site);
            assertThat(saved.getReason()).isEqualTo("Early settlement");
            assertThat(saved.getRemainingBalance()).isEqualByComparingTo(BigDecimal.valueOf(6000));
            assertThat(saved.getCreatedBy()).isEqualTo("hr_manager");
        }

        @Test
        @DisplayName("creates resolution request for DISBURSED loan")
        void createsRequestForDisbursedLoan() {
            Loan disbursedLoan = Loan.builder()
                    .id(loanId)
                    .loanNumber("LOAN-2026-000002")
                    .employee(employee)
                    .loanAmount(BigDecimal.valueOf(5000))
                    .remainingBalance(BigDecimal.valueOf(5000))
                    .installmentMonths(6)
                    .monthlyInstallment(BigDecimal.valueOf(833))
                    .interestRate(BigDecimal.ZERO)
                    .loanEffectiveDate(LocalDate.now().minusDays(10))
                    .status(Loan.LoanStatus.DISBURSED)
                    .createdBy("hr")
                    .build();

            when(loanRepository.findById(loanId)).thenReturn(Optional.of(disbursedLoan));
            when(resolutionRepository.existsPendingForLoan(loanId)).thenReturn(false);
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(resolutionRequest);

            loanResolutionRequestService.createRequest(loanId, "reason", "hr_manager");

            verify(resolutionRepository).save(any(LoanResolutionRequest.class));
        }
    }

    // ---------------------------------------------------------------
    // getByStatus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getByStatus")
    class GetByStatus {

        @Test
        @DisplayName("delegates to resolutionRepository.findByStatus")
        void delegatesCorrectly() {
            when(resolutionRepository.findByStatus(LoanResolutionRequest.ResolutionStatus.PENDING_HR))
                    .thenReturn(List.of(resolutionRequest));

            List<LoanResolutionRequestDTO> result =
                    loanResolutionRequestService.getByStatus(LoanResolutionRequest.ResolutionStatus.PENDING_HR);

            assertThat(result).hasSize(1);
            verify(resolutionRepository).findByStatus(LoanResolutionRequest.ResolutionStatus.PENDING_HR);
        }
    }

    // ---------------------------------------------------------------
    // getByStatusAndSite
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getByStatusAndSite")
    class GetByStatusAndSite {

        @Test
        @DisplayName("delegates to findByStatusAndSiteId")
        void delegatesCorrectly() {
            when(resolutionRepository.findByStatusAndSiteId(
                    LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE, siteId))
                    .thenReturn(List.of(resolutionRequest));

            List<LoanResolutionRequestDTO> result =
                    loanResolutionRequestService.getByStatusAndSite(
                            LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE, siteId);

            assertThat(result).hasSize(1);
            verify(resolutionRepository).findByStatusAndSiteId(
                    LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE, siteId);
        }
    }

    // ---------------------------------------------------------------
    // getByLoanId
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getByLoanId")
    class GetByLoanId {

        @Test
        @DisplayName("delegates to resolutionRepository.findByLoanId")
        void delegatesCorrectly() {
            when(resolutionRepository.findByLoanId(loanId)).thenReturn(List.of(resolutionRequest));

            List<LoanResolutionRequestDTO> result = loanResolutionRequestService.getByLoanId(loanId);

            assertThat(result).hasSize(1);
            verify(resolutionRepository).findByLoanId(loanId);
        }
    }

    // ---------------------------------------------------------------
    // getById
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("returns DTO when found")
        void returnsDTOWhenFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(resolutionRequest));

            LoanResolutionRequestDTO result = loanResolutionRequestService.getById(requestId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(requestId);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when not found")
        void throwsWhenNotFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.getById(requestId));
        }
    }

    // ---------------------------------------------------------------
    // hrDecision
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrDecision")
    class HrDecision {

        @Test
        @DisplayName("throws when request not found")
        void throwsWhenNotFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.hrDecision(requestId, true, "hr_manager"));
        }

        @Test
        @DisplayName("calls hrApprove when approved=true and saves")
        void approvesWhenTrue() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(resolutionRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(resolutionRequest);

            loanResolutionRequestService.hrDecision(requestId, true, "hr_manager");

            assertThat(resolutionRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE);
            assertThat(resolutionRequest.getHrApprovedBy()).isEqualTo("hr_manager");
            verify(resolutionRepository).save(resolutionRequest);
        }

        @Test
        @DisplayName("calls hrReject when approved=false and saves")
        void rejectsWhenFalse() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(resolutionRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(resolutionRequest);

            loanResolutionRequestService.hrDecision(requestId, false, "hr_manager");

            assertThat(resolutionRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.REJECTED);
            verify(resolutionRepository).save(resolutionRequest);
        }
    }

    // ---------------------------------------------------------------
    // hrReject
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrReject")
    class HrReject {

        @Test
        @DisplayName("throws when request not found")
        void throwsWhenNotFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.hrReject(requestId, "Insufficient documentation", "hr_manager"));
        }

        @Test
        @DisplayName("calls hrReject with reason and saves")
        void rejectsWithReason() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(resolutionRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(resolutionRequest);

            loanResolutionRequestService.hrReject(requestId, "Insufficient documentation", "hr_manager");

            assertThat(resolutionRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.REJECTED);
            assertThat(resolutionRequest.getHrRejectionReason()).isEqualTo("Insufficient documentation");
            verify(resolutionRepository).save(resolutionRequest);
        }
    }

    // ---------------------------------------------------------------
    // financeDecision
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("financeDecision")
    class FinanceDecision {

        private LoanResolutionRequest pendingFinanceRequest;

        @BeforeEach
        void setUp() {
            // Move request to PENDING_FINANCE state by HR approving it
            pendingFinanceRequest = LoanResolutionRequest.builder()
                    .id(requestId)
                    .loan(activeLoan)
                    .employee(employee)
                    .site(site)
                    .reason("Early settlement")
                    .remainingBalance(BigDecimal.valueOf(6000))
                    .status(LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE)
                    .createdBy("hr_manager")
                    .build();
        }

        @Test
        @DisplayName("throws when request not found")
        void throwsWhenNotFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.financeDecision(requestId, true, "finance_manager"));
        }

        @Test
        @DisplayName("approves, resolves loan, and deactivates loan deduction when approved=true")
        void approvesAndResolvesLoan() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(pendingFinanceRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(pendingFinanceRequest);
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            loanResolutionRequestService.financeDecision(requestId, true, "finance_manager");

            assertThat(pendingFinanceRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.APPROVED);
            assertThat(pendingFinanceRequest.getFinanceApprovedBy()).isEqualTo("finance_manager");

            // Verify loan was resolved
            assertThat(activeLoan.getStatus()).isEqualTo(Loan.LoanStatus.RESOLVED);
            verify(loanRepository).save(activeLoan);

            // Verify deduction was deactivated
            verify(employeeDeductionService).deactivateLoanDeduction(loanId, "SYSTEM");
        }

        @Test
        @DisplayName("rejects when approved=false")
        void rejectsWhenFalse() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(pendingFinanceRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(pendingFinanceRequest);

            loanResolutionRequestService.financeDecision(requestId, false, "finance_manager");

            assertThat(pendingFinanceRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.REJECTED);
            verify(resolutionRepository).save(pendingFinanceRequest);
            verify(loanRepository, never()).save(any());
            verify(employeeDeductionService, never()).deactivateLoanDeduction(any(), any());
        }
    }

    // ---------------------------------------------------------------
    // financeReject
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("financeReject")
    class FinanceReject {

        private LoanResolutionRequest pendingFinanceRequest;

        @BeforeEach
        void setUp() {
            pendingFinanceRequest = LoanResolutionRequest.builder()
                    .id(requestId)
                    .loan(activeLoan)
                    .employee(employee)
                    .site(site)
                    .reason("Early settlement")
                    .remainingBalance(BigDecimal.valueOf(6000))
                    .status(LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE)
                    .createdBy("hr_manager")
                    .build();
        }

        @Test
        @DisplayName("throws when not found")
        void throwsWhenNotFound() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanResolutionRequestService.financeReject(requestId, "Loan terms not met", "finance_mgr"));
        }

        @Test
        @DisplayName("calls financeReject with reason and saves")
        void rejectsWithReason() {
            when(resolutionRepository.findById(requestId)).thenReturn(Optional.of(pendingFinanceRequest));
            when(resolutionRepository.save(any(LoanResolutionRequest.class))).thenReturn(pendingFinanceRequest);

            loanResolutionRequestService.financeReject(requestId, "Loan terms not met", "finance_mgr");

            assertThat(pendingFinanceRequest.getStatus())
                    .isEqualTo(LoanResolutionRequest.ResolutionStatus.REJECTED);
            assertThat(pendingFinanceRequest.getFinanceRejectionReason()).isEqualTo("Loan terms not met");
            verify(resolutionRepository).save(pendingFinanceRequest);
        }
    }
}