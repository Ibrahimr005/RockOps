package com.example.backend.services.site;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.PartnerRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SitePartnerRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.persistence.EntityManager;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SiteAdminServiceTest {

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private FixedAssetsRepository fixedAssetsRepository;

    @Mock
    private SitePartnerRepository sitePartnerRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EntityIdGeneratorService idGeneratorService;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private SiteAdminService siteAdminService;

    // ==================== deleteSite ====================

    @Test
    public void deleteSite_emptysite_shouldDelete() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Empty Site");

        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        siteAdminService.deleteSite(id);

        verify(siteRepository).delete(site);
    }

    @Test
    public void deleteSite_hasEmployees_shouldThrow() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Site");
        site.setEmployees(List.of(new Employee()));

        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        assertThrows(RuntimeException.class, () -> siteAdminService.deleteSite(id));
        verify(siteRepository, never()).delete(any());
    }

    @Test
    public void deleteSite_hasEquipment_shouldThrow() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Site");
        site.setEquipment(List.of(new Equipment()));

        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        assertThrows(RuntimeException.class, () -> siteAdminService.deleteSite(id));
        verify(siteRepository, never()).delete(any());
    }

    @Test
    public void deleteSite_hasWarehouses_shouldThrow() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Site");
        site.setWarehouses(List.of(new Warehouse()));

        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        assertThrows(RuntimeException.class, () -> siteAdminService.deleteSite(id));
        verify(siteRepository, never()).delete(any());
    }

    @Test
    public void deleteSite_hasFixedAssets_shouldThrow() {
        UUID id = UUID.randomUUID();
        Site site = createSite(id, "Site");
        site.setFixedAssets(List.of(new FixedAssets()));

        when(siteRepository.findById(id)).thenReturn(Optional.of(site));

        assertThrows(RuntimeException.class, () -> siteAdminService.deleteSite(id));
        verify(siteRepository, never()).delete(any());
    }

    @Test
    public void deleteSite_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(siteRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> siteAdminService.deleteSite(id));
    }

    // ==================== updateSite ====================

    @Test
    public void updateSite_nameUpdate_shouldUpdate() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId, "Old Name");

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteRepository.save(any(Site.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> updates = new HashMap<>();
        updates.put("name", "New Name");

        Site result = siteAdminService.updateSite(siteId, updates);

        assertEquals("New Name", result.getName());
    }

    @Test
    public void updateSite_multipleFields_shouldUpdateAll() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId, "Old Name");

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteRepository.save(any(Site.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> updates = new HashMap<>();
        updates.put("name", "New Name");
        updates.put("physicalAddress", "123 Street");
        updates.put("companyAddress", "456 Avenue");

        Site result = siteAdminService.updateSite(siteId, updates);

        assertEquals("New Name", result.getName());
        assertEquals("123 Street", result.getPhysicalAddress());
        assertEquals("456 Avenue", result.getCompanyAddress());
    }

    @Test
    public void updateSite_invalidField_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId, "Site");

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));

        Map<String, Object> updates = new HashMap<>();
        updates.put("invalidField", "value");

        assertThrows(IllegalArgumentException.class,
                () -> siteAdminService.updateSite(siteId, updates));
    }

    @Test
    public void updateSite_notFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        Map<String, Object> updates = Map.of("name", "New");

        assertThrows(RuntimeException.class,
                () -> siteAdminService.updateSite(siteId, updates));
    }

    // ==================== assignEquipmentToSite ====================

    @Test
    public void assignEquipmentToSite_success_shouldAssign() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setModel("Excavator");
        equipment.setSite(null);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        Equipment result = siteAdminService.assignEquipmentToSite(siteId, equipmentId);

        assertEquals(site, result.getSite());
    }

    @Test
    public void assignEquipmentToSite_alreadyAssigned_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Site otherSite = createSite(UUID.randomUUID(), "Other Site");

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setModel("Excavator");
        equipment.setSite(otherSite);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));

        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEquipmentToSite(siteId, equipmentId));
    }

    @Test
    public void assignEquipmentToSite_siteNotFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEquipmentToSite(siteId, equipmentId));
    }

    @Test
    public void assignEquipmentToSite_equipmentNotFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEquipmentToSite(siteId, equipmentId));
    }

    @Test
    public void assignEquipmentToSite_nullIds_shouldThrow() {
        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEquipmentToSite(null, null));
    }

    // ==================== removeEquipmentFromSite ====================

    @Test
    public void removeEquipmentFromSite_success_shouldRemove() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setSite(site);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        Equipment result = siteAdminService.removeEquipmentFromSite(siteId, equipmentId);

        assertNull(result.getSite());
    }

    @Test
    public void removeEquipmentFromSite_notAssignedToSite_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setSite(null);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));

        assertThrows(RuntimeException.class,
                () -> siteAdminService.removeEquipmentFromSite(siteId, equipmentId));
    }

    @Test
    public void removeEquipmentFromSite_assignedToDifferentSite_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Site otherSite = createSite(UUID.randomUUID(), "Other Site");

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setSite(otherSite);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));

        assertThrows(RuntimeException.class,
                () -> siteAdminService.removeEquipmentFromSite(siteId, equipmentId));
    }

    // ==================== assignEmployeeToSite ====================

    @Test
    public void assignEmployeeToSite_success_shouldAssign() {
        UUID siteId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setSite(null);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArgument(0));

        Employee result = siteAdminService.assignEmployeeToSite(siteId, employeeId);

        assertEquals(site, result.getSite());
    }

    @Test
    public void assignEmployeeToSite_siteNotFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEmployeeToSite(siteId, employeeId));
    }

    @Test
    public void assignEmployeeToSite_employeeNotFound_shouldThrow() {
        UUID siteId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        Site site = createSite(siteId, "Site A");
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> siteAdminService.assignEmployeeToSite(siteId, employeeId));
    }

    // ==================== siteExists / equipmentExists ====================

    @Test
    public void siteExists_exists_shouldReturnTrue() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.existsById(siteId)).thenReturn(true);

        assertTrue(siteAdminService.siteExists(siteId));
    }

    @Test
    public void siteExists_notExists_shouldReturnFalse() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.existsById(siteId)).thenReturn(false);

        assertFalse(siteAdminService.siteExists(siteId));
    }

    @Test
    public void equipmentExists_exists_shouldReturnTrue() {
        UUID eqId = UUID.randomUUID();
        when(equipmentRepository.existsById(eqId)).thenReturn(true);

        assertTrue(siteAdminService.equipmentExists(eqId));
    }

    @Test
    public void equipmentExists_notExists_shouldReturnFalse() {
        UUID eqId = UUID.randomUUID();
        when(equipmentRepository.existsById(eqId)).thenReturn(false);

        assertFalse(siteAdminService.equipmentExists(eqId));
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