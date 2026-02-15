package com.example.backend.services.finance.loans;

import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.repositories.finance.loans.CompanyLoanRepository;
import com.example.backend.repositories.finance.loans.FinancialInstitutionRepository;
import com.example.backend.repositories.finance.loans.LoanInstallmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LoanDashboardService {

    private final CompanyLoanRepository loanRepository;
    private final LoanInstallmentRepository installmentRepository;
    private final FinancialInstitutionRepository institutionRepository;

    /**
     * Get dashboard summary for company loans
     */
    public Map<String, Object> getDashboardSummary() {
        Map<String, Object> summary = new HashMap<>();

        LocalDate today = LocalDate.now();

        // Loan counts by status
        summary.put("activeLoans", loanRepository.countByStatus(CompanyLoanStatus.ACTIVE));
        summary.put("completedLoans", loanRepository.countByStatus(CompanyLoanStatus.COMPLETED));
        summary.put("defaultedLoans", loanRepository.countByStatus(CompanyLoanStatus.DEFAULTED));

        // Financial totals
        summary.put("totalOutstandingPrincipal", loanRepository.getTotalOutstandingPrincipal());
        summary.put("totalActivePrincipal", loanRepository.getTotalPrincipalByStatus(CompanyLoanStatus.ACTIVE));
        summary.put("totalInterestPaid", loanRepository.getTotalInterestPaid());

        // Installment stats
        summary.put("overdueInstallments", installmentRepository.countOverdueInstallments(today));
        summary.put("totalOverdueAmount", installmentRepository.getTotalOverdueAmount(today));
        summary.put("totalAmountDue", installmentRepository.getTotalAmountDue());

        // Upcoming payments (next 30 days)
        summary.put("upcomingPaymentsCount", installmentRepository.findUpcomingInstallments(today, today.plusDays(30)).size());

        // Institution stats
        summary.put("totalInstitutions", institutionRepository.count());
        summary.put("activeInstitutions", institutionRepository.countByIsActiveTrue());

        return summary;
    }

    /**
     * Get loans maturing soon (next 90 days)
     */
    public Map<String, Object> getLoansMaturingSoon() {
        Map<String, Object> result = new HashMap<>();

        LocalDate today = LocalDate.now();
        result.put("next30Days", loanRepository.findLoansMaturingSoon(today, today.plusDays(30)).size());
        result.put("next60Days", loanRepository.findLoansMaturingSoon(today, today.plusDays(60)).size());
        result.put("next90Days", loanRepository.findLoansMaturingSoon(today, today.plusDays(90)).size());

        return result;
    }

    /**
     * Get installments due this month
     */
    public Map<String, Object> getMonthlyInstallmentSummary(int year, int month) {
        Map<String, Object> result = new HashMap<>();

        var installments = installmentRepository.findInstallmentsDueInMonth(year, month);

        result.put("count", installments.size());
        result.put("totalAmount", installments.stream()
                .map(i -> i.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        result.put("installments", installments);

        return result;
    }
}