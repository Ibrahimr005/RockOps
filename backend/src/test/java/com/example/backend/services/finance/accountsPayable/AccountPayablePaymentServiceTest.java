package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.AccountPayablePaymentResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ProcessPaymentRequestDTO;
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
import com.example.backend.repositories.finance.accountsPayable.AccountPayablePaymentRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.dto.finance.accountsPayable.FinancialTransactionResponseDTO;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.services.finance.loans.LoanPaymentRequestService;
import com.example.backend.services.procurement.PurchaseOrderService;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AccountPayablePaymentServiceTest {

    @Mock
    private AccountPayablePaymentRepository paymentRepository;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private BankAccountRepository bankAccountRepository;

    @Mock
    private CashSafeRepository cashSafeRepository;

    @Mock
    private CashWithPersonRepository cashWithPersonRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PaymentRequestService paymentRequestService;

    @Mock
    private FinancialTransactionService financialTransactionService;

    @Mock
    private LoanPaymentRequestService loanPaymentRequestService;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @InjectMocks
    private AccountPayablePaymentService accountPayablePaymentService;

    // ==================== processPayment ====================

    @Test
    public void processPayment_paymentRequestNotFound_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.valueOf(500), AccountType.BANK_ACCOUNT);

        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("Payment Request not found"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    public void processPayment_paymentRequestStatusIsPending_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.valueOf(500), AccountType.BANK_ACCOUNT);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PENDING, BigDecimal.valueOf(1000));
        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("APPROVED or PARTIALLY_PAID"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    public void processPayment_paymentRequestStatusIsRejected_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.valueOf(500), AccountType.BANK_ACCOUNT);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.REJECTED, BigDecimal.valueOf(1000));
        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("APPROVED or PARTIALLY_PAID"));
    }

    @Test
    public void processPayment_amountIsZero_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.ZERO, AccountType.BANK_ACCOUNT);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("greater than zero"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    public void processPayment_amountIsNegative_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.valueOf(-100), AccountType.BANK_ACCOUNT);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("greater than zero"));
    }

    @Test
    public void processPayment_amountExceedsRemainingAmount_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        // Request to pay 1500 but only 1000 remaining
        ProcessPaymentRequestDTO request = buildProcessPaymentDTO(prId, BigDecimal.valueOf(1500), AccountType.BANK_ACCOUNT);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("cannot exceed remaining amount"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    public void processPayment_insufficientBankBalance_shouldThrowRuntimeException() {
        UUID prId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        // Request to pay 500 but bank only has 200
        ProcessPaymentRequestDTO request = buildProcessPaymentDTOWithAccount(
                prId, BigDecimal.valueOf(500), AccountType.BANK_ACCOUNT, accountId);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        BankAccount bank = createBankAccount(accountId, BigDecimal.valueOf(200), BigDecimal.valueOf(200));

        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bank));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.processPayment(request, UUID.randomUUID(), "processor"));

        assertTrue(ex.getMessage().contains("Insufficient balance"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    public void processPayment_happyPath_bankAccount_shouldSavePaymentAndUpdateBalances() {
        UUID prId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        UUID processorId = UUID.randomUUID();

        ProcessPaymentRequestDTO request = buildProcessPaymentDTOWithAccount(
                prId, BigDecimal.valueOf(500), AccountType.BANK_ACCOUNT, accountId);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        // No purchase order on this request (simpler path)
        pr.setPurchaseOrder(null);

        BankAccount bank = createBankAccount(accountId, BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));

        AccountPayablePayment savedPayment = createSavedPayment(pr, BigDecimal.valueOf(500));

        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));
        // getAccountBalance uses first findById call; getAccountName uses second; updateAccountBalance uses third
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bank));
        when(paymentRepository.count()).thenReturn(0L);
        when(paymentRepository.save(any(AccountPayablePayment.class))).thenReturn(savedPayment);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(bank);
        doNothing().when(paymentRequestService)
                .updatePaymentRequestAfterPayment(eq(pr.getId()), any(BigDecimal.class));
        when(financialTransactionService.createPaymentTransaction(any(AccountPayablePayment.class)))
                .thenReturn(new FinancialTransactionResponseDTO());

        AccountPayablePaymentResponseDTO result =
                accountPayablePaymentService.processPayment(request, processorId, "processor");

        assertNotNull(result);
        verify(paymentRepository, times(1)).save(any(AccountPayablePayment.class));
        verify(bankAccountRepository, atLeastOnce()).save(any(BankAccount.class));
        verify(paymentRequestService, times(1))
                .updatePaymentRequestAfterPayment(eq(pr.getId()), eq(BigDecimal.valueOf(500)));
        verify(financialTransactionService, times(1))
                .createPaymentTransaction(any(AccountPayablePayment.class));
    }

    @Test
    public void processPayment_happyPath_cashSafe_shouldSavePaymentAndUpdateSafeBalance() {
        UUID prId = UUID.randomUUID();
        UUID safeId = UUID.randomUUID();
        UUID processorId = UUID.randomUUID();

        ProcessPaymentRequestDTO request = buildProcessPaymentDTOWithAccount(
                prId, BigDecimal.valueOf(300), AccountType.CASH_SAFE, safeId);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED, BigDecimal.valueOf(1000));
        pr.setPurchaseOrder(null);

        CashSafe safe = createCashSafe(safeId, BigDecimal.valueOf(1000), BigDecimal.valueOf(800));
        AccountPayablePayment savedPayment = createSavedPayment(pr, BigDecimal.valueOf(300));

        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));
        when(cashSafeRepository.findById(safeId)).thenReturn(Optional.of(safe));
        when(paymentRepository.count()).thenReturn(5L);
        when(paymentRepository.save(any(AccountPayablePayment.class))).thenReturn(savedPayment);
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(safe);
        doNothing().when(paymentRequestService)
                .updatePaymentRequestAfterPayment(eq(pr.getId()), any(BigDecimal.class));
        when(financialTransactionService.createPaymentTransaction(any(AccountPayablePayment.class)))
                .thenReturn(new FinancialTransactionResponseDTO());

        AccountPayablePaymentResponseDTO result =
                accountPayablePaymentService.processPayment(request, processorId, "processor");

        assertNotNull(result);
        verify(cashSafeRepository, atLeastOnce()).save(any(CashSafe.class));
    }

    @Test
    public void processPayment_happyPath_cashWithPerson_shouldSavePaymentAndUpdatePersonBalance() {
        UUID prId = UUID.randomUUID();
        UUID personId = UUID.randomUUID();
        UUID processorId = UUID.randomUUID();

        ProcessPaymentRequestDTO request = buildProcessPaymentDTOWithAccount(
                prId, BigDecimal.valueOf(200), AccountType.CASH_WITH_PERSON, personId);

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PARTIALLY_PAID, BigDecimal.valueOf(800));
        pr.setTotalPaidAmount(BigDecimal.valueOf(200));
        pr.setPurchaseOrder(null);

        CashWithPerson person = createCashWithPerson(personId, BigDecimal.valueOf(500), BigDecimal.valueOf(400));
        AccountPayablePayment savedPayment = createSavedPayment(pr, BigDecimal.valueOf(200));

        when(paymentRequestRepository.findById(prId)).thenReturn(Optional.of(pr));
        when(cashWithPersonRepository.findById(personId)).thenReturn(Optional.of(person));
        when(paymentRepository.count()).thenReturn(10L);
        when(paymentRepository.save(any(AccountPayablePayment.class))).thenReturn(savedPayment);
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(person);
        doNothing().when(paymentRequestService)
                .updatePaymentRequestAfterPayment(eq(pr.getId()), any(BigDecimal.class));
        when(financialTransactionService.createPaymentTransaction(any(AccountPayablePayment.class)))
                .thenReturn(new FinancialTransactionResponseDTO());

        AccountPayablePaymentResponseDTO result =
                accountPayablePaymentService.processPayment(request, processorId, "processor");

        assertNotNull(result);
        verify(cashWithPersonRepository, atLeastOnce()).save(any(CashWithPerson.class));
    }

    // ==================== getPaymentById ====================

    @Test
    public void getPaymentById_paymentExists_shouldReturnDTO() {
        UUID paymentId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID, BigDecimal.valueOf(1000));
        AccountPayablePayment payment = createSavedPayment(pr, BigDecimal.valueOf(1000));
        payment.setId(paymentId);
        payment.setPaymentAccountId(accountId);
        payment.setPaymentAccountType(AccountType.BANK_ACCOUNT);

        BankAccount bank = createBankAccount(accountId, BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bank));

        AccountPayablePaymentResponseDTO result =
                accountPayablePaymentService.getPaymentById(paymentId);

        assertNotNull(result);
        verify(paymentRepository, times(1)).findById(paymentId);
    }

    @Test
    public void getPaymentById_paymentNotFound_shouldThrowRuntimeException() {
        UUID paymentId = UUID.randomUUID();

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                accountPayablePaymentService.getPaymentById(paymentId));

        assertTrue(ex.getMessage().contains("Payment not found"));
        verify(paymentRepository, times(1)).findById(paymentId);
    }

    // ==================== getPaymentsByPaymentRequest ====================

    @Test
    public void getPaymentsByPaymentRequest_withExistingPayments_shouldReturnDTOList() {
        UUID prId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID, BigDecimal.valueOf(1000));
        AccountPayablePayment p1 = createSavedPayment(pr, BigDecimal.valueOf(500));
        p1.setPaymentAccountId(accountId);
        p1.setPaymentAccountType(AccountType.BANK_ACCOUNT);
        AccountPayablePayment p2 = createSavedPayment(pr, BigDecimal.valueOf(500));
        p2.setPaymentAccountId(accountId);
        p2.setPaymentAccountType(AccountType.BANK_ACCOUNT);

        BankAccount bank = createBankAccount(accountId, BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));

        when(paymentRepository.findByPaymentRequestId(prId)).thenReturn(List.of(p1, p2));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bank));

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsByPaymentRequest(prId);

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(paymentRepository, times(1)).findByPaymentRequestId(prId);
    }

    @Test
    public void getPaymentsByPaymentRequest_withNoPayments_shouldReturnEmptyList() {
        UUID prId = UUID.randomUUID();

        when(paymentRepository.findByPaymentRequestId(prId)).thenReturn(Collections.emptyList());

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsByPaymentRequest(prId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getPaymentsMadeToday ====================

    @Test
    public void getPaymentsMadeToday_withTodayPayments_shouldReturnDTOList() {
        UUID accountId = UUID.randomUUID();
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID, BigDecimal.valueOf(1000));
        AccountPayablePayment payment = createSavedPayment(pr, BigDecimal.valueOf(1000));
        payment.setPaymentAccountId(accountId);
        payment.setPaymentAccountType(AccountType.CASH_SAFE);

        CashSafe safe = createCashSafe(accountId, BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));

        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class))).thenReturn(List.of(payment));
        when(cashSafeRepository.findById(accountId)).thenReturn(Optional.of(safe));

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsMadeToday();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(paymentRepository, times(1)).findPaymentsMadeToday(any(LocalDate.class));
    }

    @Test
    public void getPaymentsMadeToday_withNoPaymentsToday_shouldReturnEmptyList() {
        when(paymentRepository.findPaymentsMadeToday(any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsMadeToday();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getPaymentsByMerchant ====================

    @Test
    public void getPaymentsByMerchant_withPayments_shouldReturnDTOList() {
        UUID merchantId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID, BigDecimal.valueOf(1000));
        AccountPayablePayment payment = createSavedPayment(pr, BigDecimal.valueOf(1000));
        payment.setPaymentAccountId(accountId);
        payment.setPaymentAccountType(AccountType.CASH_WITH_PERSON);

        CashWithPerson person = createCashWithPerson(accountId, BigDecimal.valueOf(2000), BigDecimal.valueOf(1500));

        when(paymentRepository.findByMerchantId(merchantId)).thenReturn(List.of(payment));
        when(cashWithPersonRepository.findById(accountId)).thenReturn(Optional.of(person));

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsByMerchant(merchantId);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(paymentRepository, times(1)).findByMerchantId(merchantId);
    }

    @Test
    public void getPaymentsByMerchant_withNoPayments_shouldReturnEmptyList() {
        UUID merchantId = UUID.randomUUID();

        when(paymentRepository.findByMerchantId(merchantId)).thenReturn(Collections.emptyList());

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentsByMerchant(merchantId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getPaymentHistory ====================

    @Test
    public void getPaymentHistory_withCompletedPayments_shouldReturnDTOList() {
        UUID accountId = UUID.randomUUID();
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID, BigDecimal.valueOf(1000));
        AccountPayablePayment payment = createSavedPayment(pr, BigDecimal.valueOf(1000));
        payment.setPaymentAccountId(accountId);
        payment.setPaymentAccountType(AccountType.BANK_ACCOUNT);

        BankAccount bank = createBankAccount(accountId, BigDecimal.valueOf(5000), BigDecimal.valueOf(4000));

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(payment));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bank));

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentHistory();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(paymentRepository, times(1)).findByStatus(PaymentStatus.COMPLETED);
    }

    @Test
    public void getPaymentHistory_withNoCompletedPayments_shouldReturnEmptyList() {
        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(Collections.emptyList());

        List<AccountPayablePaymentResponseDTO> result =
                accountPayablePaymentService.getPaymentHistory();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getPaymentHistory_shouldQueryOnlyCompletedStatus() {
        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(Collections.emptyList());

        accountPayablePaymentService.getPaymentHistory();

        // Must query only COMPLETED, never any other status
        verify(paymentRepository, times(1)).findByStatus(PaymentStatus.COMPLETED);
        verify(paymentRepository, never()).findByStatus(PaymentStatus.FAILED);
        verify(paymentRepository, never()).findByStatus(PaymentStatus.PENDING);
    }

    // ==================== Helper Methods ====================

    private ProcessPaymentRequestDTO buildProcessPaymentDTO(UUID prId, BigDecimal amount, AccountType accountType) {
        return buildProcessPaymentDTOWithAccount(prId, amount, accountType, UUID.randomUUID());
    }

    private ProcessPaymentRequestDTO buildProcessPaymentDTOWithAccount(
            UUID prId, BigDecimal amount, AccountType accountType, UUID accountId) {
        ProcessPaymentRequestDTO dto = new ProcessPaymentRequestDTO();
        dto.setPaymentRequestId(prId);
        dto.setAmount(amount);
        dto.setPaymentMethod(PaymentMethod.BANK_ACCOUNT);
        dto.setPaymentAccountId(accountId);
        dto.setPaymentAccountType(accountType);
        dto.setPaymentDate(LocalDate.now());
        dto.setTransactionReference("TXN-TEST-001");
        dto.setNotes("Test payment");
        return dto;
    }

    private PaymentRequest createPaymentRequest(PaymentRequestStatus status, BigDecimal remainingAmount) {
        PaymentRequest pr = new PaymentRequest();
        pr.setId(UUID.randomUUID());
        pr.setRequestNumber("PR-TEST-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        pr.setStatus(status);
        pr.setRequestedAmount(BigDecimal.valueOf(1000));
        pr.setTotalPaidAmount(BigDecimal.valueOf(1000).subtract(remainingAmount));
        pr.setRemainingAmount(remainingAmount);
        pr.setCurrency("USD");
        pr.setMerchantName("Test Merchant");
        pr.setSourceType(PaymentSourceType.PURCHASE_ORDER);
        pr.setTargetType(PaymentTargetType.MERCHANT);
        pr.setPaymentRequestItems(new ArrayList<>());
        pr.setPayments(new ArrayList<>());
        pr.setStatusHistory(new ArrayList<>());
        return pr;
    }

    private AccountPayablePayment createSavedPayment(PaymentRequest pr, BigDecimal amount) {
        AccountPayablePayment payment = AccountPayablePayment.builder()
                .id(UUID.randomUUID())
                .paymentNumber("PAY-TEST-0001")
                .paymentRequest(pr)
                .amount(amount)
                .currency("USD")
                .paymentDate(LocalDate.now())
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paidToName("Test Merchant")
                .processedByUserId(UUID.randomUUID())
                .processedByUserName("processor")
                .processedAt(LocalDateTime.now())
                .status(PaymentStatus.COMPLETED)
                .build();
        return payment;
    }

    private BankAccount createBankAccount(UUID id, BigDecimal currentBalance, BigDecimal availableBalance) {
        BankAccount bank = new BankAccount();
        bank.setId(id);
        bank.setBankName("Test Bank");
        bank.setAccountNumber("ACC-001");
        bank.setAccountHolderName("Test Company");
        bank.setCurrentBalance(currentBalance);
        bank.setAvailableBalance(availableBalance);
        bank.setTotalBalance(currentBalance);
        bank.setReservedBalance(BigDecimal.ZERO);
        bank.setIsActive(true);
        return bank;
    }

    private CashSafe createCashSafe(UUID id, BigDecimal currentBalance, BigDecimal availableBalance) {
        CashSafe safe = new CashSafe();
        safe.setId(id);
        safe.setSafeName("Main Safe");
        safe.setLocation("Head Office");
        safe.setCurrentBalance(currentBalance);
        safe.setAvailableBalance(availableBalance);
        safe.setTotalBalance(currentBalance);
        safe.setReservedBalance(BigDecimal.ZERO);
        safe.setIsActive(true);
        return safe;
    }

    private CashWithPerson createCashWithPerson(UUID id, BigDecimal currentBalance, BigDecimal availableBalance) {
        CashWithPerson person = new CashWithPerson();
        person.setId(id);
        person.setPersonName("Test Cashier");
        person.setCurrentBalance(currentBalance);
        person.setAvailableBalance(availableBalance);
        person.setTotalBalance(currentBalance);
        person.setReservedBalance(BigDecimal.ZERO);
        person.setIsActive(true);
        return person;
    }
}