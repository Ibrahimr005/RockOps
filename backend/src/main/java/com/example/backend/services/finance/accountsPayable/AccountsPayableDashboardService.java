package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.BalanceSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.AccountsPayableDashboardSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.MerchantPaymentSummaryResponseDTO;
import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.AccountPayablePaymentRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AccountsPayableDashboardService {

    private final OfferFinancialReviewRepository offerFinancialReviewRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final AccountPayablePaymentRepository paymentRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CashSafeRepository cashSafeRepository;
    private final CashWithPersonRepository cashWithPersonRepository;

    @Autowired
    public AccountsPayableDashboardService(
            OfferFinancialReviewRepository offerFinancialReviewRepository,
            PaymentRequestRepository paymentRequestRepository,
            AccountPayablePaymentRepository paymentRepository,
            BankAccountRepository bankAccountRepository,
            CashSafeRepository cashSafeRepository,
            CashWithPersonRepository cashWithPersonRepository) {
        this.offerFinancialReviewRepository = offerFinancialReviewRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.paymentRepository = paymentRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.cashSafeRepository = cashSafeRepository;
        this.cashWithPersonRepository = cashWithPersonRepository;
    }

    /**
     * Get dashboard summary (6 cards + recent activity)
     */
    public AccountsPayableDashboardSummaryResponseDTO getDashboardSummary() {
        // 1. Pending Offers Count
        long pendingOffersCount = offerFinancialReviewRepository.count(); // This should filter by pending status
        Double pendingOffersAmount = 0.0; // Calculate from pending offers

        // 2. Pending Payment Requests
        long pendingPaymentRequestsCount = paymentRequestRepository.countByStatus(PaymentRequestStatus.PENDING);
        Double pendingPaymentRequestsAmount = paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PENDING);

        // 3. Ready to Pay (Approved + Partially Paid)
        long readyToPayCount = paymentRequestRepository.countByStatus(PaymentRequestStatus.APPROVED) +
                paymentRequestRepository.countByStatus(PaymentRequestStatus.PARTIALLY_PAID);
        Double readyToPayAmount = paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.APPROVED) +
                paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PARTIALLY_PAID);

        // 4. Paid Today
        List<AccountPayablePayment> todayPayments =
                paymentRepository.findPaymentsMadeToday(LocalDate.now());
        long paidTodayCount = todayPayments.size();
        Double paidTodayAmount = todayPayments.stream()
                .map(p -> p.getAmount().doubleValue())
                .reduce(0.0, Double::sum);

        // 5. Available Balance
        BigDecimal availableBalance = calculateTotalAvailableBalance();

        // 6. Total Balance
        BigDecimal totalBalance = calculateTotalBalance();

        return AccountsPayableDashboardSummaryResponseDTO.builder()
                .pendingOffersCount(pendingOffersCount)
                .pendingOffersAmount(BigDecimal.valueOf(pendingOffersAmount != null ? pendingOffersAmount : 0.0))
                .pendingPaymentRequestsCount(pendingPaymentRequestsCount)
                .pendingPaymentRequestsAmount(BigDecimal.valueOf(pendingPaymentRequestsAmount != null ? pendingPaymentRequestsAmount : 0.0))
                .readyToPayCount(readyToPayCount)
                .readyToPayAmount(BigDecimal.valueOf(readyToPayAmount != null ? readyToPayAmount : 0.0))
                .paidTodayCount(paidTodayCount)
                .paidTodayAmount(BigDecimal.valueOf(paidTodayAmount))
                .availableBalance(availableBalance)
                .totalBalance(totalBalance)
                .build();
    }

    /**
     * Get balance summary (overview of all accounts)
     */
    public BalanceSummaryResponseDTO getBalanceSummary() {
        // Bank Accounts
        List<com.example.backend.models.finance.balances.BankAccount> bankAccounts = bankAccountRepository.findAll();
        BigDecimal bankAccountsBalance = bankAccounts.stream()
                .map(acc -> acc.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalBankAccounts = bankAccounts.size();
        long activeBankAccounts = bankAccounts.stream().filter(acc -> acc.getIsActive()).count();

        // Cash Safes
        List<com.example.backend.models.finance.balances.CashSafe> cashSafes = cashSafeRepository.findAll();
        BigDecimal cashSafesBalance = cashSafes.stream()
                .map(safe -> safe.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalCashSafes = cashSafes.size();
        long activeCashSafes = cashSafes.stream().filter(safe -> safe.getIsActive()).count();

        // Cash With Persons
        List<com.example.backend.models.finance.balances.CashWithPerson> cashWithPersons = cashWithPersonRepository.findAll();
        BigDecimal cashWithPersonsBalance = cashWithPersons.stream()
                .map(person -> person.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalCashWithPersons = cashWithPersons.size();
        long activeCashWithPersons = cashWithPersons.stream().filter(person -> person.getIsActive()).count();

        // Totals
        BigDecimal totalBalance = bankAccountsBalance.add(cashSafesBalance).add(cashWithPersonsBalance);
        BigDecimal availableBalance = calculateTotalAvailableBalance();
        BigDecimal reservedBalance = totalBalance.subtract(availableBalance);

        return BalanceSummaryResponseDTO.builder()
                .totalBalance(totalBalance)
                .availableBalance(availableBalance)
                .reservedBalance(reservedBalance)
                .bankAccountsBalance(bankAccountsBalance)
                .cashSafesBalance(cashSafesBalance)
                .cashWithPersonsBalance(cashWithPersonsBalance)
                .totalBankAccounts(totalBankAccounts)
                .totalCashSafes(totalCashSafes)
                .totalCashWithPersons(totalCashWithPersons)
                .activeBankAccounts(activeBankAccounts)
                .activeCashSafes(activeCashSafes)
                .activeCashWithPersons(activeCashWithPersons)
                .build();
    }

    /**
     * Get merchant payment summary (for "By Merchant" page)
     */
    public List<MerchantPaymentSummaryResponseDTO> getMerchantPaymentSummaries() {
        // Get all payments grouped by merchant
        List<AccountPayablePayment> allPayments =
                paymentRepository.findByStatus(PaymentStatus.COMPLETED);

        // Group by merchant
        Map<java.util.UUID, List<AccountPayablePayment>> paymentsByMerchant =
                allPayments.stream()
                        .filter(p -> p.getPaidToMerchant() != null)
                        .collect(Collectors.groupingBy(p -> p.getPaidToMerchant().getId()));

        List<MerchantPaymentSummaryResponseDTO> summaries = new ArrayList<>();

        for (Map.Entry<java.util.UUID, List<AccountPayablePayment>> entry : paymentsByMerchant.entrySet()) {
            java.util.UUID merchantId = entry.getKey();
            List<AccountPayablePayment> merchantPayments = entry.getValue();

            BigDecimal totalPaid = merchantPayments.stream()
                    .map(AccountPayablePayment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            AccountPayablePayment lastPayment = merchantPayments.stream()
                    .max((p1, p2) -> p1.getPaymentDate().compareTo(p2.getPaymentDate()))
                    .orElse(null);

            String merchantName = merchantPayments.get(0).getPaidToName();

            MerchantPaymentSummaryResponseDTO summary = MerchantPaymentSummaryResponseDTO.builder()
                    .merchantId(merchantId)
                    .merchantName(merchantName)
                    .totalPaid(totalPaid)
                    .numberOfPayments((long) merchantPayments.size())
                    .lastPaymentDate(lastPayment != null ? lastPayment.getPaymentDate() : null)
                    .lastPaymentAmount(lastPayment != null ? lastPayment.getAmount() : null)
                    .build();

            summaries.add(summary);
        }

        // Sort by total paid descending
        summaries.sort((s1, s2) -> s2.getTotalPaid().compareTo(s1.getTotalPaid()));

        return summaries;
    }

    // ================== Helper Methods ==================

    private BigDecimal calculateTotalAvailableBalance() {
        BigDecimal bankBalance = bankAccountRepository.findAll().stream()
                .filter(acc -> acc.getIsActive())
                .map(acc -> acc.getAvailableBalance() != null ? acc.getAvailableBalance() : acc.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal safeBalance = cashSafeRepository.findAll().stream()
                .filter(safe -> safe.getIsActive())
                .map(safe -> safe.getAvailableBalance() != null ? safe.getAvailableBalance() : safe.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal personBalance = cashWithPersonRepository.findAll().stream()
                .filter(person -> person.getIsActive())
                .map(person -> person.getAvailableBalance() != null ? person.getAvailableBalance() : person.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return bankBalance.add(safeBalance).add(personBalance);
    }

    private BigDecimal calculateTotalBalance() {
        BigDecimal bankBalance = bankAccountRepository.findAll().stream()
                .map(acc -> acc.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal safeBalance = cashSafeRepository.findAll().stream()
                .map(safe -> safe.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal personBalance = cashWithPersonRepository.findAll().stream()
                .map(person -> person.getCurrentBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return bankBalance.add(safeBalance).add(personBalance);
    }
}