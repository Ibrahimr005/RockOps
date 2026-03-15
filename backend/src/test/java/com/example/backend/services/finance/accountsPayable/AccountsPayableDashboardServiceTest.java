package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.AccountsPayableDashboardSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.BalanceSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.MerchantPaymentSummaryResponseDTO;
import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentSourceType;
import com.example.backend.models.finance.accountsPayable.PaymentTargetType;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.repositories.finance.accountsPayable.AccountPayablePaymentRepository;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AccountsPayableDashboardServiceTest {

    @Mock
    private OfferFinancialReviewRepository offerFinancialReviewRepository;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private AccountPayablePaymentRepository paymentRepository;

    @Mock
    private BankAccountRepository bankAccountRepository;

    @Mock
    private CashSafeRepository cashSafeRepository;

    @Mock
    private CashWithPersonRepository cashWithPersonRepository;

    @InjectMocks
    private AccountsPayableDashboardService dashboardService;

    // ==================== getDashboardSummary ====================

    @Test
    public void getDashboardSummary_withData_shouldReturnCorrectCounts() {
        BankAccount bank = createBankAccount(BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));
        CashSafe safe = createCashSafe(BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));
        CashWithPerson person = createCashWithPerson(BigDecimal.valueOf(1000), BigDecimal.valueOf(800));

        when(offerFinancialReviewRepository.count()).thenReturn(3L);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PENDING)).thenReturn(5L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PENDING)).thenReturn(25000.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.APPROVED)).thenReturn(2L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.APPROVED)).thenReturn(10000.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(1L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(3000.0);
        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(bankAccountRepository.findAll()).thenReturn(List.of(bank));
        when(cashSafeRepository.findAll()).thenReturn(List.of(safe));
        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person));

        AccountsPayableDashboardSummaryResponseDTO result = dashboardService.getDashboardSummary();

        assertNotNull(result);
        assertEquals(3L, result.getPendingOffersCount());
        assertEquals(5L, result.getPendingPaymentRequestsCount());
        assertEquals(BigDecimal.valueOf(25000.0), result.getPendingPaymentRequestsAmount());
        // readyToPayCount = approved + partiallyPaid = 2 + 1 = 3
        assertEquals(3L, result.getReadyToPayCount());
        assertEquals(0L, result.getPaidTodayCount());
    }

    @Test
    public void getDashboardSummary_withNullAmountsFromRepo_shouldDefaultToZero() {
        BankAccount bank = createBankAccount(BigDecimal.valueOf(1000), BigDecimal.valueOf(1000));
        CashSafe safe = createCashSafe(BigDecimal.valueOf(500), BigDecimal.valueOf(500));
        CashWithPerson person = createCashWithPerson(BigDecimal.valueOf(200), BigDecimal.valueOf(200));

        when(offerFinancialReviewRepository.count()).thenReturn(0L);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PENDING)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PENDING)).thenReturn(0.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.APPROVED)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.APPROVED)).thenReturn(0.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(0.0);
        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(bankAccountRepository.findAll()).thenReturn(List.of(bank));
        when(cashSafeRepository.findAll()).thenReturn(List.of(safe));
        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person));

        // Should not throw even when sums are null
        AccountsPayableDashboardSummaryResponseDTO result = dashboardService.getDashboardSummary();

        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(0.0), result.getPendingPaymentRequestsAmount());
        assertEquals(BigDecimal.valueOf(0.0), result.getReadyToPayAmount());
    }

    @Test
    public void getDashboardSummary_withTodayPayments_shouldSumPaidTodayAmountCorrectly() {
        BankAccount bank = createBankAccount(BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));
        CashSafe safe = createCashSafe(BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));
        CashWithPerson person = createCashWithPerson(BigDecimal.valueOf(1000), BigDecimal.valueOf(800));

        AccountPayablePayment pay1 = createCompletedPayment(BigDecimal.valueOf(300));
        AccountPayablePayment pay2 = createCompletedPayment(BigDecimal.valueOf(700));

        when(offerFinancialReviewRepository.count()).thenReturn(0L);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PENDING)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PENDING)).thenReturn(0.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.APPROVED)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.APPROVED)).thenReturn(0.0);
        when(paymentRequestRepository.countByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(PaymentRequestStatus.PARTIALLY_PAID)).thenReturn(0.0);
        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class))).thenReturn(List.of(pay1, pay2));
        when(bankAccountRepository.findAll()).thenReturn(List.of(bank));
        when(cashSafeRepository.findAll()).thenReturn(List.of(safe));
        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person));

        AccountsPayableDashboardSummaryResponseDTO result = dashboardService.getDashboardSummary();

        assertNotNull(result);
        assertEquals(2L, result.getPaidTodayCount());
        // 300 + 700 = 1000
        assertEquals(BigDecimal.valueOf(1000.0), result.getPaidTodayAmount());
    }

    @Test
    public void getDashboardSummary_shouldComputeTotalAndAvailableBalanceAcrossAllAccounts() {
        BankAccount bank = createBankAccount(BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));
        CashSafe safe = createCashSafe(BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));
        CashWithPerson person = createCashWithPerson(BigDecimal.valueOf(1000), BigDecimal.valueOf(800));

        when(offerFinancialReviewRepository.count()).thenReturn(0L);
        when(paymentRequestRepository.countByStatus(any())).thenReturn(0L);
        when(paymentRequestRepository.sumAmountByStatus(any())).thenReturn(0.0);
        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(bankAccountRepository.findAll()).thenReturn(List.of(bank));
        when(cashSafeRepository.findAll()).thenReturn(List.of(safe));
        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person));

        AccountsPayableDashboardSummaryResponseDTO result = dashboardService.getDashboardSummary();

        assertNotNull(result);
        // totalBalance = 5000 + 2000 + 1000 = 8000
        assertEquals(0, BigDecimal.valueOf(8000).compareTo(result.getTotalBalance()));
        // availableBalance = 4000 (bank active) + 1500 (safe active) + 800 (person active) = 6300
        assertEquals(0, BigDecimal.valueOf(6300).compareTo(result.getAvailableBalance()));
    }

    // ==================== getBalanceSummary ====================

    @Test
    public void getBalanceSummary_withAllAccountTypes_shouldReturnCorrectTotalsAndCounts() {
        BankAccount bank1 = createBankAccount(BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));
        BankAccount bank2 = createBankAccount(BigDecimal.valueOf(3000), BigDecimal.valueOf(2500));
        bank2.setIsActive(false); // inactive bank

        CashSafe safe1 = createCashSafe(BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));
        CashWithPerson person1 = createCashWithPerson(BigDecimal.valueOf(1000), BigDecimal.valueOf(800));

        when(bankAccountRepository.findAll()).thenReturn(List.of(bank1, bank2));
        when(cashSafeRepository.findAll()).thenReturn(List.of(safe1));
        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person1));

        BalanceSummaryResponseDTO result = dashboardService.getBalanceSummary();

        assertNotNull(result);
        // bankAccountsBalance = 5000 + 3000 = 8000
        assertEquals(0, BigDecimal.valueOf(8000).compareTo(result.getBankAccountsBalance()));
        assertEquals(0, BigDecimal.valueOf(2000).compareTo(result.getCashSafesBalance()));
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(result.getCashWithPersonsBalance()));
        // totalBalance = 8000 + 2000 + 1000 = 11000
        assertEquals(0, BigDecimal.valueOf(11000).compareTo(result.getTotalBalance()));
        assertEquals(2L, result.getTotalBankAccounts());
        assertEquals(1L, result.getTotalCashSafes());
        assertEquals(1L, result.getTotalCashWithPersons());
        // Only bank1 is active
        assertEquals(1L, result.getActiveBankAccounts());
        assertEquals(1L, result.getActiveCashSafes());
        assertEquals(1L, result.getActiveCashWithPersons());
    }

    @Test
    public void getBalanceSummary_withNoAccounts_shouldReturnZeroBalancesAndCounts() {
        when(bankAccountRepository.findAll()).thenReturn(Collections.emptyList());
        when(cashSafeRepository.findAll()).thenReturn(Collections.emptyList());
        when(cashWithPersonRepository.findAll()).thenReturn(Collections.emptyList());

        BalanceSummaryResponseDTO result = dashboardService.getBalanceSummary();

        assertNotNull(result);
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getBankAccountsBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getCashSafesBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getCashWithPersonsBalance()));
        assertEquals(0L, result.getTotalBankAccounts());
        assertEquals(0L, result.getTotalCashSafes());
        assertEquals(0L, result.getTotalCashWithPersons());
        assertEquals(0L, result.getActiveBankAccounts());
        assertEquals(0L, result.getActiveCashSafes());
        assertEquals(0L, result.getActiveCashWithPersons());
    }

    @Test
    public void getBalanceSummary_availableBalanceShouldSumOnlyActiveAccounts() {
        // Active bank: availableBalance = 4000
        BankAccount activeBank = createBankAccount(BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));
        // Inactive bank: should be excluded from available balance calculation
        BankAccount inactiveBank = createBankAccount(BigDecimal.valueOf(3000), BigDecimal.valueOf(2500));
        inactiveBank.setIsActive(false);

        when(bankAccountRepository.findAll()).thenReturn(List.of(activeBank, inactiveBank));
        when(cashSafeRepository.findAll()).thenReturn(Collections.emptyList());
        when(cashWithPersonRepository.findAll()).thenReturn(Collections.emptyList());

        BalanceSummaryResponseDTO result = dashboardService.getBalanceSummary();

        assertNotNull(result);
        // availableBalance should only include the active bank's available balance (4000)
        assertEquals(0, BigDecimal.valueOf(4000).compareTo(result.getAvailableBalance()));
        // reservedBalance = totalBalance - availableBalance = (5000+3000) - 4000 = 4000
        assertEquals(0, BigDecimal.valueOf(4000).compareTo(result.getReservedBalance()));
    }

    // ==================== getMerchantPaymentSummaries ====================

    @Test
    public void getMerchantPaymentSummaries_withNoPayments_shouldReturnEmptyList() {
        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(Collections.emptyList());

        List<MerchantPaymentSummaryResponseDTO> result = dashboardService.getMerchantPaymentSummaries();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(paymentRepository, times(1)).findByStatus(PaymentStatus.COMPLETED);
    }

    @Test
    public void getMerchantPaymentSummaries_withPaymentsHavingNoMerchant_shouldReturnEmptyList() {
        // Payments without a paidToMerchant are filtered out during grouping
        AccountPayablePayment payment = createCompletedPayment(BigDecimal.valueOf(500));
        payment.setPaidToMerchant(null);

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(payment));

        List<MerchantPaymentSummaryResponseDTO> result = dashboardService.getMerchantPaymentSummaries();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getMerchantPaymentSummaries_withSingleMerchant_shouldReturnOneSummary() {
        Merchant merchant = createMerchant("Alpha Supplier");

        AccountPayablePayment pay1 = createCompletedPaymentForMerchant(BigDecimal.valueOf(1000), merchant, LocalDate.now().minusDays(2));
        AccountPayablePayment pay2 = createCompletedPaymentForMerchant(BigDecimal.valueOf(500), merchant, LocalDate.now().minusDays(1));

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(pay1, pay2));

        List<MerchantPaymentSummaryResponseDTO> result = dashboardService.getMerchantPaymentSummaries();

        assertNotNull(result);
        assertEquals(1, result.size());

        MerchantPaymentSummaryResponseDTO summary = result.get(0);
        assertEquals(merchant.getId(), summary.getMerchantId());
        assertEquals("Alpha Supplier", summary.getMerchantName());
        assertEquals(2L, summary.getNumberOfPayments());
        // totalPaid = 1000 + 500 = 1500
        assertEquals(0, BigDecimal.valueOf(1500).compareTo(summary.getTotalPaid()));
        // lastPaymentDate should be the most recent one
        assertEquals(LocalDate.now().minusDays(1), summary.getLastPaymentDate());
        assertEquals(0, BigDecimal.valueOf(500).compareTo(summary.getLastPaymentAmount()));
    }

    @Test
    public void getMerchantPaymentSummaries_withMultipleMerchants_shouldReturnOneSummaryPerMerchantSortedByTotalPaidDesc() {
        Merchant merchantA = createMerchant("Merchant A");
        Merchant merchantB = createMerchant("Merchant B");

        // Merchant A: 3000 total
        AccountPayablePayment payA1 = createCompletedPaymentForMerchant(BigDecimal.valueOf(2000), merchantA, LocalDate.now().minusDays(5));
        AccountPayablePayment payA2 = createCompletedPaymentForMerchant(BigDecimal.valueOf(1000), merchantA, LocalDate.now().minusDays(1));
        // Merchant B: 500 total
        AccountPayablePayment payB1 = createCompletedPaymentForMerchant(BigDecimal.valueOf(500), merchantB, LocalDate.now().minusDays(3));

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED))
                .thenReturn(List.of(payA1, payA2, payB1));

        List<MerchantPaymentSummaryResponseDTO> result = dashboardService.getMerchantPaymentSummaries();

        assertNotNull(result);
        assertEquals(2, result.size());
        // Sorted descending by totalPaid — Merchant A (3000) should be first
        assertEquals(merchantA.getId(), result.get(0).getMerchantId());
        assertEquals(0, BigDecimal.valueOf(3000).compareTo(result.get(0).getTotalPaid()));
        assertEquals(merchantB.getId(), result.get(1).getMerchantId());
        assertEquals(0, BigDecimal.valueOf(500).compareTo(result.get(1).getTotalPaid()));
    }

    @Test
    public void getMerchantPaymentSummaries_singlePaymentPerMerchant_lastPaymentShouldMatchThatPayment() {
        Merchant merchant = createMerchant("Solo Merchant");
        LocalDate paymentDate = LocalDate.now().minusDays(7);
        AccountPayablePayment payment = createCompletedPaymentForMerchant(BigDecimal.valueOf(750), merchant, paymentDate);

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(payment));

        List<MerchantPaymentSummaryResponseDTO> result = dashboardService.getMerchantPaymentSummaries();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(paymentDate, result.get(0).getLastPaymentDate());
        assertEquals(0, BigDecimal.valueOf(750).compareTo(result.get(0).getLastPaymentAmount()));
        assertEquals(1L, result.get(0).getNumberOfPayments());
    }

    // ==================== Helper Methods ====================

    private BankAccount createBankAccount(BigDecimal currentBalance, BigDecimal availableBalance) {
        BankAccount bank = new BankAccount();
        bank.setId(UUID.randomUUID());
        bank.setBankName("Test Bank");
        bank.setAccountNumber("ACC-" + UUID.randomUUID().toString().substring(0, 6));
        bank.setAccountHolderName("Test Company");
        bank.setCurrentBalance(currentBalance);
        bank.setAvailableBalance(availableBalance);
        bank.setTotalBalance(currentBalance);
        bank.setReservedBalance(BigDecimal.ZERO);
        bank.setIsActive(true);
        return bank;
    }

    private CashSafe createCashSafe(BigDecimal currentBalance, BigDecimal availableBalance) {
        CashSafe safe = new CashSafe();
        safe.setId(UUID.randomUUID());
        safe.setSafeName("Main Safe");
        safe.setLocation("Head Office");
        safe.setCurrentBalance(currentBalance);
        safe.setAvailableBalance(availableBalance);
        safe.setTotalBalance(currentBalance);
        safe.setReservedBalance(BigDecimal.ZERO);
        safe.setIsActive(true);
        return safe;
    }

    private CashWithPerson createCashWithPerson(BigDecimal currentBalance, BigDecimal availableBalance) {
        CashWithPerson person = new CashWithPerson();
        person.setId(UUID.randomUUID());
        person.setPersonName("Test Cashier");
        person.setCurrentBalance(currentBalance);
        person.setAvailableBalance(availableBalance);
        person.setTotalBalance(currentBalance);
        person.setReservedBalance(BigDecimal.ZERO);
        person.setIsActive(true);
        return person;
    }

    private PaymentRequest createPaymentRequest(PaymentRequestStatus status) {
        PaymentRequest pr = new PaymentRequest();
        pr.setId(UUID.randomUUID());
        pr.setRequestNumber("PR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        pr.setStatus(status);
        pr.setRequestedAmount(BigDecimal.valueOf(1000));
        pr.setTotalPaidAmount(BigDecimal.ZERO);
        pr.setRemainingAmount(BigDecimal.valueOf(1000));
        pr.setCurrency("USD");
        pr.setSourceType(PaymentSourceType.PURCHASE_ORDER);
        pr.setTargetType(PaymentTargetType.MERCHANT);
        pr.setPaymentRequestItems(new ArrayList<>());
        pr.setPayments(new ArrayList<>());
        pr.setStatusHistory(new ArrayList<>());
        return pr;
    }

    private AccountPayablePayment createCompletedPayment(BigDecimal amount) {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID);
        AccountPayablePayment payment = AccountPayablePayment.builder()
                .id(UUID.randomUUID())
                .paymentNumber("PAY-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .paymentRequest(pr)
                .amount(amount)
                .currency("USD")
                .paymentDate(LocalDate.now())
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .processedByUserId(UUID.randomUUID())
                .processedByUserName("processor")
                .processedAt(LocalDateTime.now())
                .status(PaymentStatus.COMPLETED)
                .build();
        return payment;
    }

    private AccountPayablePayment createCompletedPaymentForMerchant(
            BigDecimal amount, Merchant merchant, LocalDate paymentDate) {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID);
        AccountPayablePayment payment = AccountPayablePayment.builder()
                .id(UUID.randomUUID())
                .paymentNumber("PAY-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .paymentRequest(pr)
                .amount(amount)
                .currency("USD")
                .paymentDate(paymentDate)
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paidToMerchant(merchant)
                .paidToName(merchant.getName())
                .processedByUserId(UUID.randomUUID())
                .processedByUserName("processor")
                .processedAt(LocalDateTime.now())
                .status(PaymentStatus.COMPLETED)
                .build();
        return payment;
    }

    private Merchant createMerchant(String name) {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName(name);
        merchant.setContactPersonName("Contact Person");
        merchant.setContactPhone("0501234567");
        merchant.setContactEmail("contact@" + name.toLowerCase().replace(" ", "") + ".com");
        return merchant;
    }
}