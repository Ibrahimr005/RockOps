package com.example.backend.services.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProcurementTeamServiceTest {

    @Mock
    private EntityIdGeneratorService idGeneratorService;

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private ItemCategoryRepository itemCategoryRepository;

    @InjectMocks
    private ProcurementTeamService procurementTeamService;

    // ==================== addMerchant ====================

    @Test
    public void addMerchant_basicInfo_shouldCreate() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Supplier A");
        data.put("merchantTypes", List.of("SUPPLIER"));

        when(idGeneratorService.generateNextId(any())).thenReturn("MRC-001");
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> {
            Merchant m = i.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });

        Merchant result = procurementTeamService.addMerchant(data);

        assertNotNull(result);
        assertEquals("Supplier A", result.getName());
        verify(merchantRepository, times(2)).save(any(Merchant.class));
    }

    @Test
    public void addMerchant_withSitesAndCategories_shouldCreate() {
        UUID siteId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Site site = new Site();
        site.setId(siteId);
        site.setName("Site A");

        ItemCategory category = new ItemCategory();
        category.setId(categoryId);
        category.setName("Building Materials");

        Map<String, Object> data = new HashMap<>();
        data.put("name", "Supplier B");
        data.put("merchantTypes", List.of("SUPPLIER"));
        data.put("siteIds", List.of(siteId.toString()));
        data.put("itemCategoryIds", categoryId.toString());

        when(idGeneratorService.generateNextId(any())).thenReturn("MRC-002");
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> {
            Merchant m = i.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(itemCategoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

        Merchant result = procurementTeamService.addMerchant(data);

        assertNotNull(result);
        verify(siteRepository).findById(siteId);
        verify(itemCategoryRepository).findById(categoryId);
    }

    @Test
    public void addMerchant_siteNotFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();

        Map<String, Object> data = new HashMap<>();
        data.put("name", "Supplier C");
        data.put("merchantTypes", List.of("SUPPLIER"));
        data.put("siteIds", List.of(siteId.toString()));

        when(idGeneratorService.generateNextId(any())).thenReturn("MRC-003");
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> {
            Merchant m = i.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> procurementTeamService.addMerchant(data));
    }

    @Test
    public void addMerchant_categoryNotFound_shouldThrow() {
        UUID categoryId = UUID.randomUUID();

        Map<String, Object> data = new HashMap<>();
        data.put("name", "Supplier D");
        data.put("merchantTypes", List.of("SUPPLIER"));
        data.put("itemCategoryIds", categoryId.toString());

        when(idGeneratorService.generateNextId(any())).thenReturn("MRC-004");
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> {
            Merchant m = i.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        when(itemCategoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> procurementTeamService.addMerchant(data));
    }

    // ==================== updateMerchant ====================

    @Test
    public void updateMerchant_name_shouldUpdate() {
        UUID id = UUID.randomUUID();
        Merchant existing = createMerchant(id, "Old Name");

        Map<String, Object> data = new HashMap<>();
        data.put("name", "New Name");

        when(merchantRepository.findById(id)).thenReturn(Optional.of(existing));
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> i.getArgument(0));

        Merchant result = procurementTeamService.updateMerchant(id, data);

        assertEquals("New Name", result.getName());
    }

    @Test
    public void updateMerchant_withSites_shouldUpdateSites() {
        UUID id = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Merchant existing = createMerchant(id, "Supplier A");

        Site site = new Site();
        site.setId(siteId);
        site.setName("New Site");

        Map<String, Object> data = new HashMap<>();
        data.put("siteIds", List.of(siteId.toString()));

        when(merchantRepository.findById(id)).thenReturn(Optional.of(existing));
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(merchantRepository.save(any(Merchant.class))).thenAnswer(i -> i.getArgument(0));

        Merchant result = procurementTeamService.updateMerchant(id, data);

        assertEquals(1, result.getSites().size());
    }

    @Test
    public void updateMerchant_nullId_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Test");

        assertThrows(RuntimeException.class, () -> procurementTeamService.updateMerchant(null, data));
    }

    @Test
    public void updateMerchant_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Test");

        when(merchantRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> procurementTeamService.updateMerchant(id, data));
    }

    // ==================== deleteMerchant ====================

    @Test
    public void deleteMerchant_success_shouldDelete() {
        UUID id = UUID.randomUUID();
        Merchant merchant = createMerchant(id, "Supplier A");

        when(merchantRepository.findById(id)).thenReturn(Optional.of(merchant));

        procurementTeamService.deleteMerchant(id);

        verify(merchantRepository).delete(merchant);
    }

    @Test
    public void deleteMerchant_nullId_shouldThrow() {
        assertThrows(RuntimeException.class, () -> procurementTeamService.deleteMerchant(null));
    }

    @Test
    public void deleteMerchant_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(merchantRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> procurementTeamService.deleteMerchant(id));
    }

    // ==================== Helpers ====================

    private Merchant createMerchant(UUID id, String name) {
        Merchant merchant = new Merchant();
        merchant.setId(id);
        merchant.setName(name);
        merchant.setSites(new ArrayList<>());
        merchant.setItemCategories(new ArrayList<>());
        merchant.setContacts(new ArrayList<>());
        merchant.setDocuments(new ArrayList<>());
        return merchant;
    }
}