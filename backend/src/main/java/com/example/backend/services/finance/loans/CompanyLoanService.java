package com.example.backend.services.finance.loans;

import com.example.backend.dto.finance.loans.*;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.finance.balances.BalanceTransaction;
import com.example.backend.models.finance.balances.TransactionStatus;
import com.example.backend.models.finance.balances.TransactionType;
import com.example.backend.models.finance.loans.CompanyLoan;
import com.example.backend.models.finance.loans.FinancialInstitution;
import com.example.backend.models.finance.loans.LoanInstallment;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.balances.BalanceTransactionRepository;
import com.example.backend.repositories.finance.loans.CompanyLoanRepository;
import com.example.backend.repositories.finance.loans.FinancialInstitutionRepository;
import com.example.backend.repositories.finance.loans.LoanInstallmentRepository;
import com.example.backend.services.finance.balances.BankAccountService;
import com.example.backend.services.finance.balances.CashSafeService;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyLoanService {

    private final CompanyLoanRepository loanRepository;
    private final FinancialInstitutionRepository institutionRepository;
    private final LoanInstallmentRepository installmentRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final BalanceTransactionRepository balanceTransactionRepository;
    private final EntityIdGeneratorService idGeneratorService;
    private final BankAccountService bankAccountService;
    private final CashSafeService cashSafeService;
    private final LoanPaymentRequestService loanPaymentRequestService;

    /**
     * Create a new company loan with installments
     */
    public CompanyLoanResponseDTO createLoan(CreateCompanyLoanRequestDTO requestDTO, String createdBy) {
        log.info("Creating company loan for institution: {}", requestDTO.getFinancialInstitutionId());

        // Validate institution exists and is active
        FinancialInstitution institution = institutionRepository.findById(requestDTO.getFinancialInstitutionId())
                .orElseThrow(() -> new IllegalArgumentException("Financial institution not found"));

        if (!institution.getIsActive()) {
            throw new IllegalArgumentException("Cannot create loan with inactive financial institution");
        }

        // Validate dates
        if (requestDTO.getStartDate().isBefore(requestDTO.getDisbursementDate())) {
            throw new IllegalArgumentException("Start date cannot be before disbursement date");
        }
        if (requestDTO.getMaturityDate().isBefore(requestDTO.getStartDate())) {
            throw new IllegalArgumentException("Maturity date cannot be before start date");
        }

        // Validate installments total matches principal
        BigDecimal totalPrincipal = requestDTO.getInstallments().stream()
                .map(LoanInstallmentRequestDTO::getPrincipalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPrincipal.compareTo(requestDTO.getPrincipalAmount()) != 0) {
            throw new IllegalArgumentException("Sum of installment principal amounts (" + totalPrincipal +
                    ") must equal loan principal (" + requestDTO.getPrincipalAmount() + ")");
        }

        // Get account name for disbursement
        String accountName = getAccountName(requestDTO.getDisbursedToAccountType(), requestDTO.getDisbursedToAccountId());

        // Generate loan number
        String loanNumber = idGeneratorService.generateNextId(EntityTypeConfig.COMPANY_LOAN);

        // Create loan
        CompanyLoan loan = CompanyLoan.builder()
                .loanNumber(loanNumber)
                .financialInstitution(institution)
                .loanType(requestDTO.getLoanType())
                .principalAmount(requestDTO.getPrincipalAmount())
                .remainingPrincipal(requestDTO.getPrincipalAmount())
                .interestRate(requestDTO.getInterestRate())
                .interestType(requestDTO.getInterestType())
                .variableRateBase(requestDTO.getVariableRateBase())
                .currency(requestDTO.getCurrency() != null ? requestDTO.getCurrency() : "EGP")
                .disbursementDate(requestDTO.getDisbursementDate())
                .startDate(requestDTO.getStartDate())
                .maturityDate(requestDTO.getMaturityDate())
                .termMonths(requestDTO.getTermMonths())
                .totalInstallments(requestDTO.getInstallments().size())
                .disbursedToAccountId(requestDTO.getDisbursedToAccountId())
                .disbursedToAccountType(requestDTO.getDisbursedToAccountType())
                .disbursedToAccountName(accountName)
                .purpose(requestDTO.getPurpose())
                .collateral(requestDTO.getCollateral())
                .guarantor(requestDTO.getGuarantor())
                .contractReference(requestDTO.getContractReference())
                .status(CompanyLoanStatus.ACTIVE)
                .notes(requestDTO.getNotes())
                .createdBy(createdBy)
                .build();

        CompanyLoan savedLoan = loanRepository.save(loan);
        log.info("Created loan: {}", savedLoan.getLoanNumber());

        // Create installments
        List<LoanInstallment> installments = createInstallments(savedLoan, requestDTO.getInstallments());
        savedLoan.setInstallments(installments);

        // Create balance transaction for disbursement (adds money to account)
        createDisbursementTransaction(savedLoan, createdBy);

        // Create payment requests for all installments
        loanPaymentRequestService.createPaymentRequestsForLoan(savedLoan, createdBy);

        log.info("Loan creation complete: {} with {} installments", savedLoan.getLoanNumber(), installments.size());

        return CompanyLoanResponseDTO.fromEntity(savedLoan);
    }

    /**
     * Create installments for a loan
     */
    private List<LoanInstallment> createInstallments(CompanyLoan loan, List<LoanInstallmentRequestDTO> installmentDTOs) {
        List<LoanInstallment> installments = installmentDTOs.stream()
                .map(dto -> {
                    BigDecimal totalAmount = dto.getPrincipalAmount().add(dto.getInterestAmount());

                    return LoanInstallment.builder()
                            .companyLoan(loan)
                            .installmentNumber(dto.getInstallmentNumber())
                            .dueDate(dto.getDueDate())
                            .principalAmount(dto.getPrincipalAmount())
                            .interestAmount(dto.getInterestAmount())
                            .totalAmount(totalAmount)
                            .paidAmount(BigDecimal.ZERO)
                            .remainingAmount(totalAmount)
                            .status(LoanInstallmentStatus.PENDING)
                            .notes(dto.getNotes())
                            .build();
                })
                .collect(Collectors.toList());

        return installmentRepository.saveAll(installments);
    }

    /**
     * Create balance transaction for loan disbursement
     */
    private void createDisbursementTransaction(CompanyLoan loan, String createdBy) {
        log.info("Creating disbursement transaction for loan: {}", loan.getLoanNumber());

        BalanceTransaction transaction = BalanceTransaction.builder()
                .transactionType(TransactionType.DEPOSIT)
                .amount(loan.getPrincipalAmount())
                .transactionDate(LocalDateTime.now())
                .description("Loan disbursement: " + loan.getLoanNumber() + " from " + loan.getFinancialInstitution().getName())
                .referenceNumber(loan.getLoanNumber())
                .accountType(convertAccountType(loan.getDisbursedToAccountType()))
                .accountId(loan.getDisbursedToAccountId())
                .status(TransactionStatus.APPROVED)
                .createdBy(createdBy)
                .approvedBy("SYSTEM")
                .approvedAt(LocalDateTime.now())
                .build();

        balanceTransactionRepository.save(transaction);

        // Update account balance
        updateAccountBalance(loan.getDisbursedToAccountType(), loan.getDisbursedToAccountId(),
                loan.getPrincipalAmount(), true);

        log.info("Disbursement transaction created and balance updated");
    }

    /**
     * Get loan by ID
     */
    @Transactional(readOnly = true)
    public CompanyLoanResponseDTO getById(UUID id) {
        CompanyLoan loan = loanRepository.findByIdWithInstallments(id)
                .orElseThrow(() -> new IllegalArgumentException("Company loan not found with ID: " + id));
        return CompanyLoanResponseDTO.fromEntity(loan);
    }

    /**
     * Get loan by loan number
     */
    @Transactional(readOnly = true)
    public CompanyLoanResponseDTO getByLoanNumber(String loanNumber) {
        CompanyLoan loan = loanRepository.findByLoanNumber(loanNumber)
                .orElseThrow(() -> new IllegalArgumentException("Company loan not found with number: " + loanNumber));
        return CompanyLoanResponseDTO.fromEntity(loan);
    }

    /**
     * Get all loans
     */
    @Transactional(readOnly = true)
    public List<CompanyLoanSummaryDTO> getAllLoans() {
        return loanRepository.findAll().stream()
                .map(CompanyLoanSummaryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get loans by status
     */
    @Transactional(readOnly = true)
    public List<CompanyLoanSummaryDTO> getLoansByStatus(CompanyLoanStatus status) {
        return loanRepository.findByStatus(status).stream()
                .map(CompanyLoanSummaryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get loans by institution
     */
    @Transactional(readOnly = true)
    public List<CompanyLoanSummaryDTO> getLoansByInstitution(UUID institutionId) {
        return loanRepository.findByFinancialInstitutionId(institutionId).stream()
                .map(CompanyLoanSummaryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get active loans with upcoming payments
     */
    @Transactional(readOnly = true)
    public List<CompanyLoanSummaryDTO> getActiveLoans() {
        return loanRepository.findByStatusOrderByMaturityDateAsc(CompanyLoanStatus.ACTIVE).stream()
                .map(CompanyLoanSummaryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Update loan status
     */
    public CompanyLoanResponseDTO updateStatus(UUID id, CompanyLoanStatus newStatus, String updatedBy) {
        log.info("Updating loan {} status to {}", id, newStatus);

        CompanyLoan loan = loanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company loan not found with ID: " + id));

        loan.setStatus(newStatus);
        CompanyLoan updated = loanRepository.save(loan);

        return CompanyLoanResponseDTO.fromEntity(updated);
    }

    /**
     * Process installment payment (called when PaymentRequest is paid)
     */
    public void processInstallmentPayment(UUID installmentId, BigDecimal paidAmount) {
        log.info("Processing payment of {} for installment {}", paidAmount, installmentId);

        LoanInstallment installment = installmentRepository.findById(installmentId)
                .orElseThrow(() -> new IllegalArgumentException("Loan installment not found"));

        CompanyLoan loan = installment.getCompanyLoan();

        // Update installment
        installment.processPayment(paidAmount);
        installmentRepository.save(installment);

        // Calculate principal and interest portions
        BigDecimal principalPortion = installment.getPrincipalPortion(paidAmount);
        BigDecimal interestPortion = installment.getInterestPortion(paidAmount);

        // Update loan totals
        loan.processInstallmentPayment(principalPortion, interestPortion);
        loanRepository.save(loan);

        log.info("Installment payment processed. Loan remaining principal: {}", loan.getRemainingPrincipal());
    }

    /**
     * Get installments for a loan
     */
    @Transactional(readOnly = true)
    public List<LoanInstallmentResponseDTO> getLoanInstallments(UUID loanId) {
        return installmentRepository.findByCompanyLoanIdOrderByInstallmentNumberAsc(loanId).stream()
                .map(LoanInstallmentResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get upcoming installments (next 30 days)
     */
    @Transactional(readOnly = true)
    public List<LoanInstallmentResponseDTO> getUpcomingInstallments(int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);

        return installmentRepository.findUpcomingInstallments(today, futureDate).stream()
                .map(LoanInstallmentResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get overdue installments
     */
    @Transactional(readOnly = true)
    public List<LoanInstallmentResponseDTO> getOverdueInstallments() {
        return installmentRepository.findOverdueInstallments(LocalDate.now()).stream()
                .map(LoanInstallmentResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== Helper Methods ====================

    private String getAccountName(AccountType accountType, UUID accountId) {
        try {
            switch (accountType) {
                case BANK_ACCOUNT:
                    return bankAccountService.getAccountName(accountId);
                case CASH_SAFE:
                    return cashSafeService.getAccountName(accountId);
                default:
                    return "Unknown Account";
            }
        } catch (Exception e) {
            return "Unknown Account";
        }
    }

    private void updateAccountBalance(AccountType accountType, UUID accountId, BigDecimal amount, boolean isDeposit) {
        switch (accountType) {
            case BANK_ACCOUNT:
                BigDecimal bankBalance = bankAccountService.getBalance(accountId);
                BigDecimal newBankBalance = isDeposit ? bankBalance.add(amount) : bankBalance.subtract(amount);
                bankAccountService.updateBalance(accountId, newBankBalance);
                break;
            case CASH_SAFE:
                BigDecimal safeBalance = cashSafeService.getBalance(accountId);
                BigDecimal newSafeBalance = isDeposit ? safeBalance.add(amount) : safeBalance.subtract(amount);
                cashSafeService.updateBalance(accountId, newSafeBalance);
                break;
        }
    }

    private com.example.backend.models.finance.balances.AccountType convertAccountType(AccountType accountType) {
        return com.example.backend.models.finance.balances.AccountType.valueOf(accountType.name());
    }
}