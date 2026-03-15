package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.FinancialTransactionResponseDTO;
import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.FinancialTransaction;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.models.finance.accountsPayable.enums.TransactionStatus;
import com.example.backend.models.finance.accountsPayable.enums.TransactionType;
import com.example.backend.repositories.finance.accountsPayable.FinancialTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FinancialTransactionServiceTest {

    @Mock
    private FinancialTransactionRepository transactionRepository;

    @InjectMocks
    private FinancialTransactionService financialTransactionService;

    // ==================== createPaymentTransaction ====================

    @Test
    public void createPaymentTransaction_validPayment_shouldSaveTransactionAndReturnDTO() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(1500), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        FinancialTransactionResponseDTO result = financialTransactionService.createPaymentTransaction(payment);

        assertNotNull(result);
        verify(transactionRepository, times(1)).save(any(FinancialTransaction.class));
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldSetTransactionTypeToPayment() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertEquals(TransactionType.PAYMENT, captor.getValue().getTransactionType());
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldSetSourceTypeToPayment() {
        AccountPayablePayment payment = buildPayment(AccountType.CASH_SAFE, BigDecimal.valueOf(200), "EGP");
        FinancialTransaction saved = buildSavedTransaction(payment, 2L);

        when(transactionRepository.count()).thenReturn(1L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertEquals("payment", captor.getValue().getSourceType());
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldMapPaymentFieldsToTransaction() {
        UUID paymentId = UUID.randomUUID();
        UUID processorId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        AccountPayablePayment payment = buildPaymentWithIds(
                paymentId, processorId, accountId, AccountType.BANK_ACCOUNT, BigDecimal.valueOf(750), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 3L);

        when(transactionRepository.count()).thenReturn(2L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        FinancialTransaction captured = captor.getValue();
        assertEquals(paymentId, captured.getSourceId());
        assertEquals(AccountType.BANK_ACCOUNT, captured.getDebitAccountType());
        assertEquals(accountId, captured.getDebitAccountId());
        assertEquals(BigDecimal.valueOf(750), captured.getAmount());
        assertEquals("USD", captured.getCurrency());
        assertEquals(processorId, captured.getCreatedByUserId());
        assertEquals("processor-name", captured.getCreatedByUserName());
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldSetCreditAccountFieldsToNull() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(1000), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertNull(captor.getValue().getCreditAccountType());
        assertNull(captor.getValue().getCreditAccountId());
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldSetStatusToCompleted() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(300), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertEquals(TransactionStatus.COMPLETED, captor.getValue().getStatus());
    }

    @Test
    public void createPaymentTransaction_validPayment_shouldGenerateTransactionNumberWithTxnPrefix() {
        AccountPayablePayment payment = buildPayment(AccountType.CASH_WITH_PERSON, BigDecimal.valueOf(100), "EGP");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertTrue(captor.getValue().getTransactionNumber().startsWith("TXN-"),
                "Transaction number should start with 'TXN-'");
    }

    @Test
    public void createPaymentTransaction_withExistingTransactions_shouldIncrementSequenceNumber() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 6L);

        when(transactionRepository.count()).thenReturn(5L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        // count()=5, so sequence = 6, zero-padded to 4 digits
        assertTrue(captor.getValue().getTransactionNumber().endsWith("0006"),
                "Transaction number should end with '0006' when repository count is 5");
    }

    @Test
    public void createPaymentTransaction_shouldBuildDescriptionContainingPaymentNumberAndMerchantName() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(1000), "USD");
        payment.setPaymentNumber("PAY-2024-0001");
        payment.setPaidToName("ACME Corp");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        String description = captor.getValue().getDescription();
        assertNotNull(description);
        assertTrue(description.contains("PAY-2024-0001"), "Description should contain the payment number");
        assertTrue(description.contains("ACME Corp"), "Description should contain the merchant name");
    }

    @Test
    public void createPaymentTransaction_shouldReturnDTOWithIdFromSavedEntity() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        UUID expectedId = UUID.randomUUID();
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);
        saved.setId(expectedId);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        FinancialTransactionResponseDTO result = financialTransactionService.createPaymentTransaction(payment);

        assertEquals(expectedId, result.getId());
    }

    @Test
    public void createPaymentTransaction_shouldReturnDTOWithTransactionTypePayment() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        FinancialTransactionResponseDTO result = financialTransactionService.createPaymentTransaction(payment);

        assertEquals(TransactionType.PAYMENT, result.getTransactionType());
    }

    @Test
    public void createPaymentTransaction_shouldReturnDTOWithNullAccountNames() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        FinancialTransactionResponseDTO result = financialTransactionService.createPaymentTransaction(payment);

        assertNull(result.getDebitAccountName(), "Debit account name is not populated and should be null");
        assertNull(result.getCreditAccountName(), "Credit account name is not populated and should be null");
    }

    @Test
    public void createPaymentTransaction_shouldReturnDTOWithReversedByTransactionId() {
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        UUID reversalId = UUID.randomUUID();
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);
        saved.setReversedByTransactionId(reversalId);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        FinancialTransactionResponseDTO result = financialTransactionService.createPaymentTransaction(payment);

        assertEquals(reversalId, result.getReversedByTransactionId());
    }

    @Test
    public void createPaymentTransaction_shouldSetTransactionDateFromPaymentDate() {
        LocalDate paymentDate = LocalDate.of(2024, 6, 15);
        AccountPayablePayment payment = buildPayment(AccountType.BANK_ACCOUNT, BigDecimal.valueOf(500), "USD");
        payment.setPaymentDate(paymentDate);
        FinancialTransaction saved = buildSavedTransaction(payment, 1L);
        saved.setTransactionDate(paymentDate);

        when(transactionRepository.count()).thenReturn(0L);
        when(transactionRepository.save(any(FinancialTransaction.class))).thenReturn(saved);

        ArgumentCaptor<FinancialTransaction> captor = ArgumentCaptor.forClass(FinancialTransaction.class);
        financialTransactionService.createPaymentTransaction(payment);

        verify(transactionRepository).save(captor.capture());
        assertEquals(paymentDate, captor.getValue().getTransactionDate());
    }

    // ==================== getTransactionsByAccount ====================

    @Test
    public void getTransactionsByAccount_withExistingTransactions_shouldReturnDTOList() {
        UUID accountId = UUID.randomUUID();
        AccountType accountType = AccountType.BANK_ACCOUNT;
        FinancialTransaction t1 = buildStandaloneTransaction(UUID.randomUUID(), accountType, accountId);
        FinancialTransaction t2 = buildStandaloneTransaction(UUID.randomUUID(), accountType, accountId);

        when(transactionRepository.findByAccount(accountType, accountId)).thenReturn(List.of(t1, t2));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByAccount(accountId, accountType);

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(transactionRepository, times(1)).findByAccount(accountType, accountId);
    }

    @Test
    public void getTransactionsByAccount_withNoTransactions_shouldReturnEmptyList() {
        UUID accountId = UUID.randomUUID();
        AccountType accountType = AccountType.CASH_SAFE;

        when(transactionRepository.findByAccount(accountType, accountId)).thenReturn(Collections.emptyList());

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByAccount(accountId, accountType);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getTransactionsByAccount_shouldPassCorrectAccountTypeAndIdToRepository() {
        UUID accountId = UUID.randomUUID();
        AccountType accountType = AccountType.CASH_WITH_PERSON;

        when(transactionRepository.findByAccount(accountType, accountId)).thenReturn(Collections.emptyList());

        financialTransactionService.getTransactionsByAccount(accountId, accountType);

        verify(transactionRepository, times(1)).findByAccount(accountType, accountId);
        verify(transactionRepository, never()).findByAccount(eq(AccountType.BANK_ACCOUNT), any());
        verify(transactionRepository, never()).findByAccount(eq(AccountType.CASH_SAFE), any());
    }

    @Test
    public void getTransactionsByAccount_shouldMapTransactionFieldsToDTOCorrectly() {
        UUID accountId = UUID.randomUUID();
        AccountType accountType = AccountType.BANK_ACCOUNT;
        UUID txnId = UUID.randomUUID();
        FinancialTransaction transaction = buildStandaloneTransaction(txnId, accountType, accountId);
        transaction.setAmount(BigDecimal.valueOf(999));
        transaction.setCurrency("EGP");
        transaction.setStatus(TransactionStatus.COMPLETED);

        when(transactionRepository.findByAccount(accountType, accountId)).thenReturn(List.of(transaction));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByAccount(accountId, accountType);

        assertEquals(1, result.size());
        FinancialTransactionResponseDTO dto = result.get(0);
        assertEquals(txnId, dto.getId());
        assertEquals(BigDecimal.valueOf(999), dto.getAmount());
        assertEquals("EGP", dto.getCurrency());
        assertEquals(TransactionStatus.COMPLETED, dto.getStatus());
    }

    @Test
    public void getTransactionsByAccount_withCashSafeAccountType_shouldQueryWithCashSafeType() {
        UUID accountId = UUID.randomUUID();
        AccountType accountType = AccountType.CASH_SAFE;
        FinancialTransaction t = buildStandaloneTransaction(UUID.randomUUID(), accountType, accountId);

        when(transactionRepository.findByAccount(AccountType.CASH_SAFE, accountId)).thenReturn(List.of(t));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByAccount(accountId, AccountType.CASH_SAFE);

        assertEquals(1, result.size());
        verify(transactionRepository).findByAccount(AccountType.CASH_SAFE, accountId);
    }

    // ==================== getRecentTransactions ====================

    @Test
    public void getRecentTransactions_withLimit_shouldReturnDTOList() {
        int limit = 5;
        FinancialTransaction t1 = buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID());
        FinancialTransaction t2 = buildStandaloneTransaction(UUID.randomUUID(), AccountType.CASH_SAFE, UUID.randomUUID());

        when(transactionRepository.findRecentCompletedTransactions(limit)).thenReturn(List.of(t1, t2));

        List<FinancialTransactionResponseDTO> result = financialTransactionService.getRecentTransactions(limit);

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(transactionRepository, times(1)).findRecentCompletedTransactions(limit);
    }

    @Test
    public void getRecentTransactions_withNoRecentTransactions_shouldReturnEmptyList() {
        when(transactionRepository.findRecentCompletedTransactions(10)).thenReturn(Collections.emptyList());

        List<FinancialTransactionResponseDTO> result = financialTransactionService.getRecentTransactions(10);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getRecentTransactions_shouldPassExactLimitToRepository() {
        int limit = 3;
        when(transactionRepository.findRecentCompletedTransactions(limit)).thenReturn(Collections.emptyList());

        financialTransactionService.getRecentTransactions(limit);

        verify(transactionRepository, times(1)).findRecentCompletedTransactions(limit);
        verify(transactionRepository, never()).findRecentCompletedTransactions(limit + 1);
        verify(transactionRepository, never()).findRecentCompletedTransactions(limit - 1);
    }

    @Test
    public void getRecentTransactions_withLimitOfOne_shouldReturnSingleItemList() {
        FinancialTransaction transaction = buildStandaloneTransaction(
                UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID());

        when(transactionRepository.findRecentCompletedTransactions(1)).thenReturn(List.of(transaction));

        List<FinancialTransactionResponseDTO> result = financialTransactionService.getRecentTransactions(1);

        assertEquals(1, result.size());
    }

    @Test
    public void getRecentTransactions_shouldMapAllTransactionsToDTO() {
        int limit = 20;
        List<FinancialTransaction> transactions = List.of(
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID()),
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.CASH_SAFE, UUID.randomUUID()),
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.CASH_WITH_PERSON, UUID.randomUUID())
        );

        when(transactionRepository.findRecentCompletedTransactions(limit)).thenReturn(transactions);

        List<FinancialTransactionResponseDTO> result = financialTransactionService.getRecentTransactions(limit);

        assertEquals(3, result.size());
    }

    // ==================== getTransactionsByDateRange ====================

    @Test
    public void getTransactionsByDateRange_withTransactionsInRange_shouldReturnDTOList() {
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end = LocalDate.of(2024, 1, 31);
        FinancialTransaction t1 = buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID());
        t1.setTransactionDate(LocalDate.of(2024, 1, 15));

        when(transactionRepository.findByTransactionDateBetween(start, end)).thenReturn(List.of(t1));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByDateRange(start, end);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(transactionRepository, times(1)).findByTransactionDateBetween(start, end);
    }

    @Test
    public void getTransactionsByDateRange_withNoTransactionsInRange_shouldReturnEmptyList() {
        LocalDate start = LocalDate.of(2024, 6, 1);
        LocalDate end = LocalDate.of(2024, 6, 30);

        when(transactionRepository.findByTransactionDateBetween(start, end)).thenReturn(Collections.emptyList());

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByDateRange(start, end);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getTransactionsByDateRange_shouldPassExactStartAndEndDatesToRepository() {
        LocalDate start = LocalDate.of(2024, 3, 1);
        LocalDate end = LocalDate.of(2024, 3, 31);

        when(transactionRepository.findByTransactionDateBetween(start, end)).thenReturn(Collections.emptyList());

        financialTransactionService.getTransactionsByDateRange(start, end);

        verify(transactionRepository, times(1)).findByTransactionDateBetween(start, end);
    }

    @Test
    public void getTransactionsByDateRange_withMultipleTransactions_shouldConvertAllToDTO() {
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end = LocalDate.of(2024, 12, 31);

        List<FinancialTransaction> transactions = List.of(
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID()),
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.CASH_SAFE, UUID.randomUUID()),
                buildStandaloneTransaction(UUID.randomUUID(), AccountType.CASH_WITH_PERSON, UUID.randomUUID())
        );

        when(transactionRepository.findByTransactionDateBetween(start, end)).thenReturn(transactions);

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByDateRange(start, end);

        assertEquals(3, result.size());
    }

    @Test
    public void getTransactionsByDateRange_singleDayRange_shouldReturnTransactionForThatDay() {
        LocalDate singleDay = LocalDate.of(2024, 5, 15);
        FinancialTransaction t = buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID());
        t.setTransactionDate(singleDay);

        when(transactionRepository.findByTransactionDateBetween(singleDay, singleDay)).thenReturn(List.of(t));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByDateRange(singleDay, singleDay);

        assertEquals(1, result.size());
    }

    @Test
    public void getTransactionsByDateRange_shouldMapTransactionDateToDTO() {
        LocalDate start = LocalDate.of(2024, 4, 1);
        LocalDate end = LocalDate.of(2024, 4, 30);
        LocalDate txnDate = LocalDate.of(2024, 4, 10);

        FinancialTransaction t = buildStandaloneTransaction(UUID.randomUUID(), AccountType.BANK_ACCOUNT, UUID.randomUUID());
        t.setTransactionDate(txnDate);

        when(transactionRepository.findByTransactionDateBetween(start, end)).thenReturn(List.of(t));

        List<FinancialTransactionResponseDTO> result =
                financialTransactionService.getTransactionsByDateRange(start, end);

        assertEquals(txnDate, result.get(0).getTransactionDate());
    }

    // ==================== Helper Methods ====================

    private AccountPayablePayment buildPayment(AccountType accountType, BigDecimal amount, String currency) {
        return buildPaymentWithIds(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), accountType, amount, currency);
    }

    private AccountPayablePayment buildPaymentWithIds(
            UUID paymentId,
            UUID processorId,
            UUID accountId,
            AccountType accountType,
            BigDecimal amount,
            String currency) {
        AccountPayablePayment payment = AccountPayablePayment.builder()
                .id(paymentId)
                .paymentNumber("PAY-TEST-0001")
                .amount(amount)
                .currency(currency)
                .paymentDate(LocalDate.now())
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(accountId)
                .paymentAccountType(accountType)
                .paidToName("Test Merchant")
                .processedByUserId(processorId)
                .processedByUserName("processor-name")
                .processedAt(LocalDateTime.now())
                .status(PaymentStatus.COMPLETED)
                .build();
        return payment;
    }

    private FinancialTransaction buildSavedTransaction(AccountPayablePayment payment, long sequence) {
        String date = LocalDate.now().toString().replace("-", "");
        String txnNumber = String.format("TXN-%s-%04d", date, sequence);

        return FinancialTransaction.builder()
                .id(UUID.randomUUID())
                .transactionNumber(txnNumber)
                .transactionType(TransactionType.PAYMENT)
                .sourceType("payment")
                .sourceId(payment.getId())
                .debitAccountType(payment.getPaymentAccountType())
                .debitAccountId(payment.getPaymentAccountId())
                .creditAccountType(null)
                .creditAccountId(null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .description("Payment " + payment.getPaymentNumber() + " to " + payment.getPaidToName())
                .transactionDate(payment.getPaymentDate())
                .createdByUserId(payment.getProcessedByUserId())
                .createdByUserName(payment.getProcessedByUserName())
                .status(TransactionStatus.COMPLETED)
                .build();
    }

    private FinancialTransaction buildStandaloneTransaction(UUID id, AccountType accountType, UUID accountId) {
        return FinancialTransaction.builder()
                .id(id)
                .transactionNumber("TXN-20240101-0001")
                .transactionType(TransactionType.PAYMENT)
                .sourceType("payment")
                .sourceId(UUID.randomUUID())
                .debitAccountType(accountType)
                .debitAccountId(accountId)
                .creditAccountType(null)
                .creditAccountId(null)
                .amount(BigDecimal.valueOf(500))
                .currency("USD")
                .description("Test Transaction")
                .transactionDate(LocalDate.now())
                .createdByUserId(UUID.randomUUID())
                .createdByUserName("test-user")
                .status(TransactionStatus.COMPLETED)
                .build();
    }
}