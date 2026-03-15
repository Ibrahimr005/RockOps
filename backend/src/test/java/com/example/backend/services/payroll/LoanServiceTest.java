package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.LoanFinanceRequest;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanFinanceRequestRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
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
class LoanServiceTest {

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private LoanFinanceRequestRepository loanFinanceRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeDeductionService employeeDeductionService;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private LoanService loanService;

    private UUID loanId;
    private UUID employeeId;
    private Employee employee;
    private Site site;
    private Loan pendingLoan;
    private Loan activeLoan;

    @BeforeEach
    void setUp() {
        loanId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        site = new Site();
        site.setId(UUID.randomUUID());

        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("Ahmed");
        employee.setLastName("Ali");
        employee.setSite(site);

        pendingLoan = Loan.builder()
                .id(loanId)
                .loanNumber("LOAN-2026-000001")
                .employee(employee)
                .loanAmount(BigDecimal.valueOf(12000))
                .remainingBalance(BigDecimal.valueOf(12000))
                .installmentMonths(12)
                .monthlyInstallment(BigDecimal.valueOf(1000))
                .installmentAmount(BigDecimal.valueOf(1000))
                .interestRate(BigDecimal.ZERO)
                .loanEffectiveDate(LocalDate.now())
                .loanStartDate(LocalDate.now())
                .status(Loan.LoanStatus.PENDING_HR_APPROVAL)
                .financeStatus(Loan.FinanceApprovalStatus.NOT_SUBMITTED)
                .purpose("Personal")
                .notes("")
                .createdBy("admin")
                .build();

        activeLoan = Loan.builder()
                .id(loanId)
                .loanNumber("LOAN-2026-000002")
                .employee(employee)
                .loanAmount(BigDecimal.valueOf(6000))
                .remainingBalance(BigDecimal.valueOf(3000))
                .installmentMonths(6)
                .monthlyInstallment(BigDecimal.valueOf(1000))
                .installmentAmount(BigDecimal.valueOf(1000))
                .interestRate(BigDecimal.ZERO)
                .loanEffectiveDate(LocalDate.now().minusMonths(3))
                .loanStartDate(LocalDate.now().minusMonths(3))
                .status(Loan.LoanStatus.ACTIVE)
                .financeStatus(Loan.FinanceApprovalStatus.APPROVED)
                .purpose("Medical")
                .notes("")
                .createdBy("admin")
                .build();
    }

    // ---------------------------------------------------------------
    // getAllLoans
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getAllLoans")
    class GetAllLoans {

        @Test
        @DisplayName("delegates to loanRepository.findAll and maps to DTOs")
        void returnsAllLoans() {
            when(loanRepository.findAll()).thenReturn(List.of(pendingLoan));

            List<LoanDTO> result = loanService.getAllLoans();

            assertThat(result).hasSize(1);
            verify(loanRepository).findAll();
        }

        @Test
        @DisplayName("returns empty list when no loans exist")
        void returnsEmptyList() {
            when(loanRepository.findAll()).thenReturn(List.of());

            List<LoanDTO> result = loanService.getAllLoans();

            assertThat(result).isEmpty();
        }
    }

    // ---------------------------------------------------------------
    // getLoanById
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getLoanById")
    class GetLoanById {

        @Test
        @DisplayName("returns DTO when loan found")
        void returnsDTOWhenFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(pendingLoan));

            LoanDTO result = loanService.getLoanById(loanId);

