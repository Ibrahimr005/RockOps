package com.example.backend.services.finance.loans;

import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.finance.loans.CompanyLoan;
import com.example.backend.models.finance.loans.FinancialInstitution;
import com.example.backend.models.finance.loans.LoanInstallment;
import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.loans.LoanInstallmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LoanPaymentRequestService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final LoanInstallmentRepository installmentRepository;

    /**
     * Generate payment request number - same format as PaymentRequestService
     * Format: PR-YYYYMMDD-XXXX
     */
    private String generatePaymentRequestNumber() {
        String date = LocalDate.now().toString().replace("-", "");
        int randomNum = new Random().nextInt(10000);
        return String.format("PR-%s-%04d", date, randomNum);
    }

    /**
     * Create payment requests for all installments of a loan
     */
    public void createPaymentRequestsForLoan(CompanyLoan loan, String createdBy) {
        log.info("Creating payment requests for loan: {}", loan.getLoanNumber());

        FinancialInstitution institution = loan.getFinancialInstitution();

        for (LoanInstallment installment : loan.getInstallments()) {
            PaymentRequest paymentRequest = createPaymentRequestForInstallment(
                    loan, installment, institution, createdBy);

            // Link payment request to installment
            installment.setPaymentRequestId(paymentRequest.getId());
            installment.setStatus(LoanInstallmentStatus.PAYMENT_REQUEST_CREATED);
            installmentRepository.save(installment);
        }

        log.info("Created {} payment requests for loan {}", loan.getInstallments().size(), loan.getLoanNumber());
    }

    /**
     * Create a payment request for a single installment
     */
    private PaymentRequest createPaymentRequestForInstallment(
            CompanyLoan loan,
            LoanInstallment installment,
            FinancialInstitution institution,
            String createdBy) {

        // Generate PR number using the same format as other payment requests
        String requestNumber = generatePaymentRequestNumber();

        String description = String.format("Loan Payment: %s - Installment %d/%d",
                loan.getLoanNumber(),
                installment.getInstallmentNumber(),
                loan.getTotalInstallments());

        PaymentRequest paymentRequest = PaymentRequest.builder()
                .requestNumber(requestNumber)
                .loanInstallment(installment)
                .financialInstitution(institution)
                // ADD: Source polymorphism
                .sourceType("COMPANY_LOANS")
                .sourceId(loan.getId())
                .sourceNumber(loan.getLoanNumber())
                .sourceDescription(description)
                // ADD: Target polymorphism
                .targetType("FINANCIAL_INSTITUTION")
                .targetId(institution.getId())
                .targetName(institution.getName())
                .targetDetails(buildInstitutionTargetDetails(institution))
                .requestedAmount(installment.getTotalAmount())
                .currency(loan.getCurrency())
                .description(description)
                .status(PaymentRequestStatus.APPROVED)
                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
                .requestedByUserName(createdBy)
                .requestedByDepartment("Finance")
                .requestedAt(LocalDateTime.now())
                .approvedAt(LocalDateTime.now())
                .approvedByUserName("System - Loan Creation")
                .approvalNotes("Auto-approved upon loan creation")
                .paymentDueDate(installment.getDueDate())
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(installment.getTotalAmount())
                // Institution info (denormalized for display)
                .institutionName(institution.getName())
                .institutionAccountNumber(institution.getPaymentAccountNumber())
                .institutionBankName(institution.getPaymentBankName())
                .institutionContactPerson(institution.getContactPersonName())
                .institutionContactPhone(institution.getContactPersonPhone())
                .institutionContactEmail(institution.getContactPersonEmail())
                .build();

        PaymentRequest saved = paymentRequestRepository.save(paymentRequest);
        log.debug("Created payment request {} for installment {}", requestNumber, installment.getInstallmentNumber());

        return saved;
    }

    private String buildInstitutionTargetDetails(FinancialInstitution institution) {
        if (institution == null) return null;
        StringBuilder details = new StringBuilder();
        details.append("{");
        details.append("\"type\":\"FINANCIAL_INSTITUTION\"");
        if (institution.getPaymentAccountNumber() != null) {
            details.append(",\"accountNumber\":\"").append(institution.getPaymentAccountNumber()).append("\"");
        }
        if (institution.getPaymentBankName() != null) {
            details.append(",\"bankName\":\"").append(institution.getPaymentBankName()).append("\"");
        }
        if (institution.getContactPersonName() != null) {
            details.append(",\"contactPerson\":\"").append(institution.getContactPersonName()).append("\"");
        }
        if (institution.getContactPersonPhone() != null) {
            details.append(",\"phone\":\"").append(institution.getContactPersonPhone()).append("\"");
        }
        if (institution.getContactPersonEmail() != null) {
            details.append(",\"email\":\"").append(institution.getContactPersonEmail()).append("\"");
        }
        details.append("}");
        return details.toString();
    }

    /**
     * Handle payment completion - update installment and loan
     */
    public void handlePaymentCompletion(UUID paymentRequestId, BigDecimal paidAmount) {
        log.info("Handling payment completion for request: {}", paymentRequestId);

        LoanInstallment installment = installmentRepository.findByPaymentRequestId(paymentRequestId)
                .orElse(null);

        if (installment == null) {
            log.debug("Payment request {} is not for a loan installment", paymentRequestId);
            return;
        }

        // Update installment
        installment.processPayment(paidAmount);
        installmentRepository.save(installment);

        // Update loan
        CompanyLoan loan = installment.getCompanyLoan();
        BigDecimal principalPortion = installment.getPrincipalPortion(paidAmount);
        BigDecimal interestPortion = installment.getInterestPortion(paidAmount);
        loan.processInstallmentPayment(principalPortion, interestPortion);

        log.info("Updated installment {} and loan {}. Remaining principal: {}",
                installment.getInstallmentNumber(), loan.getLoanNumber(), loan.getRemainingPrincipal());
    }
}