package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.CashWithPersonRequestDTO;
import com.example.backend.dto.finance.balances.CashWithPersonResponseDTO;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
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
public class CashWithPersonServiceTest {

    @Mock
    private CashWithPersonRepository cashWithPersonRepository;

    @InjectMocks
    private CashWithPersonService cashWithPersonService;

    // ==================== Helper factory methods ====================

    private CashWithPerson buildCashWithPerson(UUID id, String personName, BigDecimal balance, boolean isActive) {
        return CashWithPerson.builder()
                .id(id)
                .personName(personName)
                .phoneNumber("+201001234567")
                .email("person@example.com")
                .address("123 Main Street, Cairo")
                .personalBankAccountNumber("PERS-ACC-001")
                .personalBankName("Personal Bank")
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

    private CashWithPersonRequestDTO buildRequestDTO(String personName, BigDecimal balance) {
        CashWithPersonRequestDTO dto = new CashWithPersonRequestDTO();
        dto.setPersonName(personName);
        dto.setPhoneNumber("+201001234567");
        dto.setEmail("person@example.com");
        dto.setAddress("123 Main Street, Cairo");
        dto.setPersonalBankAccountNumber("PERS-ACC-001");
        dto.setPersonalBankName("Personal Bank");
        dto.setCurrentBalance(balance);
        dto.setIsActive(true);
        dto.setNotes("Test notes");
        return dto;
    }

    // ==================== create ====================

    @Test
    public void create_validRequest_shouldSaveAndReturnResponseDTO() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("John Doe", BigDecimal.valueOf(8000));
        UUID generatedId = UUID.randomUUID();
        CashWithPerson saved = buildCashWithPerson(generatedId, "John Doe", BigDecimal.valueOf(8000), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        CashWithPersonResponseDTO result = cashWithPersonService.create(requestDTO, "admin1");

        assertNotNull(result);
        assertEquals(generatedId, result.getId());
        assertEquals("John Doe", result.getPersonName());
        assertEquals(0, BigDecimal.valueOf(8000).compareTo(result.getCurrentBalance()));
        verify(cashWithPersonRepository).save(any(CashWithPerson.class));
    }

    @Test
    public void create_shouldSetCurrentBalanceAsAvailableAndTotalBalance() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Jane Smith", BigDecimal.valueOf(4000));
        CashWithPerson saved = buildCashWithPerson(UUID.randomUUID(), "Jane Smith", BigDecimal.valueOf(4000), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.create(requestDTO, "admin1");

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        CashWithPerson captured = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(4000).compareTo(captured.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(4000).compareTo(captured.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(4000).compareTo(captured.getTotalBalance()));
    }

    @Test
    public void create_shouldSetReservedBalanceToZero() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Ali Hassan", BigDecimal.valueOf(1500));
        CashWithPerson saved = buildCashWithPerson(UUID.randomUUID(), "Ali Hassan", BigDecimal.valueOf(1500), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.create(requestDTO, "admin1");

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getReservedBalance()));
    }

    @Test
    public void create_whenIsActiveIsNull_shouldDefaultToTrue() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Sara Ahmed", BigDecimal.valueOf(500));
        requestDTO.setIsActive(null);
        CashWithPerson saved = buildCashWithPerson(UUID.randomUUID(), "Sara Ahmed", BigDecimal.valueOf(500), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.create(requestDTO, "admin1");

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void create_shouldSetCreatedByFromParameter() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Mona Khalid", BigDecimal.valueOf(2000));
        CashWithPerson saved = buildCashWithPerson(UUID.randomUUID(), "Mona Khalid", BigDecimal.valueOf(2000), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.create(requestDTO, "finance_manager");

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertEquals("finance_manager", captor.getValue().getCreatedBy());
    }

    @Test
    public void create_shouldPersistAllContactFields() {
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Omar Nabil", BigDecimal.valueOf(3000));
        requestDTO.setPhoneNumber("+201009876543");
        requestDTO.setEmail("omar@company.com");
        requestDTO.setAddress("45 Tahrir Square");
        requestDTO.setPersonalBankAccountNumber("ACC-XYZ");
        requestDTO.setPersonalBankName("Cairo Bank");
        CashWithPerson saved = buildCashWithPerson(UUID.randomUUID(), "Omar Nabil", BigDecimal.valueOf(3000), true);

        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.create(requestDTO, "admin1");

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        CashWithPerson captured = captor.getValue();
        assertEquals("Omar Nabil", captured.getPersonName());
        assertEquals("+201009876543", captured.getPhoneNumber());
        assertEquals("omar@company.com", captured.getEmail());
        assertEquals("45 Tahrir Square", captured.getAddress());
        assertEquals("ACC-XYZ", captured.getPersonalBankAccountNumber());
        assertEquals("Cairo Bank", captured.getPersonalBankName());
    }

    // ==================== getById ====================

    @Test
    public void getById_existingId_shouldReturnResponseDTO() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(5000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        CashWithPersonResponseDTO result = cashWithPersonService.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
        assertEquals("John Doe", result.getPersonName());
        assertEquals(0, BigDecimal.valueOf(5000).compareTo(result.getCurrentBalance()));
    }

    @Test
    public void getById_nonExistentId_shouldThrowIllegalArgumentExceptionWithIdInMessage() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.getById(id));

