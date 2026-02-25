package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanResolutionRequestDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.LoanResolutionRequest;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.repositories.payroll.LoanResolutionRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanResolutionRequestService {

    private final LoanResolutionRequestRepository resolutionRepository;
    private final LoanRepository loanRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDeductionService employeeDeductionService;

    /**
     * Create a new loan resolution request
     */
    @Transactional
    public LoanResolutionRequestDTO createRequest(UUID loanId, String reason, String createdBy) {
        log.info("Creating loan resolution request for loan {} by {}", loanId, createdBy);

        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new ResourceNotFoundException("Loan not found: " + loanId));

        // Validate loan is in a resolvable state
        if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.DISBURSED) {
            throw new IllegalStateException("Can only resolve loans in ACTIVE or DISBURSED status. Current status: " + loan.getStatus());
        }

        // Check for existing pending resolution
        if (resolutionRepository.existsPendingForLoan(loanId)) {
            throw new IllegalStateException("A resolution request is already pending for this loan");
        }

        Employee employee = loan.getEmployee();

        LoanResolutionRequest request = LoanResolutionRequest.builder()
            .loan(loan)
            .employee(employee)
            .site(employee.getSite())
            .reason(reason)
            .remainingBalance(loan.getRemainingBalance())
            .status(LoanResolutionRequest.ResolutionStatus.PENDING_HR)
            .createdBy(createdBy)
            .build();

        LoanResolutionRequest saved = resolutionRepository.save(request);
        log.info("Created loan resolution request {} for loan {}", saved.getId(), loan.getLoanNumber());

        return LoanResolutionRequestDTO.fromEntity(saved);
    }

    /**
     * Get resolution requests by status
     */
    public List<LoanResolutionRequestDTO> getByStatus(LoanResolutionRequest.ResolutionStatus status) {
        return resolutionRepository.findByStatus(status).stream()
            .map(LoanResolutionRequestDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get resolution requests by status and site
     */
    public List<LoanResolutionRequestDTO> getByStatusAndSite(LoanResolutionRequest.ResolutionStatus status, UUID siteId) {
        return resolutionRepository.findByStatusAndSiteId(status, siteId).stream()
            .map(LoanResolutionRequestDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get resolution history for a loan
     */
    public List<LoanResolutionRequestDTO> getByLoanId(UUID loanId) {
        return resolutionRepository.findByLoanId(loanId).stream()
            .map(LoanResolutionRequestDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get resolution request by ID
     */
    public LoanResolutionRequestDTO getById(UUID id) {
        LoanResolutionRequest request = resolutionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resolution request not found: " + id));
        return LoanResolutionRequestDTO.fromEntity(request);
    }

    /**
     * HR approves or rejects a resolution request
     */
    @Transactional
    public LoanResolutionRequestDTO hrDecision(UUID requestId, boolean approved, String decidedBy) {
        log.info("HR {} resolution request {} by {}", approved ? "approving" : "rejecting", requestId, decidedBy);

        LoanResolutionRequest request = resolutionRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Resolution request not found: " + requestId));

        if (approved) {
            request.hrApprove(decidedBy);
        } else {
            request.hrReject(decidedBy, null);
        }

        LoanResolutionRequest saved = resolutionRepository.save(request);
        log.info("HR {} resolution request {}", approved ? "approved" : "rejected", requestId);

        return LoanResolutionRequestDTO.fromEntity(saved);
    }

    /**
     * HR rejects with reason
     */
    @Transactional
    public LoanResolutionRequestDTO hrReject(UUID requestId, String reason, String decidedBy) {
        log.info("HR rejecting resolution request {} by {}", requestId, decidedBy);

        LoanResolutionRequest request = resolutionRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Resolution request not found: " + requestId));

        request.hrReject(decidedBy, reason);
        LoanResolutionRequest saved = resolutionRepository.save(request);

        return LoanResolutionRequestDTO.fromEntity(saved);
    }

    /**
     * Finance approves or rejects a resolution request
     * If approved, resolves the loan and stops future deductions
     */
    @Transactional
    public LoanResolutionRequestDTO financeDecision(UUID requestId, boolean approved, String decidedBy) {
        log.info("Finance {} resolution request {} by {}", approved ? "approving" : "rejecting", requestId, decidedBy);

        LoanResolutionRequest request = resolutionRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Resolution request not found: " + requestId));

        if (approved) {
            request.financeApprove(decidedBy);
            resolutionRepository.save(request);

            // Resolve the loan
            resolveLoan(request);
        } else {
            request.financeReject(decidedBy, null);
            resolutionRepository.save(request);
        }

        log.info("Finance {} resolution request {}", approved ? "approved" : "rejected", requestId);
        return LoanResolutionRequestDTO.fromEntity(request);
    }

    /**
     * Finance rejects with reason
     */
    @Transactional
    public LoanResolutionRequestDTO financeReject(UUID requestId, String reason, String decidedBy) {
        log.info("Finance rejecting resolution request {} by {}", requestId, decidedBy);

        LoanResolutionRequest request = resolutionRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Resolution request not found: " + requestId));

        request.financeReject(decidedBy, reason);
        LoanResolutionRequest saved = resolutionRepository.save(request);

        return LoanResolutionRequestDTO.fromEntity(saved);
    }

    /**
     * Resolve the loan: mark as RESOLVED, stop all future deductions, persist remaining balance
     */
    private void resolveLoan(LoanResolutionRequest request) {
        Loan loan = request.getLoan();

        log.info("Resolving loan {} with remaining balance {}", loan.getLoanNumber(), request.getRemainingBalance());

        // Mark loan as resolved
        loan.resolve();
        loan.setUpdatedBy("SYSTEM");
        loanRepository.save(loan);

        // Deactivate the loan deduction to stop future payroll deductions
        employeeDeductionService.deactivateLoanDeduction(loan.getId(), "SYSTEM");

        log.info("Loan {} resolved. Remaining balance: {}", loan.getLoanNumber(), request.getRemainingBalance());
    }
}