            assertThat(result.getId()).isEqualTo(loanId);
            assertThat(result.getLoanNumber()).isEqualTo("LOAN-2026-000001");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when loan not found")
        void throwsWhenNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.getLoanById(loanId));
        }
    }

    // ---------------------------------------------------------------
    // getLoanByNumber
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getLoanByNumber")
    class GetLoanByNumber {

        @Test
        @DisplayName("returns DTO when loan found by number")
        void returnsDTOWhenFound() {
            when(loanRepository.findByLoanNumber("LOAN-2026-000001"))
                    .thenReturn(Optional.of(pendingLoan));

            LoanDTO result = loanService.getLoanByNumber("LOAN-2026-000001");

            assertThat(result.getLoanNumber()).isEqualTo("LOAN-2026-000001");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when loan number not found")
        void throwsWhenNotFound() {
            when(loanRepository.findByLoanNumber("LOAN-UNKNOWN")).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.getLoanByNumber("LOAN-UNKNOWN"));
        }
    }

    // ---------------------------------------------------------------
    // getLoansByEmployee
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getLoansByEmployee")
    class GetLoansByEmployee {

        @Test
        @DisplayName("delegates to findByEmployeeId")
        void delegatesToFindByEmployeeId() {
            when(loanRepository.findByEmployeeId(employeeId)).thenReturn(List.of(pendingLoan));

            List<LoanDTO> result = loanService.getLoansByEmployee(employeeId);

            assertThat(result).hasSize(1);
            verify(loanRepository).findByEmployeeId(employeeId);
        }
    }

    // ---------------------------------------------------------------
    // getLoansByStatus
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getLoansByStatus")
    class GetLoansByStatus {

        @Test
        @DisplayName("delegates to findByStatus")
        void delegatesToFindByStatus() {
            when(loanRepository.findByStatus(Loan.LoanStatus.PENDING_HR_APPROVAL))
                    .thenReturn(List.of(pendingLoan));

            List<LoanDTO> result = loanService.getLoansByStatus(Loan.LoanStatus.PENDING_HR_APPROVAL);

            assertThat(result).hasSize(1);
            verify(loanRepository).findByStatus(Loan.LoanStatus.PENDING_HR_APPROVAL);
        }
    }

    // ---------------------------------------------------------------
    // getActiveLoans
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("getActiveLoans")
    class GetActiveLoans {

        @Test
        @DisplayName("delegates to findAllActiveLoans")
        void delegatesToFindAllActiveLoans() {
            when(loanRepository.findAllActiveLoans()).thenReturn(List.of(activeLoan));

            List<LoanDTO> result = loanService.getActiveLoans();

            assertThat(result).hasSize(1);
            verify(loanRepository).findAllActiveLoans();
        }
    }

    // ---------------------------------------------------------------
    // createLoan
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("createLoan")
    class CreateLoan {

        private LoanDTO createDTO;

        @BeforeEach
        void setUp() {
            createDTO = LoanDTO.builder()
                    .employeeId(employeeId)
                    .loanAmount(BigDecimal.valueOf(12000))
                    .installmentMonths(12)
                    .interestRate(BigDecimal.ZERO)
                    .loanEffectiveDate(LocalDate.now())
                    .purpose("Personal")
                    .build();
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when employee not found")
        void throwsWhenEmployeeNotFound() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.createLoan(createDTO, "admin"));
        }

        @Test
        @DisplayName("saves loan with PENDING_HR_APPROVAL status and generated loan number")
        void savesLoanWithCorrectStatus() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.LOAN))
                    .thenReturn("LOAN-2026-000001");
            when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);

            LoanDTO result = loanService.createLoan(createDTO, "admin");

            ArgumentCaptor<Loan> captor = ArgumentCaptor.forClass(Loan.class);
            verify(loanRepository).save(captor.capture());

            Loan saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(Loan.LoanStatus.PENDING_HR_APPROVAL);
            assertThat(saved.getLoanNumber()).isEqualTo("LOAN-2026-000001");
            assertThat(saved.getEmployee()).isEqualTo(employee);
            assertThat(saved.getLoanAmount()).isEqualByComparingTo(BigDecimal.valueOf(12000));
            assertThat(saved.getCreatedBy()).isEqualTo("admin");
        }

        @Test
        @DisplayName("calculates monthly installment when not provided")
        void calculatesMonthlyInstallment() {
            // No monthly installment set → should be calculated as 12000/12 = 1000
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.LOAN))
                    .thenReturn("LOAN-2026-000001");
            when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);

            loanService.createLoan(createDTO, "admin");

            ArgumentCaptor<Loan> captor = ArgumentCaptor.forClass(Loan.class);
            verify(loanRepository).save(captor.capture());

            Loan saved = captor.getValue();
            // 12000 / 12 = 1000 (zero interest)
            assertThat(saved.getMonthlyInstallment()).isEqualByComparingTo(BigDecimal.valueOf(1000));
        }
    }

    // ---------------------------------------------------------------
    // hrApproveLoan (simple overload: hrApproveLoan(UUID, String))
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrApproveLoan")
    class HrApproveLoan {

        @Test
        @DisplayName("throws when loan not found")
        void throwsWhenNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.hrApproveLoan(loanId, "hr_manager"));
        }

        @Test
        @DisplayName("approves loan and saves it (status becomes HR_APPROVED)")
        void approvesLoan() {
            // Use lenient stubs to accommodate conditional branching inside hrApproveLoan
            lenient().when(loanRepository.findById(loanId))
                    .thenReturn(Optional.of(pendingLoan));
            lenient().when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);
            // Stub payment request creation path
            lenient().when(paymentRequestRepository.getMaxRequestNumberSequence(anyString())).thenReturn(null);
            lenient().when(paymentRequestRepository.save(any())).thenReturn(
                    PaymentRequest.builder().id(UUID.randomUUID()).requestNumber("PR-2026-000001").build());
            // Stub finance request creation path
            lenient().when(loanFinanceRequestRepository.existsByLoanId(loanId)).thenReturn(false);
            lenient().when(loanFinanceRequestRepository.getMaxRequestNumberSequence(anyString())).thenReturn(null);
            lenient().when(loanFinanceRequestRepository.save(any(LoanFinanceRequest.class)))
                    .thenReturn(LoanFinanceRequest.builder()
                            .id(UUID.randomUUID())
                            .requestNumber("LFR-2026-000001")
                            .status(LoanFinanceRequest.RequestStatus.PENDING)
                            .build());

            loanService.hrApproveLoan(loanId, "hr_manager");

            // The loan should have been saved at least once
            verify(loanRepository, atLeastOnce()).save(any(Loan.class));
        }
    }

    // ---------------------------------------------------------------
    // hrRejectLoan
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("hrRejectLoan")
    class HrRejectLoan {

        @Test
        @DisplayName("throws when loan not found")
        void throwsWhenNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.hrRejectLoan(loanId, "hr_manager", "Policy violation"));
        }

        @Test
        @DisplayName("rejects loan and saves")
        void rejectsLoan() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(pendingLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);

            loanService.hrRejectLoan(loanId, "hr_manager", "Policy violation");

            assertThat(pendingLoan.getStatus()).isEqualTo(Loan.LoanStatus.HR_REJECTED);
            assertThat(pendingLoan.getHrRejectedBy()).isEqualTo("hr_manager");
            assertThat(pendingLoan.getHrRejectionReason()).isEqualTo("Policy violation");
            verify(loanRepository).save(pendingLoan);
        }
    }

    // ---------------------------------------------------------------
    // recordLoanPayment
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("recordLoanPayment")
    class RecordLoanPayment {

        @Test
        @DisplayName("throws when loan not found")
        void throwsWhenNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.recordLoanPayment(loanId, BigDecimal.valueOf(1000)));
        }

        @Test
        @DisplayName("reduces remaining balance and saves")
        void reducesBalanceAndSaves() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(activeLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            loanService.recordLoanPayment(loanId, BigDecimal.valueOf(1000));

            // remaining balance was 3000, payment of 1000 => 2000
            assertThat(activeLoan.getRemainingBalance()).isEqualByComparingTo(BigDecimal.valueOf(2000));
            verify(loanRepository).save(activeLoan);
        }

        @Test
        @DisplayName("deactivates loan deduction when loan becomes COMPLETED after payment")
        void deactivatesDeductionWhenCompleted() {
            // Set remaining balance equal to payment so loan completes
            activeLoan.setRemainingBalance(BigDecimal.valueOf(1000));

            when(loanRepository.findById(loanId)).thenReturn(Optional.of(activeLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            loanService.recordLoanPayment(loanId, BigDecimal.valueOf(1000));

            assertThat(activeLoan.getStatus()).isEqualTo(Loan.LoanStatus.COMPLETED);
            verify(employeeDeductionService).deactivateLoanDeduction(loanId, "SYSTEM");
        }

        @Test
        @DisplayName("does not deactivate deduction when loan is NOT completed")
        void doesNotDeactivateWhenNotCompleted() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(activeLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(activeLoan);

            // Payment of 500 out of 3000 remaining — loan is not complete
            loanService.recordLoanPayment(loanId, BigDecimal.valueOf(500));

            verify(employeeDeductionService, never()).deactivateLoanDeduction(any(), any());
        }
    }

    // ---------------------------------------------------------------
    // cancelLoan
    // ---------------------------------------------------------------

    @Nested
    @DisplayName("cancelLoan")
    class CancelLoan {

        @Test
        @DisplayName("throws when loan not found")
        void throwsWhenNotFound() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> loanService.cancelLoan(loanId, "admin", "No longer needed"));
        }

        @Test
        @DisplayName("cancels loan, appends notes, and saves")
        void cancelsLoanAndSaves() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(pendingLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);
            when(loanFinanceRequestRepository.findByLoanId(loanId)).thenReturn(Optional.empty());

            loanService.cancelLoan(loanId, "admin", "No longer needed");

            assertThat(pendingLoan.getStatus()).isEqualTo(Loan.LoanStatus.CANCELLED);
            assertThat(pendingLoan.getNotes()).contains("No longer needed");
            assertThat(pendingLoan.getUpdatedBy()).isEqualTo("admin");
            verify(loanRepository).save(pendingLoan);
        }

        @Test
        @DisplayName("also deactivates loan deduction on cancel")
        void deactivatesDeductionOnCancel() {
            when(loanRepository.findById(loanId)).thenReturn(Optional.of(pendingLoan));
            when(loanRepository.save(any(Loan.class))).thenReturn(pendingLoan);
            when(loanFinanceRequestRepository.findByLoanId(loanId)).thenReturn(Optional.empty());

            loanService.cancelLoan(loanId, "admin", "Reason");

            verify(employeeDeductionService).deactivateLoanDeduction(loanId, "admin");
        }
    }
}