        assertTrue(ex.getMessage().contains(id.toString()));
    }

    // ==================== getAll ====================

    @Test
    public void getAll_withMultipleRecords_shouldReturnAllAsDTOs() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        CashWithPerson person1 = buildCashWithPerson(id1, "Person A", BigDecimal.valueOf(1000), true);
        CashWithPerson person2 = buildCashWithPerson(id2, "Person B", BigDecimal.valueOf(2000), false);

        when(cashWithPersonRepository.findAll()).thenReturn(List.of(person1, person2));

        List<CashWithPersonResponseDTO> result = cashWithPersonService.getAll();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(cashWithPersonRepository).findAll();
    }

    @Test
    public void getAll_emptyRepository_shouldReturnEmptyList() {
        when(cashWithPersonRepository.findAll()).thenReturn(List.of());

        List<CashWithPersonResponseDTO> result = cashWithPersonService.getAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getAllActive ====================

    @Test
    public void getAllActive_shouldDelegateToFindByIsActiveTrue() {
        UUID id = UUID.randomUUID();
        CashWithPerson activePerson = buildCashWithPerson(id, "Active Person", BigDecimal.valueOf(1500), true);

        when(cashWithPersonRepository.findByIsActiveTrue()).thenReturn(List.of(activePerson));

        List<CashWithPersonResponseDTO> result = cashWithPersonService.getAllActive();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
        verify(cashWithPersonRepository).findByIsActiveTrue();
    }

    @Test
    public void getAllActive_noActiveRecords_shouldReturnEmptyList() {
        when(cashWithPersonRepository.findByIsActiveTrue()).thenReturn(List.of());

        List<CashWithPersonResponseDTO> result = cashWithPersonService.getAllActive();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== update ====================

    @Test
    public void update_existingId_shouldUpdateAndReturnResponseDTO() {
        UUID id = UUID.randomUUID();
        CashWithPerson existing = buildCashWithPerson(id, "Old Name", BigDecimal.valueOf(1000), true);
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("New Name", BigDecimal.valueOf(5000));
        CashWithPerson updated = buildCashWithPerson(id, "New Name", BigDecimal.valueOf(5000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(existing));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(updated);

        CashWithPersonResponseDTO result = cashWithPersonService.update(id, requestDTO);

        assertNotNull(result);
        verify(cashWithPersonRepository).save(any(CashWithPerson.class));
    }

    @Test
    public void update_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Someone", BigDecimal.valueOf(100));

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.update(id, requestDTO));

        verify(cashWithPersonRepository, never()).save(any());
    }

    @Test
    public void update_shouldMutateAllEntityFieldsBeforeSaving() {
        UUID id = UUID.randomUUID();
        CashWithPerson existing = buildCashWithPerson(id, "Old Name", BigDecimal.valueOf(1000), true);
        CashWithPersonRequestDTO requestDTO = buildRequestDTO("Updated Person", BigDecimal.valueOf(8800));
        requestDTO.setPhoneNumber("+201112223333");
        requestDTO.setEmail("updated@example.com");
        requestDTO.setAddress("New Address");
        requestDTO.setPersonalBankAccountNumber("NEW-ACC");
        requestDTO.setPersonalBankName("New Bank");
        requestDTO.setIsActive(false);
        requestDTO.setNotes("Updated notes");
        CashWithPerson saved = buildCashWithPerson(id, "Updated Person", BigDecimal.valueOf(8800), false);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(existing));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        cashWithPersonService.update(id, requestDTO);

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        CashWithPerson captured = captor.getValue();
        assertEquals("Updated Person", captured.getPersonName());
        assertEquals("+201112223333", captured.getPhoneNumber());
        assertEquals("updated@example.com", captured.getEmail());
        assertEquals("New Address", captured.getAddress());
        assertEquals("NEW-ACC", captured.getPersonalBankAccountNumber());
        assertEquals("New Bank", captured.getPersonalBankName());
        assertEquals(0, BigDecimal.valueOf(8800).compareTo(captured.getCurrentBalance()));
        assertFalse(captured.getIsActive());
        assertEquals("Updated notes", captured.getNotes());
    }

    // ==================== delete ====================

    @Test
    public void delete_existingId_shouldCallRepositoryDelete() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(1000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        cashWithPersonService.delete(id);

        verify(cashWithPersonRepository).delete(cashWithPerson);
    }

    @Test
    public void delete_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.delete(id));

        verify(cashWithPersonRepository, never()).delete(any());
    }

    // ==================== deactivate ====================

    @Test
    public void deactivate_activePerson_shouldSetIsActiveFalseAndSave() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(2000), true);
        CashWithPerson deactivated = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(2000), false);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(deactivated);

        CashWithPersonResponseDTO result = cashWithPersonService.deactivate(id);

        assertNotNull(result);
        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
    }

    @Test
    public void deactivate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.deactivate(id));

        verify(cashWithPersonRepository, never()).save(any());
    }

    @Test
    public void deactivate_alreadyInactivePerson_shouldStillPersistFalseStatus() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "Inactive Person", BigDecimal.valueOf(100), false);
        CashWithPerson saved = buildCashWithPerson(id, "Inactive Person", BigDecimal.valueOf(100), false);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        CashWithPersonResponseDTO result = cashWithPersonService.deactivate(id);

        assertNotNull(result);
        verify(cashWithPersonRepository).save(any(CashWithPerson.class));
    }

    // ==================== activate ====================

    @Test
    public void activate_inactivePerson_shouldSetIsActiveTrueAndSave() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(3000), false);
        CashWithPerson activated = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(3000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(activated);

        CashWithPersonResponseDTO result = cashWithPersonService.activate(id);

        assertNotNull(result);
        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    public void activate_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.activate(id));

        verify(cashWithPersonRepository, never()).save(any());
    }

    @Test
    public void activate_alreadyActivePerson_shouldStillPersistTrueStatus() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "Active Person", BigDecimal.valueOf(7000), true);
        CashWithPerson saved = buildCashWithPerson(id, "Active Person", BigDecimal.valueOf(7000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(saved);

        CashWithPersonResponseDTO result = cashWithPersonService.activate(id);

        assertNotNull(result);
        verify(cashWithPersonRepository).save(any(CashWithPerson.class));
    }

    // ==================== updateBalance ====================

    @Test
    public void updateBalance_existingId_shouldSetCurrentAvailableAndTotalBalance() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(1000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(cashWithPerson);

        cashWithPersonService.updateBalance(id, BigDecimal.valueOf(5500));

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        CashWithPerson saved = captor.getValue();
        assertEquals(0, BigDecimal.valueOf(5500).compareTo(saved.getCurrentBalance()));
        assertEquals(0, BigDecimal.valueOf(5500).compareTo(saved.getAvailableBalance()));
        assertEquals(0, BigDecimal.valueOf(5500).compareTo(saved.getTotalBalance()));
    }

    @Test
    public void updateBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.updateBalance(id, BigDecimal.valueOf(100)));

        verify(cashWithPersonRepository, never()).save(any());
    }

    @Test
    public void updateBalance_withZero_shouldSetAllThreeBalanceFieldsToZero() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(9000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(cashWithPerson);

        cashWithPersonService.updateBalance(id, BigDecimal.ZERO);

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getCurrentBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getAvailableBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(captor.getValue().getTotalBalance()));
    }

    @Test
    public void updateBalance_withDecimalPrecision_shouldPersistExactValue() {
        UUID id = UUID.randomUUID();
        BigDecimal preciseAmount = new BigDecimal("12345.67");
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(1000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));
        when(cashWithPersonRepository.save(any(CashWithPerson.class))).thenReturn(cashWithPerson);

        cashWithPersonService.updateBalance(id, preciseAmount);

        ArgumentCaptor<CashWithPerson> captor = ArgumentCaptor.forClass(CashWithPerson.class);
        verify(cashWithPersonRepository).save(captor.capture());
        assertEquals(0, preciseAmount.compareTo(captor.getValue().getCurrentBalance()));
        assertEquals(0, preciseAmount.compareTo(captor.getValue().getAvailableBalance()));
        assertEquals(0, preciseAmount.compareTo(captor.getValue().getTotalBalance()));
    }

    // ==================== getBalance ====================

    @Test
    public void getBalance_existingId_shouldReturnCurrentBalance() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "John Doe", BigDecimal.valueOf(6600), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        BigDecimal balance = cashWithPersonService.getBalance(id);

        assertEquals(0, BigDecimal.valueOf(6600).compareTo(balance));
    }

    @Test
    public void getBalance_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.getBalance(id));
    }

    @Test
    public void getBalance_personWithZeroBalance_shouldReturnZero() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "New Employee", BigDecimal.ZERO, true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        BigDecimal balance = cashWithPersonService.getBalance(id);

        assertEquals(0, BigDecimal.ZERO.compareTo(balance));
    }

    // ==================== getAccountName ====================

    @Test
    public void getAccountName_existingId_shouldReturnPersonNameOnly() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "Ahmed Farouk", BigDecimal.valueOf(1000), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        String name = cashWithPersonService.getAccountName(id);

        assertEquals("Ahmed Farouk", name);
    }

    @Test
    public void getAccountName_nonExistentId_shouldThrowIllegalArgumentException() {
        UUID id = UUID.randomUUID();

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> cashWithPersonService.getAccountName(id));
    }

    @Test
    public void getAccountName_shouldReturnExactPersonNameWithNoAdditionalFormatting() {
        UUID id = UUID.randomUUID();
        CashWithPerson cashWithPerson = buildCashWithPerson(id, "Layla Ibrahim", BigDecimal.valueOf(500), true);

        when(cashWithPersonRepository.findById(id)).thenReturn(Optional.of(cashWithPerson));

        String name = cashWithPersonService.getAccountName(id);

        assertEquals("Layla Ibrahim", name);
        assertFalse(name.contains("("));
        assertFalse(name.contains("-"));
    }
}