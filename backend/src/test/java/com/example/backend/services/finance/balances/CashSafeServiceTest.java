package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.CashSafeRequestDTO;
import com.example.backend.dto.finance.balances.CashSafeResponseDTO;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CashSafeServiceTest {

    @Mock
    private CashSafeRepository cashSafeRepository;

    @InjectMocks
    private CashSafeService cashSafeService;

    // ==================== Helper factory methods ====================

    private CashSafe buildCashSafe(UUID id, String safeName, String location, BigDecimal balance, boolean isActive) {
        return CashSafe.builder()
                .id(id)
                .safeName(safeName)
                .location(location)
                .currentBalance(balance)
                .availableBalance(balance)
                .totalBalance(balance)
                .reservedBalance(BigDecimal.ZERO)
                .isActive(isActive)
                .notes("Test notes")
                .createdBy("admin1")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private CashSafeRequestDTO buildRequestDTO(String safeName, String location, BigDecimal balance) {
        CashSafeRequestDTO dto = new CashSafeRequestDTO();
        dto.setSafeName(safeName);
        dto.setLocation(location);
        dto.setCurrentBalance(balance);
        dto.setIsActive(true);
        dto.setNotes("Test notes");
        return dto;
    }

    // ==================== create ====================

    @Test
    public void create_validRequest_shouldSaveAndReturnResponseDTO() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Main Safe", "Head Office", BigDecimal.valueOf(10000));
        UUID generatedId = UUID.randomUUID();
        CashSafe saved = buildCashSafe(generatedId, "Main Safe", "Head Office", BigDecimal.valueOf(10000), true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        CashSafeResponseDTO result = cashSafeService.create(requestDTO, "admin1");

        assertNotNull(result);
        assertEquals(generatedId, result.getId());
        assertEquals("Main Safe", result.getSafeName());
        assertEquals("Head Office", result.getLocation());
        assertEquals(0, BigDecimal.valueOf(10000).compareTo(result.getCurrentBalance()));
        verify(cashSafeRepository).save(any(CashSafe.class));
    }

    @Test
    public void create_shouldSetCurrentBalanceAsAvailableAndTotalBalance() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Safe A", "Warehouse", BigDecimal.valueOf(5000));
        CashSafe saved = buildCashSafe(UUID.randomUUID(), "Safe A", "Warehouse", BigDecimal.valueOf(5000), true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.create(requestDTO, "admin1");

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        CashSafe captured = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(5000).compareTo(captured.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(5000).compareTo(captured.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(5000).compareTo(captured.getTotalBalance()));
    }

    @Test
    public void create_shouldSetReservedBalanceToZero() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Safe B", "Office", BigDecimal.valueOf(3000));
        CashSafe saved = buildCashSafe(UUID.randomUUID(), "Safe B", "Office", BigDecimal.valueOf(3000), true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.create(requestDTO, "admin1");

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getReservedBalance()));
    }

    @Test
    public void create_whenIsActiveIsNull_shouldDefaultToTrue() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Safe C", "Storage", BigDecimal.valueOf(1000));
        requestDTO.setIsActive(null);
        CashSafe saved = buildCashSafe(UUID.randomUUID(), "Safe C", "Storage", BigDecimal.valueOf(1000), true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.create(requestDTO, "admin1");

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void create_shouldSetCreatedByFromParameter() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Safe D", "Vault", BigDecimal.valueOf(2000));
        CashSafe saved = buildCashSafe(UUID.randomUUID(), "Safe D", "Vault", BigDecimal.valueOf(2000), true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.create(requestDTO, "finance_manager");

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertEquals("finance_manager", captor.getValue().getCreatedBy());
    }

    @Test
    public void create_withZeroInitialBalance_shouldSaveWithZeroForAllBalanceFields() {
        CashSafeRequestDTO requestDTO = buildRequestDTO("Empty Safe", "Room 1", BigDecimal.ZERO);
        CashSafe saved = buildCashSafe(UUID.randomUUID(), "Empty Safe", "Room 1", BigDecimal.ZERO, true);

        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.create(requestDTO, "admin1");

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getCurrentBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getAvailableBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getTotalBalance()));
    }

    // ==================== getById ====================

    @Test
    public void getById_existingId_shouldReturnResponseDTO() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Head Office", BigDecimal.valueOf(8000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        CashSafeResponseDTO result = cashSafeService.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
        assertEquals("Main Safe", result.getSafeName());
        assertEquals("Head Office", result.getLocation());
        assertEquals(0, BigDecimal.valueOf(8000).compareTo(result.getCurrentBalance()));
    }

    @Test
    public void getById_nonExistentId_shouldThrowIllegalArgumentExceptionWithIdInMessage() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.getById(id));

        assertTrue(ex.getMessage().contains(id.toString()));
    }

    // ==================== getAll ====================

    @Test
    public void getAll_withMultipleSafes_shouldReturnAllAsDTOs() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        CashSafe safe1 = buildCashSafe(id1, "Safe One", "Office A", BigDecimal.valueOf(1000), true);
        CashSafe safe2 = buildCashSafe(id2, "Safe Two", "Office B", BigDecimal.valueOf(2000), false);

        when(cashSafeRepository.findAll()).thenReturn(List.of(safe1, safe2));

        List<CashSafeResponseDTO> result = cashSafeService.getAll();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(cashSafeRepository).findAll();
    }

    @Test
    public void getAll_emptyRepository_shouldReturnEmptyList() {
        when(cashSafeRepository.findAll()).thenReturn(List.of());

        List<CashSafeResponseDTO> result = cashSafeService.getAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getAllActive ====================

    @Test
    public void getAllActive_shouldDelegateToFindByIsActiveTrue() {
        UUID id = UUID.randomUUID();
        CashSafe activeSafe = buildCashSafe(id, "Active Safe", "Floor 1", BigDecimal.valueOf(500), true);

        when(cashSafeRepository.findByIsActiveTrue()).thenReturn(List.of(activeSafe));

        List<CashSafeResponseDTO> result = cashSafeService.getAllActive();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
        verify(cashSafeRepository).findByIsActiveTrue();
    }

    @Test
    public void getAllActive_noActiveSafes_shouldReturnEmptyList() {
        when(cashSafeRepository.findByIsActiveTrue()).thenReturn(List.of());

        List<CashSafeResponseDTO> result = cashSafeService.getAllActive();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== update ====================

    @Test
    public void update_existingId_shouldUpdateAllFieldsAndReturn() {
        UUID id = UUID.randomUUID();
        CashSafe existing = buildCashSafe(id, "Old Safe", "Old Location", BigDecimal.valueOf(1000), true);
        CashSafeRequestDTO requestDTO = buildRequestDTO("New Safe", "New Location", BigDecimal.valueOf(9999));
        requestDTO.setIsActive(false);
        requestDTO.setNotes("Updated notes");
        CashSafe updated = buildCashSafe(id, "New Safe", "New Location", BigDecimal.valueOf(9999), false);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(updated);

        CashSafeResponseDTO result = cashSafeService.update(id, requestDTO);

        assertNotNull(result);
        verify(cashSafeRepository).save(any(CashSafe.class));
    }

    @Test
    public void update_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();
        CashSafeRequestDTO requestDTO = buildRequestDTO("Safe", "Location", BigDecimal.valueOf(500));

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.update(id, requestDTO));

        verify(cashSafeRepository, never()).save(any());
    }

    @Test
    public void update_shouldMutateEntityFieldsBeforeSaving() {
        UUID id = UUID.randomUUID();
        CashSafe existing = buildCashSafe(id, "Old Safe", "Old Location", BigDecimal.valueOf(1000), true);
        CashSafeRequestDTO requestDTO = buildRequestDTO("Updated Safe", "New Floor", BigDecimal.valueOf(4500));
        requestDTO.setIsActive(false);
        requestDTO.setNotes("New notes");
        CashSafe saved = buildCashSafe(id, "Updated Safe", "New Floor", BigDecimal.valueOf(4500), false);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        cashSafeService.update(id, requestDTO);

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        CashSafe captured = captor.getValue();
        assertEquals("Updated Safe", captured.getSafeName());
        assertEquals("New Floor", captured.getLocation());
        assertEquals(0, BigDecimal.valueOf(4500).compareTo(captured.getCurrentBalance()));
        assertFalse(captured.getIsActive());
        assertEquals("New notes", captured.getNotes());
    }

    // ==================== delete ====================

    @Test
    public void delete_existingId_shouldCallRepositoryDelete() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        cashSafeService.delete(id);

        verify(cashSafeRepository).delete(cashSafe);
    }

    @Test
    public void delete_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.delete(id));

        verify(cashSafeRepository, never()).delete(any());
    }

    // ==================== deactivate ====================

    @Test
    public void deactivate_activeSafe_shouldSetIsActiveFalseAndSave() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), true);
        CashSafe deactivated = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), false);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(deactivated);

        CashSafeResponseDTO result = cashSafeService.deactivate(id);

        assertNotNull(result);
        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
    }

    @Test
    public void deactivate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.deactivate(id));

        verify(cashSafeRepository, never()).save(any());
    }

    @Test
    public void deactivate_alreadyInactiveSafe_shouldStillPersistFalseStatus() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Inactive Safe", "Office", BigDecimal.valueOf(500), false);
        CashSafe saved = buildCashSafe(id, "Inactive Safe", "Office", BigDecimal.valueOf(500), false);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        CashSafeResponseDTO result = cashSafeService.deactivate(id);

        assertNotNull(result);
        verify(cashSafeRepository).save(any(CashSafe.class));
    }

    // ==================== activate ====================

    @Test
    public void activate_inactiveSafe_shouldSetIsActiveTrueAndSave() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), false);
        CashSafe activated = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(activated);

        CashSafeResponseDTO result = cashSafeService.activate(id);

        assertNotNull(result);
        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void activate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.activate(id));

        verify(cashSafeRepository, never()).save(any());
    }

    @Test
    public void activate_alreadyActiveSafe_shouldStillPersistTrueStatus() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Active Safe", "Floor 2", BigDecimal.valueOf(3000), true);
        CashSafe saved = buildCashSafe(id, "Active Safe", "Floor 2", BigDecimal.valueOf(3000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(saved);

        CashSafeResponseDTO result = cashSafeService.activate(id);

        assertNotNull(result);
        verify(cashSafeRepository).save(any(CashSafe.class));
    }

    // ==================== updateBalance ====================

    @Test
    public void updateBalance_existingId_shouldSetCurrentAvailableAndTotalBalance() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(1000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(cashSafe);

        cashSafeService.updateBalance(id, BigDecimal.valueOf(6000));

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        CashSafe saved = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(6000).compareTo(saved.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(6000).compareTo(saved.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(6000).compareTo(saved.getTotalBalance()));
    }

    @Test
    public void updateBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.updateBalance(id, BigDecimal.valueOf(500)));

        verify(cashSafeRepository, never()).save(any());
    }

    @Test
    public void updateBalance_withZero_shouldSetAllThreeBalanceFieldsToZero() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(9000), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));
        when(cashSafeRepository.save(any(CashSafe.class))).thenReturn(cashSafe);

        cashSafeService.updateBalance(id, BigDecimal.ZERO);

        ArgumentCaptor<CashSafe> captor = ArgumentCaptor.forClass(CashSafe.class);
        verify(cashSafeRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getCurrentBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getAvailableBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getTotalBalance()));
    }

    // ==================== getBalance ====================

    @Test
    public void getBalance_existingId_shouldReturnCurrentBalance() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Main Safe", "Office", BigDecimal.valueOf(7700), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        BigDecimal balance = cashSafeService.getBalance(id);

        assertEquals(0, BigDecimal.valueOf(7700).compareTo(balance));
    }

    @Test
    public void getBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.getBalance(id));
    }

    @Test
    public void getBalance_safeWithZeroBalance_shouldReturnZero() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Empty Safe", "Basement", BigDecimal.ZERO, true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        BigDecimal balance = cashSafeService.getBalance(id);

        assertEquals(0, BigDecimal.ZERO.compareTo(balance));
    }

    // ==================== getAccountName ====================

    @Test
    public void getAccountName_existingId_shouldReturnSafeNameWithLocationInParentheses() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Petty Cash Safe", "Ground Floor", BigDecimal.valueOf(500), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        String name = cashSafeService.getAccountName(id);

        assertEquals("Petty Cash Safe (Ground Floor)", name);
    }

    @Test
    public void getAccountName_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashSafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashSafeService.getAccountName(id));
    }

    @Test
    public void getAccountName_shouldContainSafeNameAndLocationWrappedInParentheses() {
        UUID id = UUID.randomUUID();
        CashSafe cashSafe = buildCashSafe(id, "Vault A", "Basement Level 2", BigDecimal.valueOf(100), true);

        when(cashSafeRepository.findById(id)).thenReturn(Optional.of(cashSafe));

        String name = cashSafeService.getAccountName(id);

        assertTrue(name.contains("Vault A"));
        assertTrue(name.contains("Basement Level 2"));
        assertTrue(name.startsWith("Vault A ("));
        assertTrue(name.endsWith(")"));
    }
}