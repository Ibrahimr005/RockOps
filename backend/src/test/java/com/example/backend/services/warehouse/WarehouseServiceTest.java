package com.example.backend.services.warehouse;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
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
public class WarehouseServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private NotificationService notificationService;


    @InjectMocks
    private WarehouseService warehouseService;

    // ==================== getAllWarehouses ====================

    @Test
    public void getAllWarehouses_shouldReturnFormattedList() {
        Warehouse wh = createWarehouseWithSite("Main WH", "Site A");
        wh.setEmployees(new ArrayList<>());

        when(warehouseRepository.findAll()).thenReturn(List.of(wh));

        List<Map<String, Object>> result = warehouseService.getAllWarehouses();

        assertEquals(1, result.size());
        assertEquals("Main WH", result.get(0).get("name"));
        assertNotNull(result.get(0).get("site"));
    }

    @Test
    public void getAllWarehouses_warehouseWithoutSite_shouldReturnNullSite() {
        Warehouse wh = new Warehouse();
        wh.setId(UUID.randomUUID());
        wh.setName("No Site WH");
        wh.setSite(null);
        wh.setEmployees(new ArrayList<>());

        when(warehouseRepository.findAll()).thenReturn(List.of(wh));

        List<Map<String, Object>> result = warehouseService.getAllWarehouses();

        assertEquals(1, result.size());
        assertNull(result.get(0).get("site"));
    }

    @Test
    public void getAllWarehouses_empty_shouldReturnEmptyList() {
        when(warehouseRepository.findAll()).thenReturn(List.of());

        List<Map<String, Object>> result = warehouseService.getAllWarehouses();

        assertTrue(result.isEmpty());
    }

    // ==================== getWarehouseById ====================

    @Test
    public void getWarehouseById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Warehouse wh = createWarehouseWithSite("WH1", "Site A");
        wh.setId(id);
        wh.setEmployees(new ArrayList<>());

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        Warehouse result = warehouseService.getWarehouseById(id);

        assertNotNull(result);
        assertEquals("WH1", result.getName());
    }

    @Test
    public void getWarehouseById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseService.getWarehouseById(id));
    }

    // ==================== getWarehouseDetails ====================

    @Test
    public void getWarehouseDetails_shouldReturnFormattedDetails() {
        UUID id = UUID.randomUUID();
        Warehouse wh = createWarehouseWithSite("WH1", "Site A");
        wh.setId(id);
        wh.setPhotoUrl("photo.jpg");
        wh.setEmployees(new ArrayList<>());

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        Map<String, Object> result = warehouseService.getWarehouseDetails(id);

        assertEquals("WH1", result.get("name"));
        assertEquals("photo.jpg", result.get("photoUrl"));
        assertNotNull(result.get("site"));
        assertNotNull(result.get("employees"));
    }

    @Test
    public void getWarehouseDetails_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseService.getWarehouseDetails(id));
    }

    // ==================== getEmployeesByWarehouseId ====================

    @Test
    public void getEmployeesByWarehouseId_shouldReturnEmployees() {
        UUID warehouseId = UUID.randomUUID();
        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        emp.setFirstName("John");

        Warehouse wh = new Warehouse();
        wh.setId(warehouseId);
        wh.setName("WH");
        wh.setEmployees(List.of(emp));

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(wh));

        List<Employee> result = warehouseService.getEmployeesByWarehouseId(warehouseId);

        assertEquals(1, result.size());
        assertEquals("John", result.get(0).getFirstName());
    }

    // ==================== getWarehousesBySite ====================

    @Test
    public void getWarehousesBySite_shouldReturnWarehouses() {
        UUID siteId = UUID.randomUUID();
        Warehouse wh = new Warehouse();
        wh.setName("WH");

        when(warehouseRepository.findBySiteId(siteId)).thenReturn(List.of(wh));

        List<Warehouse> result = warehouseService.getWarehousesBySite(siteId);

        assertEquals(1, result.size());
    }

    // ==================== updateWarehouse ====================

    @Test
    public void updateWarehouse_basicFields_shouldUpdate() {
        UUID id = UUID.randomUUID();
        Warehouse existing = createWarehouseWithSite("Old Name", "Site A");
        existing.setId(id);
        existing.setEmployees(new ArrayList<>());

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(existing));
        when(warehouseRepository.save(any(Warehouse.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> data = new HashMap<>();
        data.put("name", "New Name");
        data.put("photoUrl", "new-photo.jpg");

        Warehouse result = warehouseService.updateWarehouse(id, data);

        assertEquals("New Name", result.getName());
        assertEquals("new-photo.jpg", result.getPhotoUrl());
    }

    @Test
    public void updateWarehouse_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseService.updateWarehouse(id, new HashMap<>()));
    }

    // ==================== deleteWarehouse ====================

    @Test
    public void deleteWarehouse_noEmployeesNoItems_shouldDelete() {
        UUID id = UUID.randomUUID();
        Warehouse wh = createWarehouseWithSite("WH", "Site A");
        wh.setId(id);
        wh.setEmployees(new ArrayList<>());
        wh.setItems(new ArrayList<>());
        wh.setEmployeeAssignments(new ArrayList<>());

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        warehouseService.deleteWarehouse(id);

        verify(warehouseRepository).delete(wh);
    }

    @Test
    public void deleteWarehouse_hasEmployees_shouldThrow() {
        UUID id = UUID.randomUUID();
        Warehouse wh = new Warehouse();
        wh.setId(id);
        wh.setName("WH");

        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        wh.setEmployees(List.of(emp));

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        assertThrows(RuntimeException.class,
                () -> warehouseService.deleteWarehouse(id));
        verify(warehouseRepository, never()).delete(any());
    }

    @Test
    public void deleteWarehouse_hasItems_shouldThrow() {
        UUID id = UUID.randomUUID();
        Warehouse wh = new Warehouse();
        wh.setId(id);
        wh.setName("WH");
        wh.setEmployees(new ArrayList<>());
        wh.setItems(List.of(new Item()));

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        assertThrows(RuntimeException.class,
                () -> warehouseService.deleteWarehouse(id));
        verify(warehouseRepository, never()).delete(any());
    }

    @Test
    public void deleteWarehouse_hasAssignments_shouldThrow() {
        UUID id = UUID.randomUUID();
        Warehouse wh = new Warehouse();
        wh.setId(id);
        wh.setName("WH");
        wh.setEmployees(new ArrayList<>());
        wh.setItems(new ArrayList<>());
        wh.setEmployeeAssignments(List.of(new WarehouseEmployee()));

        when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

        assertThrows(RuntimeException.class,
                () -> warehouseService.deleteWarehouse(id));
        verify(warehouseRepository, never()).delete(any());
    }

    @Test
    public void deleteWarehouse_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseService.deleteWarehouse(id));
    }

    // ==================== Helpers ====================

    private Warehouse createWarehouseWithSite(String name, String siteName) {
        Site site = new Site();
        site.setId(UUID.randomUUID());
        site.setName(siteName);

        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName(name);
        warehouse.setSite(site);
        return warehouse;
    }
}