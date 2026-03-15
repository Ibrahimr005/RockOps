package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.BonusType;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.BonusTypeRepository;
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
public class BonusTypeServiceTest {

    @Mock
    private BonusTypeRepository bonusTypeRepository;

    @Mock
    private BonusRepository bonusRepository;

    @InjectMocks
    private BonusTypeService bonusTypeService;

    private UUID bonusTypeId;
    private BonusType sampleBonusType;

    @BeforeEach
    void setUp() {
        bonusTypeId = UUID.randomUUID();
        sampleBonusType = BonusType.builder()
                .id(bonusTypeId)
                .code("PERF")
                .name("Performance Bonus")
                .description("Year-end performance bonus")
                .isActive(true)
                .createdBy("admin")
                .build();
    }

    // ==================== getAllBonusTypes ====================

    @Test
    void getAllBonusTypes_returnsMappedDTOs() {
        BonusType second = BonusType.builder()
                .id(UUID.randomUUID())
                .code("XMAS")
                .name("Christmas Bonus")
                .description("Holiday bonus")
                .isActive(true)
                .build();
        when(bonusTypeRepository.findAll()).thenReturn(List.of(sampleBonusType, second));

        List<BonusTypeDTO> result = bonusTypeService.getAllBonusTypes();

        assertEquals(2, result.size());
        assertEquals("PERF", result.get(0).getCode());
        assertEquals("XMAS", result.get(1).getCode());
        verify(bonusTypeRepository).findAll();
    }

    @Test
    void getAllBonusTypes_emptyList_returnsEmpty() {
        when(bonusTypeRepository.findAll()).thenReturn(Collections.emptyList());

        List<BonusTypeDTO> result = bonusTypeService.getAllBonusTypes();

        assertTrue(result.isEmpty());
    }

    // ==================== getActiveBonusTypes ====================

    @Test
    void getActiveBonusTypes_returnsOnlyActiveOnes() {
        when(bonusTypeRepository.findByIsActiveTrue()).thenReturn(List.of(sampleBonusType));

        List<BonusTypeDTO> result = bonusTypeService.getActiveBonusTypes();

        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
        verify(bonusTypeRepository).findByIsActiveTrue();
    }

    @Test
    void getActiveBonusTypes_noneActive_returnsEmpty() {
        when(bonusTypeRepository.findByIsActiveTrue()).thenReturn(Collections.emptyList());

        List<BonusTypeDTO> result = bonusTypeService.getActiveBonusTypes();

        assertTrue(result.isEmpty());
    }

    // ==================== getById ====================

    @Test
    void getById_found_returnsDTO() {
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));

        BonusTypeDTO result = bonusTypeService.getById(bonusTypeId);

        assertNotNull(result);
        assertEquals(bonusTypeId, result.getId());
        assertEquals("PERF", result.getCode());
        assertEquals("Performance Bonus", result.getName());
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bonusTypeService.getById(bonusTypeId));
    }

    // ==================== create ====================

    @Test
    void create_happyPath_savesWithUppercasedCode() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("perf")
                .name("Performance Bonus")
                .description("A bonus")
                .build();

        when(bonusTypeRepository.existsByCode("PERF")).thenReturn(false);
        when(bonusTypeRepository.save(any(BonusType.class))).thenAnswer(invocation -> {
            BonusType saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        BonusTypeDTO result = bonusTypeService.create(dto, "admin");

        assertNotNull(result);
        ArgumentCaptor<BonusType> captor = ArgumentCaptor.forClass(BonusType.class);
        verify(bonusTypeRepository).save(captor.capture());
        assertEquals("PERF", captor.getValue().getCode());
        assertEquals("admin", captor.getValue().getCreatedBy());
        assertTrue(captor.getValue().getIsActive());
    }

    @Test
    void create_duplicateCode_throwsResourceAlreadyExistsException() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("PERF")
                .name("Performance Bonus")
                .build();

        when(bonusTypeRepository.existsByCode("PERF")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class,
                () -> bonusTypeService.create(dto, "admin"));

        verify(bonusTypeRepository, never()).save(any());
    }

    // ==================== update ====================

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("PERF")
                .name("Updated Name")
                .build();
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bonusTypeService.update(bonusTypeId, dto, "admin"));
    }

    @Test
    void update_sameCodeAllowed_updatesSuccessfully() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("PERF")
                .name("Updated Performance Bonus")
                .description("Updated description")
                .build();
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));
        when(bonusTypeRepository.save(any(BonusType.class))).thenReturn(sampleBonusType);

        BonusTypeDTO result = bonusTypeService.update(bonusTypeId, dto, "updater");

        assertNotNull(result);
        // existsByCode must NOT be called since code didn't change (case-insensitive match)
        verify(bonusTypeRepository, never()).existsByCode(any());
    }

    @Test
    void update_changedCodeDuplicate_throwsResourceAlreadyExistsException() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("XMAS")
                .name("Some Name")
                .build();
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));
        when(bonusTypeRepository.existsByCode("XMAS")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class,
                () -> bonusTypeService.update(bonusTypeId, dto, "admin"));

        verify(bonusTypeRepository, never()).save(any());
    }

    @Test
    void update_changedCodeNotDuplicate_updatesSuccessfully() {
        BonusTypeDTO dto = BonusTypeDTO.builder()
                .code("new")
                .name("New Name")
                .description("New Desc")
                .build();
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));
        when(bonusTypeRepository.existsByCode("NEW")).thenReturn(false);
        when(bonusTypeRepository.save(any(BonusType.class))).thenReturn(sampleBonusType);

        bonusTypeService.update(bonusTypeId, dto, "updater");

        ArgumentCaptor<BonusType> captor = ArgumentCaptor.forClass(BonusType.class);
        verify(bonusTypeRepository).save(captor.capture());
        assertEquals("NEW", captor.getValue().getCode());
        assertEquals("updater", captor.getValue().getUpdatedBy());
    }

    // ==================== deactivate ====================

    @Test
    void deactivate_notFound_throwsResourceNotFoundException() {
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bonusTypeService.deactivate(bonusTypeId, "admin"));
    }

    @Test
    void deactivate_hasActiveBonuses_throwsIllegalStateException() {
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));
        when(bonusRepository.findActiveBonusesByBonusTypeId(bonusTypeId))
                .thenReturn(List.of(mock(Bonus.class)));

        assertThrows(IllegalStateException.class,
                () -> bonusTypeService.deactivate(bonusTypeId, "admin"));

        verify(bonusTypeRepository, never()).save(any());
    }

    @Test
    void deactivate_noActiveBonuses_setsIsActiveFalse() {
        when(bonusTypeRepository.findById(bonusTypeId)).thenReturn(Optional.of(sampleBonusType));
        when(bonusRepository.findActiveBonusesByBonusTypeId(bonusTypeId))
                .thenReturn(Collections.emptyList());
        when(bonusTypeRepository.save(any(BonusType.class))).thenReturn(sampleBonusType);

        bonusTypeService.deactivate(bonusTypeId, "admin");

        ArgumentCaptor<BonusType> captor = ArgumentCaptor.forClass(BonusType.class);
        verify(bonusTypeRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getUpdatedBy());
    }
}