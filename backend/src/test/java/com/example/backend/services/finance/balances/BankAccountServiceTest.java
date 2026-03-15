package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.BankAccountRequestDTO;
import com.example.backend.dto.finance.balances.BankAccountResponseDTO;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BankAccountServiceTest {

    @Mock
    private BankAccountRepository bankAccountRepository;

    @InjectMocks
    private BankAccountService bankAccountService;

    // ==================== Helper factory methods ====================

    private BankAccount buildBankAccount(UUID id, String accountNumber, BigDecimal balance, boolean isActive) {
        return BankAccount.builder()
                .id(id)
                .bankName("Test Bank")
                .accountNumber(accountNumber)
                .iban("EG123456789")
                .branchName("Cairo Branch")
                .branchCode("CAI001")
                .swiftCode("TESTEGCX")
                .accountHolderName("Test Holder")
                .currentBalance(balance)
                .availableBalance(balance)
                .totalBalance(balance)
                .reservedBalance(BigDecimal.ZERO)
                .openingDate(LocalDate.of(2024, 1, 1))
                .isActive(isActive)
                .notes("Test notes")
                .createdBy("admin1")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private BankAccountRequestDTO buildRequestDTO(String accountNumber, BigDecimal balance) {
        BankAccountRequestDTO dto = new BankAccountRequestDTO();
        dto.setBankName("Test Bank");
        dto.setAccountNumber(accountNumber);
        dto.setIban("EG123456789");
        dto.setBranchName("Cairo Branch");
        dto.setBranchCode("CAI001");
        dto.setSwiftCode("TESTEGCX");
        dto.setAccountHolderName("Test Holder");
        dto.setCurrentBalance(balance);
        dto.setOpeningDate(LocalDate.of(2024, 1, 1));
        dto.setIsActive(true);
        dto.setNotes("Test notes");
        return dto;
    }

    // ==================== create ====================

    @Test
    public void create_newUniqueAccountNumber_shouldSaveAndReturnResponseDTO() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-001", BigDecimal.valueOf(5000));
        UUID generatedId = UUID.randomUUID();
        BankAccount saved = buildBankAccount(generatedId, "ACC-001", BigDecimal.valueOf(5000), true);

        when(bankAccountRepository.existsByAccountNumber("ACC-001")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        BankAccountResponseDTO result = bankAccountService.create(requestDTO, "admin1");

        assertNotNull(result);
        assertEquals(generatedId, result.getId());
        assertEquals("Test Bank", result.getBankName());
        assertEquals("ACC-001", result.getAccountNumber());
        assertEquals(BigDecimal.valueOf(5000), result.getCurrentBalance());
        verify(bankAccountRepository).save(any(BankAccount.class));
    }

    @Test
    public void create_duplicateAccountNumber_shouldThrowIllegalArgumentException() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-001", BigDecimal.valueOf(1000));

        when(bankAccountRepository.existsByAccountNumber("ACC-001")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.create(requestDTO, "admin1"));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void create_shouldSetCurrentBalanceAsAvailableAndTotalBalance() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-002", BigDecimal.valueOf(3000));
        BankAccount saved = buildBankAccount(UUID.randomUUID(), "ACC-002", BigDecimal.valueOf(3000), true);

        when(bankAccountRepository.existsByAccountNumber("ACC-002")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        bankAccountService.create(requestDTO, "admin1");

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        BankAccount captured = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(3000).compareTo(captured.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(3000).compareTo(captured.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(3000).compareTo(captured.getTotalBalance()));
    }

    @Test
    public void create_shouldSetReservedBalanceToZero() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-003", BigDecimal.valueOf(1000));
        BankAccount saved = buildBankAccount(UUID.randomUUID(), "ACC-003", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.existsByAccountNumber("ACC-003")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        bankAccountService.create(requestDTO, "admin1");

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getReservedBalance()));
    }

    @Test
    public void create_whenIsActiveIsNull_shouldDefaultToTrue() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-004", BigDecimal.valueOf(500));
        requestDTO.setIsActive(null);
        BankAccount saved = buildBankAccount(UUID.randomUUID(), "ACC-004", BigDecimal.valueOf(500), true);

        when(bankAccountRepository.existsByAccountNumber("ACC-004")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        bankAccountService.create(requestDTO, "admin1");

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void create_shouldSetCreatedByFromParameter() {
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-005", BigDecimal.valueOf(1000));
        BankAccount saved = buildBankAccount(UUID.randomUUID(), "ACC-005", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.existsByAccountNumber("ACC-005")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        bankAccountService.create(requestDTO, "finance_user");

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertEquals("finance_user", captor.getValue().getCreatedBy());
    }

    // ==================== getById ====================

    @Test
    public void getById_existingId_shouldReturnResponseDTO() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(2000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        BankAccountResponseDTO result = bankAccountService.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
        assertEquals("ACC-001", result.getAccountNumber());
        assertEquals(0, BigDecimal.valueOf(2000).compareTo(result.getCurrentBalance()));
    }

    @Test
    public void getById_nonExistentId_shouldThrowIllegalArgumentExceptionWithIdInMessage() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.getById(id));

        assertTrue(ex.getMessage().contains(id.toString()));
    }

    // ==================== getAll ====================

    @Test
    public void getAll_withMultipleAccounts_shouldReturnAllAsDTOs() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        BankAccount account1 = buildBankAccount(id1, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccount account2 = buildBankAccount(id2, "ACC-002", BigDecimal.valueOf(2000), false);

        when(bankAccountRepository.findAll()).thenReturn(List.of(account1, account2));

        List<BankAccountResponseDTO> result = bankAccountService.getAll();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(bankAccountRepository).findAll();
    }

    @Test
    public void getAll_emptyRepository_shouldReturnEmptyList() {
        when(bankAccountRepository.findAll()).thenReturn(List.of());

        List<BankAccountResponseDTO> result = bankAccountService.getAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getAllActive ====================

    @Test
    public void getAllActive_shouldDelegateToFindByIsActiveTrue() {
        UUID id = UUID.randomUUID();
        BankAccount activeAccount = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findByIsActiveTrue()).thenReturn(List.of(activeAccount));

        List<BankAccountResponseDTO> result = bankAccountService.getAllActive();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
        verify(bankAccountRepository).findByIsActiveTrue();
    }

    @Test
    public void getAllActive_noActiveAccounts_shouldReturnEmptyList() {
        when(bankAccountRepository.findByIsActiveTrue()).thenReturn(List.of());

        List<BankAccountResponseDTO> result = bankAccountService.getAllActive();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== update ====================

    @Test
    public void update_existingAccountWithSameAccountNumber_shouldUpdateAndReturn() {
        UUID id = UUID.randomUUID();
        BankAccount existing = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-001", BigDecimal.valueOf(2000));
        requestDTO.setBankName("Updated Bank");
        BankAccount updated = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(2000), true);
        updated.setBankName("Updated Bank");

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(existing));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(updated);

        BankAccountResponseDTO result = bankAccountService.update(id, requestDTO);

        assertNotNull(result);
        verify(bankAccountRepository).save(any(BankAccount.class));
    }

    @Test
    public void update_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-001", BigDecimal.valueOf(1000));

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.update(id, requestDTO));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void update_changingToAlreadyExistingAccountNumber_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();
        BankAccount existing = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-002", BigDecimal.valueOf(1000));

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(existing));
        when(bankAccountRepository.existsByAccountNumber("ACC-002")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.update(id, requestDTO));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void update_changingToUniqueAccountNumber_shouldSucceed() {
        UUID id = UUID.randomUUID();
        BankAccount existing = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-NEW", BigDecimal.valueOf(1500));
        BankAccount updated = buildBankAccount(id, "ACC-NEW", BigDecimal.valueOf(1500), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(existing));
        when(bankAccountRepository.existsByAccountNumber("ACC-NEW")).thenReturn(false);
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(updated);

        BankAccountResponseDTO result = bankAccountService.update(id, requestDTO);

        assertNotNull(result);
        assertEquals("ACC-NEW", result.getAccountNumber());
    }

    @Test
    public void update_shouldUpdateAllMutableFieldsOnEntity() {
        UUID id = UUID.randomUUID();
        BankAccount existing = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccountRequestDTO requestDTO = buildRequestDTO("ACC-001", BigDecimal.valueOf(9999));
        requestDTO.setBankName("New Bank Name");
        requestDTO.setIban("NEW-IBAN");
        requestDTO.setBranchName("New Branch");
        requestDTO.setBranchCode("NB001");
        requestDTO.setSwiftCode("NEWSWIFT");
        requestDTO.setAccountHolderName("New Holder");
        requestDTO.setIsActive(false);
        requestDTO.setNotes("Updated notes");
        BankAccount updated = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(9999), false);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(existing));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(updated);

        bankAccountService.update(id, requestDTO);

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        BankAccount saved = captor.getValue();
        assertEquals("New Bank Name", saved.getBankName());
        assertEquals("ACC-001", saved.getAccountNumber());
        assertEquals("NEW-IBAN", saved.getIban());
        assertEquals("New Branch", saved.getBranchName());
        assertEquals("NB001", saved.getBranchCode());
        assertEquals("NEWSWIFT", saved.getSwiftCode());
        assertEquals("New Holder", saved.getAccountHolderName());
        assertEquals(0, BigDecimal.valueOf(9999).compareTo(saved.getCurrentBalance()));
        assertFalse(saved.getIsActive());
        assertEquals("Updated notes", saved.getNotes());
    }

    // ==================== delete ====================

    @Test
    public void delete_existingAccount_shouldCallRepositoryDelete() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        bankAccountService.delete(id);

        verify(bankAccountRepository).delete(account);
    }

    @Test
    public void delete_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.delete(id));

        verify(bankAccountRepository, never()).delete(any());
    }

    // ==================== deactivate ====================

    @Test
    public void deactivate_activeAccount_shouldSetIsActiveFalseAndSave() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccount deactivated = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), false);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(deactivated);

        BankAccountResponseDTO result = bankAccountService.deactivate(id);

        assertNotNull(result);
        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
    }

    @Test
    public void deactivate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.deactivate(id));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void deactivate_alreadyInactiveAccount_shouldStillSetFalseAndSave() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), false);
        BankAccount saved = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), false);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        BankAccountResponseDTO result = bankAccountService.deactivate(id);

        assertNotNull(result);
        verify(bankAccountRepository).save(any(BankAccount.class));
    }

    // ==================== activate ====================

    @Test
    public void activate_inactiveAccount_shouldSetIsActiveTrueAndSave() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), false);
        BankAccount activated = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(activated);

        BankAccountResponseDTO result = bankAccountService.activate(id);

        assertNotNull(result);
        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void activate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.activate(id));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void activate_alreadyActiveAccount_shouldStillSetTrueAndSave() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        BankAccount saved = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(saved);

        BankAccountResponseDTO result = bankAccountService.activate(id);

        assertNotNull(result);
        verify(bankAccountRepository).save(any(BankAccount.class));
    }

    // ==================== updateBalance ====================

    @Test
    public void updateBalance_existingAccount_shouldSetAllThreeBalanceFields() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(account);

        bankAccountService.updateBalance(id, BigDecimal.valueOf(7500));

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        BankAccount saved = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(7500).compareTo(saved.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(7500).compareTo(saved.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(7500).compareTo(saved.getTotalBalance()));
    }

    @Test
    public void updateBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.updateBalance(id, BigDecimal.valueOf(1000)));

        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    public void updateBalance_withZeroBalance_shouldSetAllBalancesToZero() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(5000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(account);

        bankAccountService.updateBalance(id, BigDecimal.ZERO);

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getCurrentBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getAvailableBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getTotalBalance()));
    }

    @Test
    public void updateBalance_withLargeAmount_shouldPersistExactValue() {
        UUID id = UUID.randomUUID();
        BigDecimal largeAmount = new BigDecimal("999999999.99");
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));
        when(bankAccountRepository.save(any(BankAccount.class))).thenReturn(account);

        bankAccountService.updateBalance(id, largeAmount);

        ArgumentCaptor<BankAccount> captor = ArgumentCaptor.forClass(BankAccount.class);
        verify(bankAccountRepository).save(captor.capture());
        assertEquals(0, largeAmount.compareTo(captor.getValue().getCurrentBalance()));
    }

    // ==================== getBalance ====================

    @Test
    public void getBalance_existingAccount_shouldReturnCurrentBalance() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(4500), true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        BigDecimal balance = bankAccountService.getBalance(id);

        assertEquals(0, BigDecimal.valueOf(4500).compareTo(balance));
    }

    @Test
    public void getBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.getBalance(id));
    }

    @Test
    public void getBalance_accountWithZeroBalance_shouldReturnZero() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.ZERO, true);

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        BigDecimal balance = bankAccountService.getBalance(id);

        assertEquals(0, BigDecimal.ZERO.compareTo(balance));
    }

    // ==================== getAccountName ====================

    @Test
    public void getAccountName_existingAccount_shouldReturnBankNameDashAccountNumber() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "ACC-001", BigDecimal.valueOf(1000), true);
        account.setBankName("National Bank");

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        String name = bankAccountService.getAccountName(id);

        assertEquals("National Bank - ACC-001", name);
    }

    @Test
    public void getAccountName_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(bankAccountRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> bankAccountService.getAccountName(id));
    }

    @Test
    public void getAccountName_shouldCombineBankNameAndAccountNumberWithDashSeparator() {
        UUID id = UUID.randomUUID();
        BankAccount account = buildBankAccount(id, "XYZ-9999", BigDecimal.ZERO, true);
        account.setBankName("Alpha Bank");

        when(bankAccountRepository.findById(id)).thenReturn(Optional.of(account));

        String name = bankAccountService.getAccountName(id);

        assertTrue(name.contains("Alpha Bank"));
        assertTrue(name.contains("XYZ-9999"));
        assertTrue(name.contains(" - "));
    }
}