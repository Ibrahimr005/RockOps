package com.example.backend.services.site;

import com.example.backend.models.Partner;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.site.SitePartnerId;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.PartnerRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.MinioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SiteServiceTest {

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private FixedAssetsRepository fixedAssetsRepository;

    @Mock
    private MinioService minioService;

    @InjectMocks
    private SiteService siteService;

    // ==================== getSiteById ====================

    @Test
    public void getSiteById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Site A");
        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        Site result = siteService.getSiteById(id);

        assertNotNull(result);
        assertEquals("Site A", result.getName());
    }

    @Test
    public void getSiteById_notFound_shouldReturnNull() {
        UUID id = UUID.randomUUID();
        when(siteRepository.findById(id)).thenReturn(Optional.empty());

        Site result = siteService.getSiteById(id);

        assertNull(result);
    }

    // ==================== getAllSites ====================

    @Test
    public void getAllSites_shouldReturnAllWithCounts() {
        Site site = createSite(UUID.randomUUID(), "Site A");
        site.setEquipment(List.of(new Equipment()));
        site.setEmployees(List.of(new Employee()));
        site.setWarehouses(List.of(new Warehouse()));
        site.setMerchants(List.of(new Merchant()));

        when(siteRepository.findAll()).thenReturn(List.of(site));

        List<Site> result = siteService.getAllSites();

        assertEquals(1, result.size());
        assertEquals(1, result.get(0).getEquipmentCount());
        assertEquals(1, result.get(0).getEmployeeCount());
        assertEquals(1, result.get(0).getWarehouseCount());
        assertEquals(1, result.get(0).getMerchantCount());
    }

    @Test
    public void getAllSites_empty_shouldReturnEmpty() {
        when(siteRepository.findAll()).thenReturn(List.of());

        List<Site> result = siteService.getAllSites();

        assertTrue(result.isEmpty());
    }

    // ==================== getSiteEquipments ====================

    @Test
    public void getSiteEquipments_siteExists_shouldReturnEquipment() {
        UUID siteId = UUID.randomUUID();
        Equipment eq = new Equipment();
        eq.setName("Excavator");

        Site site = createSite(siteId, "Site A");
        site.setEquipment(List.of(eq));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<Equipment> result = siteService.getSiteEquipments(siteId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSiteEquipments_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<Equipment> result = siteService.getSiteEquipments(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getSiteEmployees ====================

    @Test
    public void getSiteEmployees_siteExists_shouldReturnEmployees() {
        UUID siteId = UUID.randomUUID();
        Employee emp = new Employee();
        emp.setFirstName("John");

        Site site = createSite(siteId, "Site A");
        site.setEmployees(List.of(emp));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<Employee> result = siteService.getSiteEmployees(siteId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSiteEmployees_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<Employee> result = siteService.getSiteEmployees(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getSiteWarehouses ====================

    @Test
    public void getSiteWarehouses_siteExists_shouldReturnWarehouses() {
        UUID siteId = UUID.randomUUID();
        Warehouse wh = new Warehouse();

        Site site = createSite(siteId, "Site A");
        site.setWarehouses(List.of(wh));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<Warehouse> result = siteService.getSiteWarehouses(siteId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSiteWarehouses_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<Warehouse> result = siteService.getSiteWarehouses(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getSiteMerchants ====================

    @Test
    public void getSiteMerchants_siteExists_shouldReturnMerchants() {
        UUID siteId = UUID.randomUUID();
        Merchant merchant = new Merchant();

        Site site = createSite(siteId, "Site A");
        site.setMerchants(List.of(merchant));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<Merchant> result = siteService.getSiteMerchants(siteId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSiteMerchants_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<Merchant> result = siteService.getSiteMerchants(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getSiteFixedAssets ====================

    @Test
    public void getSiteFixedAssets_siteExists_shouldReturnAssets() {
        UUID siteId = UUID.randomUUID();
        FixedAssets asset = new FixedAssets();

        Site site = createSite(siteId, "Site A");
        site.setFixedAssets(List.of(asset));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<FixedAssets> result = siteService.getSiteFixedAssets(siteId);

        assertEquals(1, result.size());
    }

    @Test
    public void getSiteFixedAssets_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<FixedAssets> result = siteService.getSiteFixedAssets(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getUnassignedFixedAssets ====================

    @Test
    public void getUnassignedFixedAssets_shouldReturnUnassigned() {
        FixedAssets asset = new FixedAssets();
        when(fixedAssetsRepository.findBySiteIsNullAndStatusNot(AssetStatus.DISPOSED)).thenReturn(List.of(asset));

        List<FixedAssets> result = siteService.getUnassignedFixedAssets();

        assertEquals(1, result.size());
    }

    // ==================== getSitePartners ====================

    @Test
    public void getSitePartners_siteExists_shouldReturnPartners() {
        UUID siteId = UUID.randomUUID();
        Partner partner = new Partner();
        partner.setId(1);
        partner.setFirstName("John");
        partner.setLastName("Doe");

        SitePartner sitePartner = new SitePartner();
        sitePartner.setPartner(partner);
        sitePartner.setPercentage(50.0);

        Site site = createSite(siteId, "Site A");
        site.setSitePartners(List.of(sitePartner));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        List<Map<String, Object>> result = siteService.getSitePartners(siteId);

        assertEquals(1, result.size());
        assertEquals("John", result.get(0).get("firstName"));
        assertEquals(50.0, result.get(0).get("percentage"));
    }

    @Test
    public void getSitePartners_siteNotFound_shouldReturnEmpty() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        List<Map<String, Object>> result = siteService.getSitePartners(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getUnassignedSitePartners ====================

    @Test
    public void getUnassignedSitePartners_shouldReturnUnassigned() {
        UUID siteId = UUID.randomUUID();

        Partner assignedPartner = new Partner();
        assignedPartner.setId(1);

        SitePartner sitePartner = new SitePartner();
        sitePartner.setPartner(assignedPartner);

        Partner unassignedPartner = new Partner();
        unassignedPartner.setId(2);
        unassignedPartner.setFirstName("Jane");
        unassignedPartner.setLastName("Smith");

        Site site = createSite(siteId, "Site A");
        site.setSitePartners(List.of(sitePartner));

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(partnerRepository.findByIdNotIn(List.of(1))).thenReturn(List.of(unassignedPartner));

        List<Map<String, Object>> result = siteService.getUnassignedSitePartners(siteId);

        assertEquals(1, result.size());
        assertEquals("Jane", result.get(0).get("firstName"));
    }

    @Test
    public void getUnassignedSitePartners_noPartnersAssigned_shouldReturnAll() {
        UUID siteId = UUID.randomUUID();

        Partner partner = new Partner();
        partner.setId(1);
        partner.setFirstName("John");
        partner.setLastName("Doe");

        Site site = createSite(siteId, "Site A");
        site.setSitePartners(new ArrayList<>());

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(partnerRepository.findAll()).thenReturn(List.of(partner));

        List<Map<String, Object>> result = siteService.getUnassignedSitePartners(siteId);

        assertEquals(1, result.size());
    }

    // ==================== getUnassignedEmployees ====================

    @Test
    public void getUnassignedEmployees_shouldReturnUnassigned() {
        Employee emp = new Employee();
        emp.setFirstName("John");
        emp.setLastName("Doe");

        when(employeeRepository.findUnassignedEmployeesNotAssignedAsDrivers()).thenReturn(List.of(emp));

        List<Employee> result = siteService.getUnassignedEmployees();

        assertEquals(1, result.size());
    }

    // ==================== getUnassignedEquipment ====================

    @Test
    public void getUnassignedEquipment_shouldReturnUnassigned() {
        Equipment eq = new Equipment();
        eq.setName("Excavator");

        when(equipmentRepository.findBySiteIsNull()).thenReturn(List.of(eq));

        List<Equipment> result = siteService.getUnassignedEquipment();

        assertEquals(1, result.size());
    }

    // ==================== Helper ====================

    private Site createSite(UUID id, String name) {
        Site site = new Site();
        site.setId(id);
        site.setName(name);
        site.setEquipment(new ArrayList<>());
        site.setEmployees(new ArrayList<>());
        site.setWarehouses(new ArrayList<>());
        site.setMerchants(new ArrayList<>());
        site.setFixedAssets(new ArrayList<>());
        site.setSitePartners(new ArrayList<>());
        return site;
    }
}