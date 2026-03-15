package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.PaymentTypeDTO;
import com.example.backend.models.payroll.PaymentType;
import com.example.backend.repositories.payroll.PaymentTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentTypeServiceTest {

    @Mock
    private PaymentTypeRepository paymentTypeRepository;

    @InjectMocks
    private PaymentTypeService paymentTypeService;

    private UUID paymentTypeId;
    private PaymentType samplePaymentType;

    @BeforeEach
    void setUp() {
        paymentTypeId = UUID.randomUUID();
        samplePaymentType = PaymentType.builder()
                .id(paymentTypeId)
                .code("BANK")
                .name("Bank Transfer")
                .description("Direct bank transfer")
                .isActive(true)
                .requiresBankDetails(true)
                .requiresWalletDetails(false)
                .displayOrder(1)
                .createdBy("admin")
                .build();
    }

    // ==================== getAllActive ====================

    @Test
    void getAllActive_returnsMappedDTOs() {
        when(paymentTypeRepository.findAllActive()).thenReturn(List.of(samplePaymentType));

        List<PaymentTypeDTO> result = paymentTypeService.getAllActive();

        assertEquals(1, result.size());
        assertEquals("BANK", result.get(0).getCode());
        verify(paymentTypeRepository).findAllActive();
    }

    @Test
    void getAllActive_empty_returnsEmptyList() {
        when(paymentTypeRepository.findAllActive()).thenReturn(Collections.emptyList());

        List<PaymentTypeDTO> result = paymentTypeService.getAllActive();

        assertTrue(result.isEmpty());
    }

    // ==================== getAll ====================

    @Test
    void getAll_returnsMappedDTOsOrderedByDisplayOrder() {
        PaymentType second = PaymentType.builder()
                .id(UUID.randomUUID())
                .code("CASH")
                .name("Cash")
                .isActive(true)
                .displayOrder(2)
                .build();
        when(paymentTypeRepository.findAllByOrderByDisplayOrderAsc())
                .thenReturn(List.of(samplePaymentType, second));

        List<PaymentTypeDTO> result = paymentTypeService.getAll();

        assertEquals(2, result.size());
        assertEquals("BANK", result.get(0).getCode());
        assertEquals("CASH", result.get(1).getCode());
    }

    // ==================== getById ====================

    @Test
    void getById_found_returnsDTO() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));

        PaymentTypeDTO result = paymentTypeService.getById(paymentTypeId);

        assertNotNull(result);
        assertEquals(paymentTypeId, result.getId());
        assertEquals("BANK", result.getCode());
        assertTrue(result.getRequiresBankDetails());
    }

    @Test
    void getById_notFound_throwsRuntimeException() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.getById(paymentTypeId));
    }

    // ==================== getByCode ====================

    @Test
    void getByCode_found_returnsDTO() {
        when(paymentTypeRepository.findByCodeIgnoreCase("BANK"))
                .thenReturn(Optional.of(samplePaymentType));

        PaymentTypeDTO result = paymentTypeService.getByCode("BANK");

        assertNotNull(result);
        assertEquals("BANK", result.getCode());
    }

    @Test
    void getByCode_notFound_throwsRuntimeException() {
        when(paymentTypeRepository.findByCodeIgnoreCase("UNKNOWN"))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.getByCode("UNKNOWN"));
    }

    // ==================== create ====================

    @Test
    void create_duplicateCode_throwsRuntimeException() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("BANK")
                .name("Bank Transfer")
                .build();
        when(paymentTypeRepository.existsByCodeIgnoreCase("BANK")).thenReturn(true);

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.create(dto, "admin"));

        verify(paymentTypeRepository, never()).save(any());
    }

    @Test
    void create_success_savesWithUppercasedCode() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("cash")
                .name("Cash Payment")
                .description("Cash")
                .isActive(true)
                .requiresBankDetails(false)
                .requiresWalletDetails(false)
                .displayOrder(2)
                .build();
        when(paymentTypeRepository.existsByCodeIgnoreCase("cash")).thenReturn(false);
        when(paymentTypeRepository.save(any(PaymentType.class))).thenAnswer(invocation -> {
            PaymentType pt = invocation.getArgument(0);
            pt.setId(UUID.randomUUID());
            return pt;
        });

        PaymentTypeDTO result = paymentTypeService.create(dto, "admin");

        assertNotNull(result);
        ArgumentCaptor<PaymentType> captor = ArgumentCaptor.forClass(PaymentType.class);
        verify(paymentTypeRepository).save(captor.capture());
        assertEquals("CASH", captor.getValue().getCode());
        assertEquals("admin", captor.getValue().getCreatedBy());
    }

    @Test
    void create_nullIsActive_defaultsToTrue() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("wallt")
                .name("Wallet")
                .isActive(null)
                .requiresBankDetails(null)
                .requiresWalletDetails(null)
                .displayOrder(null)
                .build();
        when(paymentTypeRepository.existsByCodeIgnoreCase("wallt")).thenReturn(false);
        when(paymentTypeRepository.save(any(PaymentType.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentTypeService.create(dto, "admin");

        ArgumentCaptor<PaymentType> captor = ArgumentCaptor.forClass(PaymentType.class);
        verify(paymentTypeRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
        assertFalse(captor.getValue().getRequiresBankDetails());
        assertFalse(captor.getValue().getRequiresWalletDetails());
        assertEquals(0, captor.getValue().getDisplayOrder());
    }

    // ==================== update ====================

    @Test
    void update_notFound_throwsRuntimeException() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder().code("BANK").name("Bank").build();
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.update(paymentTypeId, dto, "admin"));
    }

    @Test
    void update_sameCodeAllowed_updatesSuccessfully() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("BANK")
                .name("Updated Bank Transfer")
                .description("Updated desc")
                .isActive(true)
                .requiresBankDetails(true)
                .requiresWalletDetails(false)
                .displayOrder(1)
                .build();
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));
        when(paymentTypeRepository.save(any(PaymentType.class))).thenReturn(samplePaymentType);

        PaymentTypeDTO result = paymentTypeService.update(paymentTypeId, dto, "updater");

        assertNotNull(result);
        // existsByCode should NOT be called since code didn't change (case-insensitive)
        verify(paymentTypeRepository, never()).existsByCodeIgnoreCase(any());
    }

    @Test
    void update_changedCodeDuplicate_throwsRuntimeException() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("CASH")
                .name("Cash")
                .isActive(true)
                .requiresBankDetails(false)
                .requiresWalletDetails(false)
                .displayOrder(1)
                .build();
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));
        when(paymentTypeRepository.existsByCodeIgnoreCase("CASH")).thenReturn(true);

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.update(paymentTypeId, dto, "admin"));

        verify(paymentTypeRepository, never()).save(any());
    }

    @Test
    void update_changedCodeNotDuplicate_updatesAllFields() {
        PaymentTypeDTO dto = PaymentTypeDTO.builder()
                .code("newcode")
                .name("New Name")
                .description("New Desc")
                .isActive(false)
                .requiresBankDetails(false)
                .requiresWalletDetails(true)
                .displayOrder(5)
                .build();
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));
        when(paymentTypeRepository.existsByCodeIgnoreCase("newcode")).thenReturn(false);
        when(paymentTypeRepository.save(any(PaymentType.class))).thenReturn(samplePaymentType);

        paymentTypeService.update(paymentTypeId, dto, "updater");

        ArgumentCaptor<PaymentType> captor = ArgumentCaptor.forClass(PaymentType.class);
        verify(paymentTypeRepository).save(captor.capture());
        assertEquals("NEWCODE", captor.getValue().getCode());
        assertEquals("New Name", captor.getValue().getName());
        assertFalse(captor.getValue().getIsActive());
        assertEquals("updater", captor.getValue().getUpdatedBy());
    }

    // ==================== deactivate ====================

    @Test
    void deactivate_notFound_throwsRuntimeException() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.deactivate(paymentTypeId, "admin"));
    }

    @Test
    void deactivate_success_setsIsActiveFalse() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));
        when(paymentTypeRepository.save(any(PaymentType.class))).thenReturn(samplePaymentType);

        paymentTypeService.deactivate(paymentTypeId, "admin");

        ArgumentCaptor<PaymentType> captor = ArgumentCaptor.forClass(PaymentType.class);
        verify(paymentTypeRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getUpdatedBy());
    }

    // ==================== activate ====================

    @Test
    void activate_notFound_throwsRuntimeException() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.activate(paymentTypeId, "admin"));
    }

    @Test
    void activate_success_setsIsActiveTrue() {
        PaymentType inactiveType = PaymentType.builder()
                .id(paymentTypeId)
                .code("CASH")
                .name("Cash")
                .isActive(false)
                .build();
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(inactiveType));
        when(paymentTypeRepository.save(any(PaymentType.class))).thenReturn(inactiveType);

        paymentTypeService.activate(paymentTypeId, "admin");

        ArgumentCaptor<PaymentType> captor = ArgumentCaptor.forClass(PaymentType.class);
        verify(paymentTypeRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getUpdatedBy());
    }

    // ==================== getEntityById ====================

    @Test
    void getEntityById_found_returnsPaymentTypeEntity() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.of(samplePaymentType));

        PaymentType result = paymentTypeService.getEntityById(paymentTypeId);

        assertNotNull(result);
        assertEquals(paymentTypeId, result.getId());
        assertEquals("BANK", result.getCode());
    }

    @Test
    void getEntityById_notFound_throwsRuntimeException() {
        when(paymentTypeRepository.findById(paymentTypeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> paymentTypeService.getEntityById(paymentTypeId));
    }
}