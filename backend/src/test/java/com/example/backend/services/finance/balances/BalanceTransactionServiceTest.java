package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.BalanceTransactionRequestDTO;
import com.example.backend.dto.finance.balances.BalanceTransactionResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BalanceTransaction;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.dto.finance.balances.BankAccountResponseDTO;
import com.example.backend.dto.finance.balances.CashSafeResponseDTO;
import com.example.backend.dto.finance.balances.CashWithPersonResponseDTO;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.finance.balances.TransactionStatus;
import com.example.backend.models.finance.balances.TransactionType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.finance.balances.BalanceTransactionRepository;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class BalanceTransactionServiceTest {

    @Mock
    private BalanceTransactionRepository balanceTransactionRepository;

    @Mock
    private BankAccountService bankAccountService;

    @Mock
    private CashSafeService cashSafeService;

    @Mock
    private CashWithPersonService cashWithPersonService;

    @Mock
    private BankAccountRepository bankAccountRepository;

    @Mock
    private CashWithPersonRepository cashWithPersonRepository;

    @Mock
    private CashSafeRepository cashSafeRepository;

    @InjectMocks
    private BalanceTransactionService balanceTransactionService;

    // ==================== Helper methods ====================

    private BalanceTransaction buildTransaction(UUID id, TransactionStatus status, TransactionType type,
                                                AccountType accountType, UUID accountId) {
        return BalanceTransaction.builder()
                .id(id)
                .transactionType(type)
                .amount(BigDecimal.valueOf(500))
                .transactionDate(LocalDateTime.now())
                .accountType(accountType)
                .accountId(accountId)
                .status(status)
                .createdBy("user1")
                .build();
    }

    private BalanceTransactionRequestDTO buildRequestDTO(TransactionType type, AccountType accountType) {
        BalanceTransactionRequestDTO dto = new BalanceTransactionRequestDTO();
        dto.setTransactionType(type);
        dto.setAmount(BigDecimal.valueOf(500));
        dto.setAccountType(accountType);
        dto.setAccountId(UUID.randomUUID());
        dto.setDescription("Test transaction");
        return dto;
    }

    private BankAccount buildBankAccount(UUID id) {
        return BankAccount.builder()
                .id(id)
                .bankName("Test Bank")
                .accountNumber("ACC-001")
                .accountHolderName("Test Holder")
                .currentBalance(BigDecimal.valueOf(2000))
                .availableBalance(BigDecimal.valueOf(2000))
                .totalBalance(BigDecimal.valueOf(2000))
                .reservedBalance(BigDecimal.ZERO)
                .isActive(true)
                .build();
    }

    private CashSafe buildCashSafe(UUID id) {
        return CashSafe.builder()
                .id(id)
                .safeName("Main Safe")
                .location("Office")
                .currentBalance(BigDecimal.valueOf(2000))
                .availableBalance(BigDecimal.valueOf(2000))
                .totalBalance(BigDecimal.valueOf(2000))
                .reservedBalance(BigDecimal.ZERO)
                .isActive(true)
                .build();
    }

    private CashWithPerson buildCashWithPerson(UUID id) {
        return CashWithPerson.builder()
                .id(id)
                .personName("John Doe")
                .currentBalance(BigDecimal.valueOf(2000))
                .availableBalance(BigDecimal.valueOf(2000))
                .totalBalance(BigDecimal.valueOf(2000))
                .reservedBalance(BigDecimal.ZERO)
                .isActive(true)
                .build();
    }

    // ==================== createTransaction - auto-approve (ADMIN) ====================

    @Test
    public void createTransaction_adminRole_shouldAutoApproveAndApplyImmediately() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(2000));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.createTransaction(
                requestDTO, "admin1", Role.ADMIN);

        assertNotNull(result);
        verify(balanceTransactionRepository).save(any(BalanceTransaction.class));
        // auto-approve triggers applyTransaction -> addToBalance -> getBalance then updateBalance
        verify(bankAccountService, atLeastOnce()).getBalance(accountId);
        verify(bankAccountService).updateBalance(eq(accountId), any(BigDecimal.class));
    }

    @Test
    public void createTransaction_financeManagerRole_shouldAutoApproveAndApply() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(1000));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.createTransaction(
                requestDTO, "fm1", Role.FINANCE_MANAGER);

        assertNotNull(result);
        verify(bankAccountService).updateBalance(eq(accountId), any(BigDecimal.class));
    }

    @Test
    public void createTransaction_adminRole_shouldSaveTransactionWithApprovedStatusAndApprovedBySet() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);
        savedEntity.setApprovedBy("admin1");

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(1000));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN);

        ArgumentCaptor<BalanceTransaction> captor = ArgumentCaptor.forClass(BalanceTransaction.class);
        verify(balanceTransactionRepository).save(captor.capture());
        assertEquals(TransactionStatus.APPROVED, captor.getValue().getStatus());
        assertEquals("admin1", captor.getValue().getApprovedBy());
    }

    // ==================== createTransaction - pending (non-admin) ====================

    @Test
    public void createTransaction_nonAdminRole_shouldSaveAsPendingAndNotApplyBalance() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.createTransaction(
                requestDTO, "user1", Role.USER);

        assertNotNull(result);
        verify(bankAccountService, never()).updateBalance(any(), any());

        ArgumentCaptor<BalanceTransaction> captor = ArgumentCaptor.forClass(BalanceTransaction.class);
        verify(balanceTransactionRepository).save(captor.capture());
        assertEquals(TransactionStatus.PENDING, captor.getValue().getStatus());
    }

    @Test
    public void createTransaction_warehouseManagerRole_shouldSaveAsPendingWithoutApply() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.CASH_SAFE);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.CASH_SAFE, accountId);

        when(cashSafeService.getById(accountId)).thenReturn(new CashSafeResponseDTO());
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(cashSafeService.getAccountName(accountId)).thenReturn("Main Safe (Office)");

        BalanceTransactionResponseDTO result = balanceTransactionService.createTransaction(
                requestDTO, "wm1", Role.WAREHOUSE_MANAGER);

        assertNotNull(result);
        verify(cashSafeService, never()).updateBalance(any(), any());
    }

    // ==================== createTransaction - TRANSFER validation ====================

    @Test
    public void createTransaction_transferWithNoDestinationAccount_shouldThrowIllegalArgumentException() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.TRANSFER, AccountType.BANK_ACCOUNT);
        UUID accountId = requestDTO.getAccountId();
        // toAccountType and toAccountId are intentionally left null

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void createTransaction_transferToSameAccount_shouldThrowIllegalArgumentException() {
        UUID accountId = UUID.randomUUID();
        BalanceTransactionRequestDTO requestDTO = new BalanceTransactionRequestDTO();
        requestDTO.setTransactionType(TransactionType.TRANSFER);
        requestDTO.setAmount(BigDecimal.valueOf(200));
        requestDTO.setAccountType(AccountType.BANK_ACCOUNT);
        requestDTO.setAccountId(accountId);
        requestDTO.setToAccountType(AccountType.BANK_ACCOUNT);
        requestDTO.setToAccountId(accountId); // same account as source

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(2000));

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN));

        verify(balanceTransactionRepository, never()).save(any());
    }

    // ==================== createTransaction - insufficient balance ====================

    @Test
    public void createTransaction_withdrawalWithInsufficientBalance_shouldThrowIllegalArgumentException() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.WITHDRAWAL, AccountType.BANK_ACCOUNT);
        requestDTO.setAmount(BigDecimal.valueOf(5000));
        UUID accountId = requestDTO.getAccountId();

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(100));

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void createTransaction_transferWithInsufficientBalance_shouldThrowIllegalArgumentException() {
        UUID sourceId = UUID.randomUUID();
        UUID destId = UUID.randomUUID();

        BalanceTransactionRequestDTO requestDTO = new BalanceTransactionRequestDTO();
        requestDTO.setTransactionType(TransactionType.TRANSFER);
        requestDTO.setAmount(BigDecimal.valueOf(5000));
        requestDTO.setAccountType(AccountType.BANK_ACCOUNT);
        requestDTO.setAccountId(sourceId);
        requestDTO.setToAccountType(AccountType.CASH_SAFE);
        requestDTO.setToAccountId(destId);

        when(bankAccountService.getById(sourceId)).thenReturn(new BankAccountResponseDTO());
        when(cashSafeService.getById(destId)).thenReturn(new CashSafeResponseDTO());
        when(bankAccountService.getBalance(sourceId)).thenReturn(BigDecimal.valueOf(100));

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN));

        verify(balanceTransactionRepository, never()).save(any());
    }

    // ==================== createTransaction - DEPOSIT with CASH_WITH_PERSON ====================

    @Test
    public void createTransaction_depositCashWithPerson_adminRole_shouldAutoApply() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT,
                AccountType.CASH_WITH_PERSON);
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.CASH_WITH_PERSON, accountId);

        when(cashWithPersonService.getById(accountId)).thenReturn(new CashWithPersonResponseDTO());
        when(cashWithPersonService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(1000));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(cashWithPersonService.getAccountName(accountId)).thenReturn("John Doe");

        BalanceTransactionResponseDTO result = balanceTransactionService.createTransaction(
                requestDTO, "admin1", Role.ADMIN);

        assertNotNull(result);
        verify(cashWithPersonService).updateBalance(eq(accountId), any(BigDecimal.class));
    }

    // ==================== approveTransaction ====================

    @Test
    public void approveTransaction_pendingDeposit_shouldSetApprovedAndAddToBalance() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction pending = buildTransaction(transactionId, TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        BalanceTransaction savedApproved = buildTransaction(transactionId, TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);
        savedApproved.setApprovedBy("manager1");

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(pending));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedApproved);
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(1000));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.approveTransaction(
                transactionId, "manager1");

        assertNotNull(result);
        ArgumentCaptor<BalanceTransaction> captor = ArgumentCaptor.forClass(BalanceTransaction.class);
        verify(balanceTransactionRepository).save(captor.capture());
        assertEquals(TransactionStatus.APPROVED, captor.getValue().getStatus());
        assertEquals("manager1", captor.getValue().getApprovedBy());
        assertNotNull(captor.getValue().getApprovedAt());
        verify(bankAccountService).updateBalance(eq(accountId), any(BigDecimal.class));
    }

    @Test
    public void approveTransaction_transactionNotFound_shouldThrowIllegalArgumentException() {
        UUID transactionId = UUID.randomUUID();
        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.approveTransaction(transactionId, "manager1"));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void approveTransaction_alreadyApproved_shouldThrowIllegalStateException() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction alreadyApproved = buildTransaction(transactionId, TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(alreadyApproved));

        assertThrows(IllegalStateException.class, () ->
                balanceTransactionService.approveTransaction(transactionId, "manager1"));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void approveTransaction_alreadyRejected_shouldThrowIllegalStateException() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction rejected = buildTransaction(transactionId, TransactionStatus.REJECTED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(rejected));

        assertThrows(IllegalStateException.class, () ->
                balanceTransactionService.approveTransaction(transactionId, "manager1"));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void approveTransaction_pendingWithdrawal_shouldSubtractCorrectAmountFromBalance() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction pending = buildTransaction(transactionId, TransactionStatus.PENDING,
                TransactionType.WITHDRAWAL, AccountType.BANK_ACCOUNT, accountId);
        // amount is 500 from helper

        BalanceTransaction savedApproved = buildTransaction(transactionId, TransactionStatus.APPROVED,
                TransactionType.WITHDRAWAL, AccountType.BANK_ACCOUNT, accountId);
        savedApproved.setApprovedBy("manager1");

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(pending));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedApproved);
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(2000));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        balanceTransactionService.approveTransaction(transactionId, "manager1");

        // subtractFromBalance: 2000 - 500 = 1500
        ArgumentCaptor<BigDecimal> balanceCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(bankAccountService).updateBalance(eq(accountId), balanceCaptor.capture());
        assertEquals(0, BigDecimal.valueOf(1500).compareTo(balanceCaptor.getValue()));
    }

    @Test
    public void approveTransaction_pendingTransfer_shouldSubtractSourceAndAddToDestination() {
        UUID transactionId = UUID.randomUUID();
        UUID sourceAccountId = UUID.randomUUID();
        UUID destAccountId = UUID.randomUUID();

        BalanceTransaction pending = BalanceTransaction.builder()
                .id(transactionId)
                .transactionType(TransactionType.TRANSFER)
                .amount(BigDecimal.valueOf(500))
                .transactionDate(LocalDateTime.now())
                .accountType(AccountType.BANK_ACCOUNT)
                .accountId(sourceAccountId)
                .toAccountType(AccountType.CASH_SAFE)
                .toAccountId(destAccountId)
                .status(TransactionStatus.PENDING)
                .createdBy("user1")
                .build();

        BalanceTransaction savedApproved = BalanceTransaction.builder()
                .id(transactionId)
                .transactionType(TransactionType.TRANSFER)
                .amount(BigDecimal.valueOf(500))
                .transactionDate(LocalDateTime.now())
                .accountType(AccountType.BANK_ACCOUNT)
                .accountId(sourceAccountId)
                .toAccountType(AccountType.CASH_SAFE)
                .toAccountId(destAccountId)
                .status(TransactionStatus.APPROVED)
                .createdBy("user1")
                .approvedBy("manager1")
                .build();

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(pending));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedApproved);
        when(bankAccountService.getBalance(sourceAccountId)).thenReturn(BigDecimal.valueOf(2000));
        when(cashSafeService.getBalance(destAccountId)).thenReturn(BigDecimal.valueOf(1000));
        when(bankAccountService.getAccountName(sourceAccountId)).thenReturn("Test Bank - ACC-001");
        when(cashSafeService.getAccountName(destAccountId)).thenReturn("Main Safe (Office)");

        balanceTransactionService.approveTransaction(transactionId, "manager1");

        // Source: 2000 - 500 = 1500
        verify(bankAccountService).updateBalance(eq(sourceAccountId), eq(BigDecimal.valueOf(1500)));
        // Destination: 1000 + 500 = 1500
        verify(cashSafeService).updateBalance(eq(destAccountId), eq(BigDecimal.valueOf(1500)));
    }

    // ==================== rejectTransaction ====================

    @Test
    public void rejectTransaction_pendingTransaction_shouldSetRejectedStatusAndReason() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction pending = buildTransaction(transactionId, TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        BalanceTransaction savedRejected = buildTransaction(transactionId, TransactionStatus.REJECTED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);
        savedRejected.setRejectionReason("Insufficient documentation");

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(pending));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedRejected);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.rejectTransaction(
                transactionId, "manager1", "Insufficient documentation");

        assertNotNull(result);
        ArgumentCaptor<BalanceTransaction> captor = ArgumentCaptor.forClass(BalanceTransaction.class);
        verify(balanceTransactionRepository).save(captor.capture());
        assertEquals(TransactionStatus.REJECTED, captor.getValue().getStatus());
        assertEquals("Insufficient documentation", captor.getValue().getRejectionReason());
        assertEquals("manager1", captor.getValue().getApprovedBy());
        assertNotNull(captor.getValue().getApprovedAt());
    }

    @Test
    public void rejectTransaction_transactionNotFound_shouldThrowIllegalArgumentException() {
        UUID transactionId = UUID.randomUUID();
        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.rejectTransaction(transactionId, "manager1", "Not valid"));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void rejectTransaction_alreadyApproved_shouldThrowIllegalStateException() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction approved = buildTransaction(transactionId, TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(approved));

        assertThrows(IllegalStateException.class, () ->
                balanceTransactionService.rejectTransaction(transactionId, "manager1", "Late rejection"));

        verify(balanceTransactionRepository, never()).save(any());
    }

    @Test
    public void rejectTransaction_shouldNotUpdateAnyAccountBalance() {
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction pending = buildTransaction(transactionId, TransactionStatus.PENDING,
                TransactionType.WITHDRAWAL, AccountType.BANK_ACCOUNT, accountId);

        BalanceTransaction savedRejected = buildTransaction(transactionId, TransactionStatus.REJECTED,
                TransactionType.WITHDRAWAL, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(transactionId)).thenReturn(Optional.of(pending));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedRejected);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        balanceTransactionService.rejectTransaction(transactionId, "manager1", "Denied");

        verify(bankAccountService, never()).updateBalance(any(), any());
        verify(cashSafeService, never()).updateBalance(any(), any());
        verify(cashWithPersonService, never()).updateBalance(any(), any());
    }

    // ==================== getById ====================

    @Test
    public void getById_existingId_shouldReturnResponseDTO() {
        UUID id = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction transaction = buildTransaction(id, TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(id)).thenReturn(Optional.of(transaction));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        BalanceTransactionResponseDTO result = balanceTransactionService.getById(id);

        assertNotNull(result);
        verify(balanceTransactionRepository).findById(id);
    }

    @Test
    public void getById_notFound_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();
        when(balanceTransactionRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                balanceTransactionService.getById(id));
    }

    // ==================== getAll ====================

    @Test
    public void getAll_withBankAccountTransactions_shouldReturnEnrichedDTOList() {
        UUID bankAccountId = UUID.randomUUID();
        BalanceTransaction transaction = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, bankAccountId);

        BankAccount bankAccount = buildBankAccount(bankAccountId);

        when(balanceTransactionRepository.findAll()).thenReturn(List.of(transaction));
        when(bankAccountRepository.findAllById(anySet())).thenReturn(List.of(bankAccount));

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getAll();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(balanceTransactionRepository).findAll();
        verify(bankAccountRepository).findAllById(anySet());
    }

    @Test
    public void getAll_withCashSafeTransactions_shouldCallCashSafeRepository() {
        UUID safeId = UUID.randomUUID();
        BalanceTransaction transaction = buildTransaction(UUID.randomUUID(), TransactionStatus.PENDING,
                TransactionType.WITHDRAWAL, AccountType.CASH_SAFE, safeId);

        CashSafe cashSafe = buildCashSafe(safeId);

        when(balanceTransactionRepository.findAll()).thenReturn(List.of(transaction));
        when(cashSafeRepository.findAllById(anySet())).thenReturn(List.of(cashSafe));

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getAll();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(cashSafeRepository).findAllById(anySet());
    }

    @Test
    public void getAll_withCashWithPersonTransactions_shouldCallCashWithPersonRepository() {
        UUID personId = UUID.randomUUID();
        BalanceTransaction transaction = buildTransaction(UUID.randomUUID(), TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.CASH_WITH_PERSON, personId);

        CashWithPerson cashWithPerson = buildCashWithPerson(personId);

        when(balanceTransactionRepository.findAll()).thenReturn(List.of(transaction));
        when(cashWithPersonRepository.findAllById(anySet())).thenReturn(List.of(cashWithPerson));

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getAll();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(cashWithPersonRepository).findAllById(anySet());
    }

    @Test
    public void getAll_empty_shouldReturnEmptyListAndSkipAllRepositoryCalls() {
        when(balanceTransactionRepository.findAll()).thenReturn(List.of());

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verifyNoInteractions(bankAccountRepository, cashSafeRepository, cashWithPersonRepository);
    }

    // ==================== getPendingTransactions ====================

    @Test
    public void getPendingTransactions_withPendingItems_shouldReturnEnrichedList() {
        UUID accountId = UUID.randomUUID();
        BalanceTransaction pending = buildTransaction(UUID.randomUUID(), TransactionStatus.PENDING,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findByStatusOrderByCreatedAtDesc(TransactionStatus.PENDING))
                .thenReturn(List.of(pending));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getPendingTransactions();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(balanceTransactionRepository).findByStatusOrderByCreatedAtDesc(TransactionStatus.PENDING);
    }

    @Test
    public void getPendingTransactions_noPendingItems_shouldReturnEmptyList() {
        when(balanceTransactionRepository.findByStatusOrderByCreatedAtDesc(TransactionStatus.PENDING))
                .thenReturn(List.of());

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getPendingTransactions();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getTransactionsByAccount ====================

    @Test
    public void getTransactionsByAccount_shouldDelegateToRepositoryWithCorrectParameters() {
        UUID accountId = UUID.randomUUID();
        BalanceTransaction transaction = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findAllTransactionsForAccount(AccountType.BANK_ACCOUNT, accountId))
                .thenReturn(List.of(transaction));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getTransactionsByAccount(
                AccountType.BANK_ACCOUNT, accountId);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(balanceTransactionRepository).findAllTransactionsForAccount(AccountType.BANK_ACCOUNT, accountId);
    }

    @Test
    public void getTransactionsByAccount_noResults_shouldReturnEmptyList() {
        UUID accountId = UUID.randomUUID();
        when(balanceTransactionRepository.findAllTransactionsForAccount(AccountType.CASH_SAFE, accountId))
                .thenReturn(List.of());

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getTransactionsByAccount(
                AccountType.CASH_SAFE, accountId);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getTransactionsByDateRange ====================

    @Test
    public void getTransactionsByDateRange_shouldCallRepositoryWithCorrectDates() {
        UUID accountId = UUID.randomUUID();
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 31, 23, 59);

        BalanceTransaction transaction = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findByTransactionDateBetween(start, end))
                .thenReturn(List.of(transaction));
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getTransactionsByDateRange(
                start, end);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(balanceTransactionRepository).findByTransactionDateBetween(start, end);
    }

    @Test
    public void getTransactionsByDateRange_noResults_shouldReturnEmptyList() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 31, 23, 59);

        when(balanceTransactionRepository.findByTransactionDateBetween(start, end))
                .thenReturn(List.of());

        List<BalanceTransactionResponseDTO> result = balanceTransactionService.getTransactionsByDateRange(
                start, end);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getPendingTransactionCount ====================

    @Test
    public void getPendingTransactionCount_shouldReturnCountFromRepository() {
        when(balanceTransactionRepository.countByStatus(TransactionStatus.PENDING)).thenReturn(7L);

        long count = balanceTransactionService.getPendingTransactionCount();

        assertEquals(7L, count);
        verify(balanceTransactionRepository).countByStatus(TransactionStatus.PENDING);
    }

    @Test
    public void getPendingTransactionCount_noPending_shouldReturnZero() {
        when(balanceTransactionRepository.countByStatus(TransactionStatus.PENDING)).thenReturn(0L);

        long count = balanceTransactionService.getPendingTransactionCount();

        assertEquals(0L, count);
    }

    // ==================== Balance arithmetic ====================

    @Test
    public void createTransaction_adminDeposit_shouldAddAmountToCurrentBalance() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT);
        requestDTO.setAmount(BigDecimal.valueOf(300));
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);
        savedEntity.setAmount(BigDecimal.valueOf(300));

        when(bankAccountService.getById(accountId)).thenReturn(new BankAccountResponseDTO());
        when(bankAccountService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(700));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(bankAccountService.getAccountName(accountId)).thenReturn("Test Bank - ACC-001");

        balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN);

        // addToBalance: 700 + 300 = 1000
        ArgumentCaptor<BigDecimal> captor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(bankAccountService).updateBalance(eq(accountId), captor.capture());
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(captor.getValue()));
    }

    @Test
    public void createTransaction_adminCashSafeWithdrawal_shouldSubtractAmountFromBalance() {
        BalanceTransactionRequestDTO requestDTO = buildRequestDTO(TransactionType.WITHDRAWAL, AccountType.CASH_SAFE);
        requestDTO.setAmount(BigDecimal.valueOf(200));
        UUID accountId = requestDTO.getAccountId();

        BalanceTransaction savedEntity = buildTransaction(UUID.randomUUID(), TransactionStatus.APPROVED,
                TransactionType.WITHDRAWAL, AccountType.CASH_SAFE, accountId);
        savedEntity.setAmount(BigDecimal.valueOf(200));

        when(cashSafeService.getById(accountId)).thenReturn(new CashSafeResponseDTO());
        when(cashSafeService.getBalance(accountId)).thenReturn(BigDecimal.valueOf(1000));
        when(balanceTransactionRepository.save(any(BalanceTransaction.class))).thenReturn(savedEntity);
        when(cashSafeService.getAccountName(accountId)).thenReturn("Main Safe (Office)");

        balanceTransactionService.createTransaction(requestDTO, "admin1", Role.ADMIN);

        // subtractFromBalance: 1000 - 200 = 800
        ArgumentCaptor<BigDecimal> captor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(cashSafeService).updateBalance(eq(accountId), captor.capture());
        assertEquals(0, BigDecimal.valueOf(800).compareTo(captor.getValue()));
    }

    // ==================== enrichResponseDTO - getAccountName exception swallowed ====================

    @Test
    public void getById_whenAccountNameServiceThrows_shouldReturnUnknownAccountName() {
        UUID id = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        BalanceTransaction transaction = buildTransaction(id, TransactionStatus.APPROVED,
                TransactionType.DEPOSIT, AccountType.BANK_ACCOUNT, accountId);

        when(balanceTransactionRepository.findById(id)).thenReturn(Optional.of(transaction));
        // Simulate a stale/deleted bank account causing a lookup failure
        when(bankAccountService.getAccountName(accountId))
                .thenThrow(new IllegalArgumentException("Bank account not found"));

        // Service catches the exception in getAccountName() and returns "Unknown"
        BalanceTransactionResponseDTO result = balanceTransactionService.getById(id);

        assertNotNull(result);
        assertEquals("Unknown", result.getAccountName());
    }
}