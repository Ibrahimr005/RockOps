package com.example.backend.services.hr;

import com.example.backend.models.hr.Department;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
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
public class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private DepartmentService departmentService;

    // ==================== getAllDepartmentsAsMap ====================

    @Test
    public void getAllDepartmentsAsMap_shouldReturnMaps() {
        Department dept = createDepartment("Engineering");
        when(departmentRepository.findAll()).thenReturn(List.of(dept));
        when(employeeRepository.countByJobPositionDepartmentName("Engineering")).thenReturn(5L);

        List<Map<String, Object>> result = departmentService.getAllDepartmentsAsMap();

        assertEquals(1, result.size());
        assertEquals("Engineering", result.get(0).get("name"));
    }

    @Test
    public void getAllDepartmentsAsMap_empty_shouldReturnEmpty() {
        when(departmentRepository.findAll()).thenReturn(List.of());

        List<Map<String, Object>> result = departmentService.getAllDepartmentsAsMap();

        assertTrue(result.isEmpty());
    }

    // ==================== getDepartmentByIdAsMap ====================

    @Test
    public void getDepartmentByIdAsMap_found_shouldReturnMap() {
        UUID id = UUID.randomUUID();
        Department dept = createDepartment("HR");
        dept.setId(id);
        when(departmentRepository.findById(id)).thenReturn(Optional.of(dept));
        when(employeeRepository.countByJobPositionDepartmentName("HR")).thenReturn(3L);

        Map<String, Object> result = departmentService.getDepartmentByIdAsMap(id);

        assertNotNull(result);
        assertEquals("HR", result.get("name"));
    }

    @Test
    public void getDepartmentByIdAsMap_notFound_shouldReturnNull() {
        UUID id = UUID.randomUUID();
        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        Map<String, Object> result = departmentService.getDepartmentByIdAsMap(id);

        assertNull(result);
    }

    // ==================== createDepartmentFromMap ====================

    @Test
    public void createDepartmentFromMap_success_shouldCreate() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Finance");
        data.put("description", "Finance department");

        when(departmentRepository.existsByNameIgnoreCase("Finance")).thenReturn(false);
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("DEPT-001");
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> {
            Department d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });
        when(employeeRepository.countByJobPositionDepartmentName("Finance")).thenReturn(0L);

        Map<String, Object> result = departmentService.createDepartmentFromMap(data);

        assertNotNull(result);
        assertEquals("Finance", result.get("name"));
    }

    @Test
    public void createDepartmentFromMap_nullName_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", null);

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.createDepartmentFromMap(data));
    }

    @Test
    public void createDepartmentFromMap_emptyName_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "  ");

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.createDepartmentFromMap(data));
    }

    @Test
    public void createDepartmentFromMap_duplicateName_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Engineering");

        when(departmentRepository.existsByNameIgnoreCase("Engineering")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.createDepartmentFromMap(data));
    }

    @Test
    public void createDepartmentFromMap_strategicDept_shouldSendExtraNotification() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Executive Board");

        when(departmentRepository.existsByNameIgnoreCase("Executive Board")).thenReturn(false);
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("DEPT-002");
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> {
            Department d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });
        when(employeeRepository.countByJobPositionDepartmentName("Executive Board")).thenReturn(0L);

        departmentService.createDepartmentFromMap(data);

        // Two notifications: one for creation, one for strategic
        verify(notificationService, atLeast(2)).sendNotificationToHRUsers(
                any(), any(), any(), any(), any());
    }

    // ==================== updateDepartmentFromMap ====================

    @Test
    public void updateDepartmentFromMap_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        Department existing = createDepartment("OldName");
        existing.setId(id);

        Map<String, Object> data = new HashMap<>();
        data.put("name", "NewName");

        when(departmentRepository.findById(id)).thenReturn(Optional.of(existing));
        when(departmentRepository.existsByNameIgnoreCase("NewName")).thenReturn(false);
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = departmentService.updateDepartmentFromMap(id, data);

        assertNotNull(result);
        assertEquals("NewName", result.get("name"));
    }

    @Test
    public void updateDepartmentFromMap_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        Map<String, Object> data = new HashMap<>();
        data.put("name", "Test");

        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> departmentService.updateDepartmentFromMap(id, data));
    }

    @Test
    public void updateDepartmentFromMap_emptyName_shouldThrow() {
        UUID id = UUID.randomUUID();
        Department existing = createDepartment("OldName");
        existing.setId(id);

        Map<String, Object> data = new HashMap<>();
        data.put("name", "  ");

        when(departmentRepository.findById(id)).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.updateDepartmentFromMap(id, data));
    }

    @Test
    public void updateDepartmentFromMap_duplicateName_shouldThrow() {
        UUID id = UUID.randomUUID();
        Department existing = createDepartment("OldName");
        existing.setId(id);

        Map<String, Object> data = new HashMap<>();
        data.put("name", "DuplicateName");

        when(departmentRepository.findById(id)).thenReturn(Optional.of(existing));
        when(departmentRepository.existsByNameIgnoreCase("DuplicateName")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.updateDepartmentFromMap(id, data));
    }

    // ==================== deleteDepartment ====================

    @Test
    public void deleteDepartment_noJobPositions_shouldDelete() {
        UUID id = UUID.randomUUID();
        Department dept = createDepartment("ToDelete");
        dept.setId(id);

        when(departmentRepository.findById(id)).thenReturn(Optional.of(dept));
        when(departmentRepository.countJobPositionsByDepartmentId(id)).thenReturn(0L);

        departmentService.deleteDepartment(id);

        verify(departmentRepository).delete(dept);
    }

    @Test
    public void deleteDepartment_withJobPositions_shouldThrow() {
        UUID id = UUID.randomUUID();
        Department dept = createDepartment("WithPositions");
        dept.setId(id);

        when(departmentRepository.findById(id)).thenReturn(Optional.of(dept));
        when(departmentRepository.countJobPositionsByDepartmentId(id)).thenReturn(3L);

        assertThrows(IllegalStateException.class,
                () -> departmentService.deleteDepartment(id));
        verify(departmentRepository, never()).delete(any());
    }

    @Test
    public void deleteDepartment_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> departmentService.deleteDepartment(id));
    }

    @Test
    public void deleteDepartment_strategicDept_shouldSendExtraNotification() {
        UUID id = UUID.randomUUID();
        Department dept = createDepartment("CEO Office");
        dept.setId(id);

        when(departmentRepository.findById(id)).thenReturn(Optional.of(dept));
        when(departmentRepository.countJobPositionsByDepartmentId(id)).thenReturn(0L);

        departmentService.deleteDepartment(id);

        verify(departmentRepository).delete(dept);
        // Two notifications: one for deletion, one for strategic removal
        verify(notificationService, atLeast(2)).sendNotificationToHRUsers(
                any(), any(), any(), any(), any());
    }

    // ==================== getAllDepartments (legacy) ====================

    @Test
    public void getAllDepartments_shouldReturnAll() {
        Department dept = createDepartment("Test");
        when(departmentRepository.findAll()).thenReturn(List.of(dept));

        List<Department> result = departmentService.getAllDepartments();

        assertEquals(1, result.size());
    }

    // ==================== getDepartmentById (legacy) ====================

    @Test
    public void getDepartmentById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Department dept = createDepartment("Found");
        when(departmentRepository.findById(id)).thenReturn(Optional.of(dept));

        Optional<Department> result = departmentService.getDepartmentById(id);

        assertTrue(result.isPresent());
    }

    @Test
    public void getDepartmentById_notFound_shouldReturnEmpty() {
        UUID id = UUID.randomUUID();
        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        Optional<Department> result = departmentService.getDepartmentById(id);

        assertTrue(result.isEmpty());
    }

    // ==================== createDepartment (legacy) ====================

    @Test
    public void createDepartment_success_shouldCreate() {
        Department dept = new Department();
        dept.setName("New Dept");

        when(entityIdGeneratorService.generateNextId(any())).thenReturn("DEPT-003");
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> {
            Department d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        Department result = departmentService.createDepartment(dept);

        assertNotNull(result);
        assertEquals("New Dept", result.getName());
    }

    @Test
    public void createDepartment_nullName_shouldThrow() {
        Department dept = new Department();
        dept.setName(null);

        assertThrows(IllegalArgumentException.class,
                () -> departmentService.createDepartment(dept));
    }

    // ==================== updateDepartment (legacy) ====================

    @Test
    public void updateDepartment_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        Department existing = createDepartment("Old");
        existing.setId(id);

        Department updates = new Department();
        updates.setName("Updated");

        when(departmentRepository.findById(id)).thenReturn(Optional.of(existing));
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> i.getArgument(0));

        Department result = departmentService.updateDepartment(id, updates);

        assertEquals("Updated", result.getName());
    }

    @Test
    public void updateDepartment_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        Department updates = new Department();
        updates.setName("Test");

        when(departmentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> departmentService.updateDepartment(id, updates));
    }

    // ==================== getTotalCount ====================

    @Test
    public void getTotalCount_shouldReturnCount() {
        when(departmentRepository.count()).thenReturn(5L);

        long result = departmentService.getTotalCount();

        assertEquals(5L, result);
    }

    @Test
    public void getTotalCount_error_shouldReturnZero() {
        when(departmentRepository.count()).thenThrow(new RuntimeException("DB error"));

        long result = departmentService.getTotalCount();

        assertEquals(0L, result);
    }

    // ==================== Helpers ====================

    private Department createDepartment(String name) {
        Department dept = Department.builder()
                .name(name)
                .description("Test description")
                .departmentNumber("DEPT-001")
                .jobPositions(new ArrayList<>())
                .build();
        dept.setId(UUID.randomUUID());
        return dept;
    }
}