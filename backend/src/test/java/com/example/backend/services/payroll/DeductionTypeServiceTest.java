package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.site.SiteRepository;
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
public class DeductionTypeServiceTest {

    @Mock
    private DeductionTypeRepository deductionTypeRepository;

    @Mock
    private SiteRepository siteRepository;

    @InjectMocks
    private DeductionTypeService deductionTypeService;

    private UUID deductionTypeId;
    private DeductionType sampleDeductionType;

    @BeforeEach
    void setUp() {
        deductionTypeId = UUID.randomUUID();
        sampleDeductionType = buildDeductionType("HLTH", "Health Insurance",
                DeductionType.DeductionCategory.BENEFITS, false);
        sampleDeductionType.setId(deductionTypeId);
    }

    private DeductionType buildDeductionType(String code, String name,
                                              DeductionType.DeductionCategory category,
                                              boolean isSystemDefined) {
        DeductionType dt = new DeductionType();
        dt.setId(UUID.randomUUID());
        dt.setCode(code);
        dt.setName(name);
        dt.setDescription("Description of " + name);
        dt.setCategory(category);
        dt.setIsSystemDefined(isSystemDefined);
        dt.setIsActive(true);
        dt.setIsTaxable(false);
        dt.setShowOnPayslip(true);
        dt.setIsMandatory(false);
        dt.setIsPercentage(false);
        dt.setCreatedBy("SYSTEM");
        return dt;
    }

    // ==================== getAllActiveDeductionTypes ====================

    @Test
    void getAllActiveDeductionTypes_returnsMappedDTOs() {
        when(deductionTypeRepository.findAllActiveOrdered()).thenReturn(List.of(sampleDeductionType));

        List<DeductionTypeDTO> result = deductionTypeService.getAllActiveDeductionTypes();

        assertEquals(1, result.size());
        assertEquals("HLTH", result.get(0).getCode());
        verify(deductionTypeRepository).findAllActiveOrdered();
    }

    @Test
    void getAllActiveDeductionTypes_empty_returnsEmptyList() {
        when(deductionTypeRepository.findAllActiveOrdered()).thenReturn(Collections.emptyList());

        List<DeductionTypeDTO> result = deductionTypeService.getAllActiveDeductionTypes();

        assertTrue(result.isEmpty());
    }

    // ==================== getDeductionTypesForSite ====================

    @Test
    void getDeductionTypesForSite_returnsDTOsForSite() {
        UUID siteId = UUID.randomUUID();
        when(deductionTypeRepository.findActiveForSite(siteId)).thenReturn(List.of(sampleDeductionType));

        List<DeductionTypeDTO> result = deductionTypeService.getDeductionTypesForSite(siteId);

        assertEquals(1, result.size());
        verify(deductionTypeRepository).findActiveForSite(siteId);
    }

    @Test
    void getDeductionTypesForSite_none_returnsEmpty() {
        UUID siteId = UUID.randomUUID();
        when(deductionTypeRepository.findActiveForSite(siteId)).thenReturn(Collections.emptyList());

        List<DeductionTypeDTO> result = deductionTypeService.getDeductionTypesForSite(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getById ====================

    @Test
    void getById_found_returnsDTO() {
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(sampleDeductionType));

        DeductionTypeDTO result = deductionTypeService.getById(deductionTypeId);

        assertNotNull(result);
        assertEquals(deductionTypeId, result.getId());
        assertEquals("HLTH", result.getCode());
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> deductionTypeService.getById(deductionTypeId));
    }

    // ==================== getByCategory ====================

    @Test
    void getByCategory_returnsDTOsForCategory() {
        when(deductionTypeRepository.findByCategoryAndIsActiveTrue(DeductionType.DeductionCategory.BENEFITS))
                .thenReturn(List.of(sampleDeductionType));

        List<DeductionTypeDTO> result = deductionTypeService.getByCategory(DeductionType.DeductionCategory.BENEFITS);

        assertEquals(1, result.size());
        assertEquals(DeductionType.DeductionCategory.BENEFITS, result.get(0).getCategory());
    }

