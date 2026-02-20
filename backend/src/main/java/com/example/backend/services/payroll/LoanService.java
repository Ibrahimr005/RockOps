package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.LoanFinanceActionDTO;
import com.example.backend.dto.payroll.LoanFinanceRequestDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentSourceType;
import com.example.backend.models.finance.accountsPayable.PaymentTargetType;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.LoanFinanceRequest;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanFinanceRequestRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing employee loans with Finance integration
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {

    private final LoanRepository loanRepository;
    private final LoanFinanceRequestRepository loanFinanceRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDeductionService employeeDeductionService;
    private final PaymentRequestRepository paymentRequestRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;

    // ===================================================
    // LOAN CRUD OPERATIONS
    // ===================================================

    /**
     * Get all loans
     */
    public List<LoanDTO> getAllLoans() {
        return loanRepository.findAll().stream()
            .map(LoanDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get loan by ID
     */
    public LoanDTO getLoanById(UUID id) {
        Loan loan = loanRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + id));
        return LoanDTO.fromEntity(loan);
    }

    /**
     * Get loan by loan number
     */
    public LoanDTO getLoanByNumber(String loanNumber) {
        Loan loan = loanRepository.findByLoanNumber(loanNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanNumber));
        return LoanDTO.fromEntity(loan);
    }

    /**
     * Get loans by employee
     */
    public List<LoanDTO> getLoansByEmployee(UUID employeeId) {
        return loanRepository.findByEmployeeId(employeeId).stream()
            .map(LoanDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get loans by status
     */
    public List<LoanDTO> getLoansByStatus(Loan.LoanStatus status) {
        return loanRepository.findByStatus(status).stream()
            .map(LoanDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get active loans
     */
    public List<LoanDTO> getActiveLoans() {
        return loanRepository.findAllActiveLoans().stream()
            .map(LoanDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Create a new loan
     */
    @Transactional
    public LoanDTO createLoan(LoanDTO dto, String createdBy) {
        log.info("Creating loan for employee {} by {}", dto.getEmployeeId(), createdBy);

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + dto.getEmployeeId()));

        // Generate loan number
        String loanNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.LOAN);

        // Calculate monthly installment if not provided
        BigDecimal monthlyInstallment = dto.getMonthlyInstallment();
        if (monthlyInstallment == null || monthlyInstallment.compareTo(BigDecimal.ZERO) == 0) {
            monthlyInstallment = Loan.calculateMonthlyInstallment(
                dto.getLoanAmount(),
                dto.getInstallmentMonths(),
                dto.getInterestRate()
            );
        }

        // Calculate loan start and end dates
        LocalDate loanDate = dto.getLoanDate() != null ? dto.getLoanDate() : LocalDate.now();
        LocalDate endDate = loanDate.plusMonths(dto.getInstallmentMonths());

        Loan loan = Loan.builder()
            .loanNumber(loanNumber)
            .employee(employee)
            .loanAmount(dto.getLoanAmount())
            .remainingBalance(dto.getLoanAmount())
            .installmentMonths(dto.getInstallmentMonths())
            .monthlyInstallment(monthlyInstallment)
            .installmentAmount(monthlyInstallment) // Sync with monthlyInstallment for backward compatibility
            .interestRate(dto.getInterestRate())
            .loanDate(loanDate)
            .endDate(endDate)
            .disbursementDate(dto.getDisbursementDate())
            .firstPaymentDate(dto.getFirstPaymentDate())
            .status(Loan.LoanStatus.PENDING_HR_APPROVAL)
            .financeStatus(Loan.FinanceApprovalStatus.NOT_SUBMITTED)
            .purpose(dto.getPurpose())
            .notes(dto.getNotes())
            .createdBy(createdBy)
            .build();

        Loan saved = loanRepository.save(loan);
        log.info("Created loan: {} for employee {}", saved.getLoanNumber(), employee.getId());

        return LoanDTO.fromEntity(saved);
    }

    /**
     * Update a loan
     */
    @Transactional
    public LoanDTO updateLoan(UUID id, LoanDTO dto, String updatedBy) {
        log.info("Updating loan {} by {}", id, updatedBy);

        Loan existing = loanRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + id));

        // Can only update loans in draft or pending HR approval status
        if (existing.getStatus() != Loan.LoanStatus.DRAFT
            && existing.getStatus() != Loan.LoanStatus.PENDING_HR_APPROVAL
            && existing.getStatus() != Loan.LoanStatus.PENDING) {
            throw new IllegalStateException("Cannot update loan in status: " + existing.getStatus());
        }

        existing.setLoanAmount(dto.getLoanAmount());
        existing.setInstallmentMonths(dto.getInstallmentMonths());
        existing.setInterestRate(dto.getInterestRate());
        existing.setPurpose(dto.getPurpose());
        existing.setNotes(dto.getNotes());
        existing.setUpdatedBy(updatedBy);

        // Recalculate monthly installment
        BigDecimal monthlyInstallment = Loan.calculateMonthlyInstallment(
            dto.getLoanAmount(),
            dto.getInstallmentMonths(),
            dto.getInterestRate()
        );
        existing.setMonthlyInstallment(monthlyInstallment);
        existing.setInstallmentAmount(monthlyInstallment); // Sync with monthlyInstallment
        existing.setRemainingBalance(dto.getLoanAmount());

        // Recalculate end date based on loan date and new installment months
        if (existing.getLoanDate() != null) {
            LocalDate endDate = existing.getLoanDate().plusMonths(dto.getInstallmentMonths());
            existing.setEndDate(endDate);
        }

        Loan saved = loanRepository.save(existing);
        log.info("Updated loan: {}", saved.getLoanNumber());

        return LoanDTO.fromEntity(saved);
    }

    // ===================================================
    // HR APPROVAL WORKFLOW
    // ===================================================

    /**
     * HR approves a loan - DEPRECATED, use hrApproveLoan with userId for auto-finance generation
     */
    @Transactional
    public LoanDTO hrApproveLoan(UUID loanId, String approver) {
        return hrApproveLoan(loanId, null, approver);
    }

    /**
     * HR approves a loan and automatically generates finance request
     * This ensures Finance team is immediately notified and can configure installment details
     *
     * @param loanId The loan ID to approve
     * @param approverId The HR approver's user ID (for finance request tracking)
     * @param approverName The HR approver's username
     * @return The approved loan DTO with finance request information
     */
    @Transactional
    public LoanDTO hrApproveLoan(UUID loanId, UUID approverId, String approverName) {
        log.info("HR approving loan {} by {}", loanId, approverName);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        // HR approval
        loan.hrApprove(approverName);
        Loan saved = loanRepository.save(loan);
        log.info("HR approved loan: {}", saved.getLoanNumber());

        // Create PaymentRequest with APPROVED status so it appears on Process Payments page
        Employee employee = saved.getEmployee();
        createApprovedPaymentRequestForLoan(saved, employee, approverId, approverName);

        // Automatically generate finance request after HR approval
        try {
            LoanFinanceRequestDTO financeRequest = sendToFinance(loanId, approverId, approverName);
            log.info("Auto-generated finance request {} for loan {}",
                    financeRequest.getRequestNumber(), saved.getLoanNumber());

            // Refresh loan to get updated finance request info
            saved = loanRepository.findById(loanId).orElse(saved);
        } catch (Exception e) {
            log.error("Failed to auto-generate finance request for loan {}: {}",
                    saved.getLoanNumber(), e.getMessage());
            // Don't fail the HR approval if finance request creation fails
            // The request can be sent manually later
        }

        return LoanDTO.fromEntity(saved);
    }

    /**
     * HR rejects a loan
     */
    @Transactional
    public LoanDTO hrRejectLoan(UUID loanId, String rejector, String reason) {
        log.info("HR rejecting loan {} by {}", loanId, rejector);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        loan.hrReject(rejector, reason);
        Loan saved = loanRepository.save(loan);

        log.info("HR rejected loan: {}", saved.getLoanNumber());
        return LoanDTO.fromEntity(saved);
    }

    // ===================================================
    // FINANCE INTEGRATION
    // ===================================================

    /**
     * Send loan to Finance for approval
     * Creates a LoanFinanceRequest and updates loan status
     */
    @Transactional
    public LoanFinanceRequestDTO sendToFinance(UUID loanId, UUID requestedByUserId, String requestedByUserName) {
        log.info("Sending loan {} to Finance by {}", loanId, requestedByUserName);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.HR_APPROVED) {
            throw new IllegalStateException("Can only send HR-approved loans to Finance");
        }

        // Check if already sent to finance
        if (loanFinanceRequestRepository.existsByLoanId(loanId)) {
            throw new IllegalStateException("Loan already has a finance request");
        }

        Employee employee = loan.getEmployee();
        BigDecimal monthlySalary = getMonthlySalary(employee);

        // Generate request number
        String requestNumber = generateFinanceRequestNumber();

        LoanFinanceRequest request = LoanFinanceRequest.builder()
            .requestNumber(requestNumber)
            .loan(loan)
            .employeeId(employee.getId())
            .employeeName(employee.getFirstName() + " " + employee.getLastName())
            .employeeNumber(employee.getEmployeeNumber())
            .departmentName(employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null ? employee.getJobPosition().getDepartment().getName() : null)
            .jobPositionName(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
            .loanNumber(loan.getLoanNumber())
            .loanAmount(loan.getLoanAmount())
            .requestedInstallments(loan.getInstallmentMonths())
            .requestedMonthlyAmount(loan.getMonthlyInstallment())
            .interestRate(loan.getInterestRate())
            .loanPurpose(loan.getPurpose())
            .employeeMonthlySalary(monthlySalary)
            .status(LoanFinanceRequest.RequestStatus.PENDING)
            .requestedByUserId(requestedByUserId)
            .requestedByUserName(requestedByUserName)
            .requestedAt(LocalDateTime.now())
            .build();

        LoanFinanceRequest savedRequest = loanFinanceRequestRepository.save(request);

        // Update loan status
        loan.sendToFinance();
        loan.setFinanceRequestId(savedRequest.getId());
        loan.setFinanceRequestNumber(requestNumber);
        loanRepository.save(loan);

        log.info("Created finance request {} for loan {}", requestNumber, loan.getLoanNumber());
        return LoanFinanceRequestDTO.fromEntity(savedRequest);
    }

    /**
     * Get pending finance requests
     */
    public List<LoanFinanceRequestDTO> getPendingFinanceRequests() {
        return loanFinanceRequestRepository.findPendingRequests().stream()
            .map(LoanFinanceRequestDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get all active finance requests for dashboard
     */
    public List<LoanFinanceRequestDTO> getActiveFinanceRequests() {
        return loanFinanceRequestRepository.findActiveRequestsForDashboard().stream()
            .map(LoanFinanceRequestDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get finance request by ID
     */
    public LoanFinanceRequestDTO getFinanceRequestById(UUID id) {
        LoanFinanceRequest request = loanFinanceRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Finance request not found: " + id));
        return LoanFinanceRequestDTO.fromEntity(request);
    }

    /**
     * Finance approves a loan with deduction plan
     */
    @Transactional
    public LoanFinanceRequestDTO financeApproveLoan(LoanFinanceActionDTO.ApproveRequest approveRequest,
                                                     UUID approverUserId, String approverUserName) {
        log.info("Finance approving loan request {} by {}", approveRequest.getRequestId(), approverUserName);

        LoanFinanceRequest request = loanFinanceRequestRepository.findById(approveRequest.getRequestId())
            .orElseThrow(() -> new ResourceNotFoundException("Finance request not found"));

        request.approve(
            approverUserId,
            approverUserName,
            approveRequest.getInstallments(),
            approveRequest.getMonthlyAmount(),
            approveRequest.getFirstDeductionDate(),
            approveRequest.getNotes()
        );

        LoanFinanceRequest savedRequest = loanFinanceRequestRepository.save(request);

        // Update loan with Finance decision
        Loan loan = request.getLoan();
        loan.financeApprove(
            approverUserName,
            approveRequest.getInstallments(),
            approveRequest.getMonthlyAmount(),
            approveRequest.getNotes()
        );
        loan.setFirstPaymentDate(approveRequest.getFirstDeductionDate());
        loanRepository.save(loan);

        log.info("Finance approved loan: {} with {} installments of {}",
            loan.getLoanNumber(), approveRequest.getInstallments(), approveRequest.getMonthlyAmount());

        return LoanFinanceRequestDTO.fromEntity(savedRequest);
    }

    /**
     * Finance rejects a loan
     */
    @Transactional
    public LoanFinanceRequestDTO financeRejectLoan(LoanFinanceActionDTO.RejectRequest rejectRequest,
                                                    UUID rejectorUserId, String rejectorUserName) {
        log.info("Finance rejecting loan request {} by {}", rejectRequest.getRequestId(), rejectorUserName);

        LoanFinanceRequest request = loanFinanceRequestRepository.findById(rejectRequest.getRequestId())
            .orElseThrow(() -> new ResourceNotFoundException("Finance request not found"));

        request.reject(rejectorUserId, rejectorUserName, rejectRequest.getReason());
        LoanFinanceRequest savedRequest = loanFinanceRequestRepository.save(request);

        // Update loan status
        Loan loan = request.getLoan();
        loan.financeReject(rejectorUserName, rejectRequest.getReason());
        loanRepository.save(loan);

        log.info("Finance rejected loan: {}", loan.getLoanNumber());
        return LoanFinanceRequestDTO.fromEntity(savedRequest);
    }

    /**
     * Disburse loan to employee
     */
    @Transactional
    public LoanFinanceRequestDTO disburseLoan(LoanFinanceActionDTO.DisbursementRequest disbursementRequest,
                                               UUID disburserUserId, String disburserUserName) {
        log.info("Disbursing loan request {} by {}", disbursementRequest.getRequestId(), disburserUserName);

        LoanFinanceRequest request = loanFinanceRequestRepository.findById(disbursementRequest.getRequestId())
            .orElseThrow(() -> new ResourceNotFoundException("Finance request not found"));

        request.markDisbursed(disburserUserId, disburserUserName, disbursementRequest.getDisbursementReference());
        LoanFinanceRequest savedRequest = loanFinanceRequestRepository.save(request);

        // Update loan and activate deductions
        Loan loan = request.getLoan();
        Employee employee = loan.getEmployee();

        loan.disburse(
            disburserUserName,
            request.getPaymentSourceType(),
            request.getPaymentSourceId(),
            request.getPaymentSourceName()
        );
        loan.activate();
        loanRepository.save(loan);

        // Mark existing PaymentRequest as PAID (created during finance approval)
        markLoanPaymentRequestAsPaid(loan, disburserUserId, disburserUserName);

        // Create employee deduction for loan repayment
        LocalDate endDate = request.getFirstDeductionDate()
            .plusMonths(request.getApprovedInstallments() - 1);

        employeeDeductionService.createLoanDeduction(
            loan.getEmployee().getId(),
            loan.getId(),
            loan.getLoanNumber(),
            request.getApprovedMonthlyAmount(),
            request.getFirstDeductionDate(),
            endDate,
            disburserUserName
        );

        log.info("Disbursed loan: {} and created payroll deduction", loan.getLoanNumber());
        return LoanFinanceRequestDTO.fromEntity(savedRequest);
    }

    /**
     * Create a PaymentRequest with PENDING status when HR approves a loan.
     * Finance must then approve/reject it. Once approved, it appears on Process Payments page.
     * Due date is set to the loan date.
     */
    private void createApprovedPaymentRequestForLoan(Loan loan, Employee employee, UUID approverUserId, String approverUserName) {
        String requestNumber = generatePaymentRequestNumber();

        String employeeName = employee.getFirstName() + " " + employee.getLastName();
        String targetDetails = buildEmployeeTargetDetails(
            employee.getBankName(),
            employee.getBankAccountNumber(),
            employee.getWalletNumber()
        );

        PaymentRequest paymentRequest = PaymentRequest.builder()
            // Source polymorphism
            .sourceType(PaymentSourceType.ELOAN)
            .sourceId(loan.getId())
            .sourceNumber(loan.getLoanNumber())
            .sourceDescription("Employee Loan: " + loan.getLoanNumber() + " - " + loan.getPurpose())
            // Target polymorphism
            .targetType(PaymentTargetType.EMPLOYEE)
            .targetId(employee.getId())
            .targetName(employeeName)
            .targetDetails(targetDetails)
            // Financial details
            .requestNumber(requestNumber)
            .requestedAmount(loan.getLoanAmount())
            .currency("EGP")
            .description("Loan disbursement to " + employeeName + " - " + loan.getPurpose())
            .paymentDueDate(loan.getLoanDate()) // Due date = loan date
            .status(PaymentRequestStatus.PENDING) // PENDING — Finance must approve before it can be paid
            // Requestor info
            .requestedByUserId(approverUserId)
            .requestedByUserName(approverUserName)
            .requestedByDepartment("HR")
            .requestedAt(LocalDateTime.now())
            // Payment tracking — not yet paid
            .totalPaidAmount(BigDecimal.ZERO)
            .remainingAmount(loan.getLoanAmount())
            .build();

        paymentRequestRepository.save(paymentRequest);
        log.info("Created PENDING PaymentRequest {} for loan {} (due: {}) — awaiting Finance approval",
                requestNumber, loan.getLoanNumber(), loan.getLoanDate());
    }

    /**
     * Mark an existing loan PaymentRequest as PAID after disbursement.
     * Falls back to creating a new PAID PaymentRequest if none exists.
     */
    private void markLoanPaymentRequestAsPaid(Loan loan, UUID disburserUserId, String disburserUserName) {
        // Find the existing APPROVED payment request for this loan
        List<PaymentRequest> existing = paymentRequestRepository.findBySourceTypeAndSourceId(
                PaymentSourceType.ELOAN, loan.getId());

        if (!existing.isEmpty()) {
            PaymentRequest pr = existing.get(0);
            pr.setStatus(PaymentRequestStatus.PAID);
            pr.setTotalPaidAmount(loan.getLoanAmount());
            pr.setRemainingAmount(BigDecimal.ZERO);
            paymentRequestRepository.save(pr);
            log.info("Marked PaymentRequest {} as PAID for loan disbursement {}",
                    pr.getRequestNumber(), loan.getLoanNumber());
        } else {
            // Fallback: create a PAID PaymentRequest if none exists (e.g., for loans approved before this fix)
            log.warn("No existing PaymentRequest found for loan {}. Creating PAID record.", loan.getLoanNumber());
            Employee employee = loan.getEmployee();
            String requestNumber = generatePaymentRequestNumber();
            String employeeName = employee.getFirstName() + " " + employee.getLastName();
            String targetDetails = buildEmployeeTargetDetails(
                employee.getBankName(), employee.getBankAccountNumber(), employee.getWalletNumber());

            PaymentRequest paymentRequest = PaymentRequest.builder()
                .sourceType(PaymentSourceType.ELOAN)
                .sourceId(loan.getId())
                .sourceNumber(loan.getLoanNumber())
                .sourceDescription("Loan Disbursement: " + loan.getLoanNumber() + " - " + loan.getPurpose())
                .targetType(PaymentTargetType.EMPLOYEE)
                .targetId(employee.getId())
                .targetName(employeeName)
                .targetDetails(targetDetails)
                .requestNumber(requestNumber)
                .requestedAmount(loan.getLoanAmount())
                .currency("EGP")
                .description("Loan disbursement to " + employeeName + " - " + loan.getPurpose())
                .status(PaymentRequestStatus.PAID)
                .requestedByUserId(disburserUserId)
                .requestedByUserName(disburserUserName)
                .requestedByDepartment("Finance")
                .requestedAt(LocalDateTime.now())
                .approvedByUserId(disburserUserId)
                .approvedByUserName(disburserUserName)
                .approvedAt(LocalDateTime.now())
                .approvalNotes("Auto-created: Loan " + loan.getLoanNumber() + " disbursed")
                .totalPaidAmount(loan.getLoanAmount())
                .remainingAmount(BigDecimal.ZERO)
                .build();

            paymentRequestRepository.save(paymentRequest);
            log.info("Created PAID PaymentRequest {} for loan disbursement {}", requestNumber, loan.getLoanNumber());
        }
    }

    /**
     * Build employee target details JSON for PaymentRequest
     */
    private String buildEmployeeTargetDetails(String bankName, String bankAccountNumber, String walletNumber) {
        StringBuilder details = new StringBuilder("{");
        boolean hasContent = false;

        if (bankName != null && !bankName.isEmpty()) {
            details.append("\"bankName\":\"").append(bankName).append("\"");
            hasContent = true;
        }
        if (bankAccountNumber != null && !bankAccountNumber.isEmpty()) {
            if (hasContent) details.append(",");
            details.append("\"bankAccountNumber\":\"").append(bankAccountNumber).append("\"");
            hasContent = true;
        }
        if (walletNumber != null && !walletNumber.isEmpty()) {
            if (hasContent) details.append(",");
            details.append("\"walletNumber\":\"").append(walletNumber).append("\"");
        }

        details.append("}");
        return details.toString();
    }

    /**
     * Generate payment request number for loan disbursements
     */
    private String generatePaymentRequestNumber() {
        int year = LocalDate.now().getYear();
        String prefix = "PR-" + year + "-";
        Long maxSequence = paymentRequestRepository.getMaxRequestNumberSequence(prefix + "%");
        long nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        return String.format("%s%06d", prefix, nextSequence);
    }

    /**
     * Set disbursement source
     */
    @Transactional
    public LoanFinanceRequestDTO setDisbursementSource(LoanFinanceActionDTO.SetDisbursementSourceRequest request,
                                                        String updatedBy) {
        log.info("Setting disbursement source for request {}", request.getRequestId());

        LoanFinanceRequest financeRequest = loanFinanceRequestRepository.findById(request.getRequestId())
            .orElseThrow(() -> new ResourceNotFoundException("Finance request not found"));

        financeRequest.markReadyForDisbursement(
            request.getPaymentSourceType(),
            request.getPaymentSourceId(),
            request.getPaymentSourceName()
        );

        LoanFinanceRequest saved = loanFinanceRequestRepository.save(financeRequest);
        log.info("Set disbursement source for loan request: {}", saved.getRequestNumber());

        return LoanFinanceRequestDTO.fromEntity(saved);
    }

    /**
     * Get Finance dashboard summary
     */
    public LoanFinanceActionDTO.DashboardSummary getFinanceDashboardSummary() {
        long pendingCount = loanFinanceRequestRepository.countByStatus(LoanFinanceRequest.RequestStatus.PENDING);
        long underReviewCount = loanFinanceRequestRepository.countByStatus(LoanFinanceRequest.RequestStatus.UNDER_REVIEW);
        long approvedCount = loanFinanceRequestRepository.countByStatus(LoanFinanceRequest.RequestStatus.APPROVED);
        long pendingDisbursementCount = loanFinanceRequestRepository.countByStatus(LoanFinanceRequest.RequestStatus.DISBURSEMENT_PENDING);

        BigDecimal totalPendingAmount = loanFinanceRequestRepository.sumLoanAmountByStatus(LoanFinanceRequest.RequestStatus.PENDING);
        BigDecimal totalApprovedAmount = loanFinanceRequestRepository.sumLoanAmountByStatus(LoanFinanceRequest.RequestStatus.APPROVED)
            .add(loanFinanceRequestRepository.sumLoanAmountByStatus(LoanFinanceRequest.RequestStatus.DISBURSEMENT_PENDING));

        // Get disbursed this month
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = LocalDate.now().plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);
        List<LoanFinanceRequest> disbursedThisMonth = loanFinanceRequestRepository
            .findDisbursedInDateRange(startOfMonth, endOfMonth);
        BigDecimal totalDisbursedThisMonth = disbursedThisMonth.stream()
            .map(LoanFinanceRequest::getLoanAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return LoanFinanceActionDTO.DashboardSummary.builder()
            .pendingCount(pendingCount)
            .underReviewCount(underReviewCount)
            .approvedCount(approvedCount)
            .pendingDisbursementCount(pendingDisbursementCount)
            .totalPendingAmount(totalPendingAmount)
            .totalApprovedAmount(totalApprovedAmount)
            .totalDisbursedThisMonth(totalDisbursedThisMonth)
            .build();
    }

    // ===================================================
    // LOAN COMPLETION
    // ===================================================

    /**
     * Record loan payment (called during payroll processing)
     */
    @Transactional
    public void recordLoanPayment(UUID loanId, BigDecimal paymentAmount) {
        log.info("Recording loan payment: {} for loan {}", paymentAmount, loanId);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        loan.recordPayment(paymentAmount);
        loanRepository.save(loan);

        // If loan completed, deactivate the deduction
        if (loan.getStatus() == Loan.LoanStatus.COMPLETED) {
            employeeDeductionService.deactivateLoanDeduction(loanId, "SYSTEM");
            log.info("Loan {} completed, deactivated payroll deduction", loan.getLoanNumber());
        }
    }

    /**
     * Cancel a loan
     */
    @Transactional
    public LoanDTO cancelLoan(UUID loanId, String cancelledBy, String reason) {
        log.info("Cancelling loan {} by {}", loanId, cancelledBy);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        loan.cancel();
        loan.setNotes((loan.getNotes() != null ? loan.getNotes() + "\n" : "") + "Cancelled: " + reason);
        loan.setUpdatedBy(cancelledBy);
        Loan saved = loanRepository.save(loan);

        // Cancel finance request if exists
        loanFinanceRequestRepository.findByLoanId(loanId)
            .ifPresent(request -> {
                request.cancel(null, cancelledBy, reason);
                loanFinanceRequestRepository.save(request);
            });

        // Deactivate deduction if exists
        employeeDeductionService.deactivateLoanDeduction(loanId, cancelledBy);

        log.info("Cancelled loan: {}", saved.getLoanNumber());
        return LoanDTO.fromEntity(saved);
    }

    // ===================================================
    // HELPER METHODS
    // ===================================================

    private String generateFinanceRequestNumber() {
        int year = LocalDate.now().getYear();
        String yearPrefix = "LFR-" + year + "-%";
        Long maxSequence = loanFinanceRequestRepository.getMaxRequestNumberSequence(yearPrefix);
        long nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        return LoanFinanceRequest.generateRequestNumber(year, nextSequence);
    }

    private BigDecimal getMonthlySalary(Employee employee) {
        JobPosition jobPosition = employee.getJobPosition();
        if (jobPosition == null) {
            return BigDecimal.ZERO;
        }

        if (jobPosition.getContractType() == JobPosition.ContractType.MONTHLY) {
            Double monthlySalary = jobPosition.getMonthlyBaseSalary();
            return monthlySalary != null ? BigDecimal.valueOf(monthlySalary) : BigDecimal.ZERO;
        } else if (jobPosition.getContractType() == JobPosition.ContractType.DAILY) {
            // Estimate monthly as daily * 22 working days
            Double dailyRate = jobPosition.getDailyRate();
            return dailyRate != null ? BigDecimal.valueOf(dailyRate).multiply(BigDecimal.valueOf(22)) : BigDecimal.ZERO;
        } else if (jobPosition.getContractType() == JobPosition.ContractType.HOURLY) {
            // Estimate monthly as hourly * 8 hours * 22 working days
            Double hourlyRate = jobPosition.getHourlyRate();
            return hourlyRate != null ? BigDecimal.valueOf(hourlyRate).multiply(BigDecimal.valueOf(8 * 22)) : BigDecimal.ZERO;
        }

        return BigDecimal.ZERO;
    }
}