    // ==================== create ====================

    @Test
    void create_duplicateCode_throwsResourceAlreadyExistsException() {
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("HLTH")
                .name("Health")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .build();
        when(deductionTypeRepository.existsByCode("HLTH")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class,
                () -> deductionTypeService.create(dto, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void create_duplicateNameForSite_throwsResourceAlreadyExistsException() {
        UUID siteId = UUID.randomUUID();
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("NEWCODE")
                .name("Health Insurance")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .siteId(siteId)
                .build();
        when(deductionTypeRepository.existsByCode("NEWCODE")).thenReturn(false);
        when(deductionTypeRepository.existsByNameAndSiteId("Health Insurance", siteId)).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class,
                () -> deductionTypeService.create(dto, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void create_noSiteId_savesWithoutSite() {
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("CUST")
                .name("Custom Deduction")
                .category(DeductionType.DeductionCategory.VOLUNTARY)
                .isTaxable(false)
                .showOnPayslip(true)
                .build();
        when(deductionTypeRepository.existsByCode("CUST")).thenReturn(false);
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.create(dto, "admin");

        ArgumentCaptor<DeductionType> captor = ArgumentCaptor.forClass(DeductionType.class);
        verify(deductionTypeRepository).save(captor.capture());
        assertNull(captor.getValue().getSite());
        assertEquals("CUST", captor.getValue().getCode());
        assertFalse(captor.getValue().getIsSystemDefined());
        assertTrue(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getCreatedBy());
        verify(siteRepository, never()).findById(any());
    }

    @Test
    void create_withValidSiteId_setsSiteOnEntity() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("SITE_DED")
                .name("Site Deduction")
                .category(DeductionType.DeductionCategory.OTHER)
                .siteId(siteId)
                .build();
        when(deductionTypeRepository.existsByCode("SITE_DED")).thenReturn(false);
        when(deductionTypeRepository.existsByNameAndSiteId("Site Deduction", siteId)).thenReturn(false);
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.create(dto, "admin");

        ArgumentCaptor<DeductionType> captor = ArgumentCaptor.forClass(DeductionType.class);
        verify(deductionTypeRepository).save(captor.capture());
        assertNotNull(captor.getValue().getSite());
        assertEquals(siteId, captor.getValue().getSite().getId());
    }

    @Test
    void create_withInvalidSiteId_throwsResourceNotFoundException() {
        UUID siteId = UUID.randomUUID();
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("BADSIT")
                .name("Bad Site Deduction")
                .category(DeductionType.DeductionCategory.OTHER)
                .siteId(siteId)
                .build();
        when(deductionTypeRepository.existsByCode("BADSIT")).thenReturn(false);
        when(deductionTypeRepository.existsByNameAndSiteId("Bad Site Deduction", siteId)).thenReturn(false);
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> deductionTypeService.create(dto, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    // ==================== update ====================

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("HLTH")
                .name("Updated")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .build();
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> deductionTypeService.update(deductionTypeId, dto, "admin"));
    }

    @Test
    void update_systemDefinedAndChangedName_throwsIllegalStateException() {
        DeductionType systemDefined = buildDeductionType("TAX", "Income Tax",
                DeductionType.DeductionCategory.STATUTORY, true);
        systemDefined.setId(deductionTypeId);
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("TAX")
                .name("Changed Name")
                .category(DeductionType.DeductionCategory.STATUTORY)
                .isTaxable(true)
                .showOnPayslip(true)
                .build();
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(systemDefined));

        assertThrows(IllegalStateException.class,
                () -> deductionTypeService.update(deductionTypeId, dto, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void update_changedCodeDuplicate_throwsResourceAlreadyExistsException() {
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("TAX")
                .name("Health Insurance")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .isTaxable(false)
                .showOnPayslip(true)
                .build();
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(sampleDeductionType));
        when(deductionTypeRepository.existsByCode("TAX")).thenReturn(true);

        assertThrows(ResourceAlreadyExistsException.class,
                () -> deductionTypeService.update(deductionTypeId, dto, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void update_success_updatesAllFields() {
        DeductionTypeDTO dto = DeductionTypeDTO.builder()
                .code("HLTH2")
                .name("Health Insurance 2")
                .description("Updated description")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .isTaxable(true)
                .showOnPayslip(false)
                .build();
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(sampleDeductionType));
        when(deductionTypeRepository.existsByCode("HLTH2")).thenReturn(false);
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.update(deductionTypeId, dto, "updater");

        ArgumentCaptor<DeductionType> captor = ArgumentCaptor.forClass(DeductionType.class);
        verify(deductionTypeRepository).save(captor.capture());
        assertEquals("HLTH2", captor.getValue().getCode());
        assertEquals("updater", captor.getValue().getUpdatedBy());
        assertTrue(captor.getValue().getIsTaxable());
        assertFalse(captor.getValue().getShowOnPayslip());
    }

    // ==================== deactivate ====================

    @Test
    void deactivate_notFound_throwsResourceNotFoundException() {
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> deductionTypeService.deactivate(deductionTypeId, "admin"));
    }

    @Test
    void deactivate_loanCode_throwsIllegalStateException() {
        DeductionType loanType = buildDeductionType("LOAN", "Loan Repayment",
                DeductionType.DeductionCategory.LOANS, true);
        loanType.setId(deductionTypeId);
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(loanType));

        assertThrows(IllegalStateException.class,
                () -> deductionTypeService.deactivate(deductionTypeId, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void deactivate_systemDefined_throwsIllegalStateException() {
        DeductionType systemDefined = buildDeductionType("TAX", "Income Tax",
                DeductionType.DeductionCategory.STATUTORY, true);
        systemDefined.setId(deductionTypeId);
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(systemDefined));

        assertThrows(IllegalStateException.class,
                () -> deductionTypeService.deactivate(deductionTypeId, "admin"));

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void deactivate_success_setsIsActiveFalse() {
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(sampleDeductionType));
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.deactivate(deductionTypeId, "admin");

        ArgumentCaptor<DeductionType> captor = ArgumentCaptor.forClass(DeductionType.class);
        verify(deductionTypeRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getUpdatedBy());
    }

    // ==================== reactivate ====================

    @Test
    void reactivate_notFound_throwsResourceNotFoundException() {
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> deductionTypeService.reactivate(deductionTypeId, "admin"));
    }

    @Test
    void reactivate_success_setsIsActiveTrue() {
        sampleDeductionType.setIsActive(false);
        when(deductionTypeRepository.findById(deductionTypeId)).thenReturn(Optional.of(sampleDeductionType));
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.reactivate(deductionTypeId, "admin");

        ArgumentCaptor<DeductionType> captor = ArgumentCaptor.forClass(DeductionType.class);
        verify(deductionTypeRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
        assertEquals("admin", captor.getValue().getUpdatedBy());
    }

    // ==================== initializeSystemDeductionTypes ====================

    @Test
    void initializeSystemDeductionTypes_allExist_savesNothing() {
        // All 8 system types already exist
        when(deductionTypeRepository.existsByCode(anyString())).thenReturn(true);

        deductionTypeService.initializeSystemDeductionTypes();

        verify(deductionTypeRepository, never()).save(any());
    }

    @Test
    void initializeSystemDeductionTypes_noneExist_savesAllEightTypes() {
        when(deductionTypeRepository.existsByCode(anyString())).thenReturn(false);
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.initializeSystemDeductionTypes();

        verify(deductionTypeRepository, times(8)).save(any(DeductionType.class));
    }

    @Test
    void initializeSystemDeductionTypes_someExist_savesOnlyMissing() {
        // TAX exists, the rest do not
        when(deductionTypeRepository.existsByCode("TAX")).thenReturn(true);
        when(deductionTypeRepository.existsByCode(argThat(code -> !code.equals("TAX")))).thenReturn(false);
        when(deductionTypeRepository.save(any(DeductionType.class))).thenAnswer(inv -> inv.getArgument(0));

        deductionTypeService.initializeSystemDeductionTypes();

        verify(deductionTypeRepository, times(7)).save(any(DeductionType.class));
    }
}