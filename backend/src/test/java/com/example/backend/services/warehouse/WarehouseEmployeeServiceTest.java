package com.example.backend.services.warehouse;

import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.warehouse.WarehouseEmployeeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WarehouseEmployeeServiceTest {

    @Mock
    private WarehouseEmployeeRepository warehouseEmployeeRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WarehouseEmployeeService warehouseEmployeeService;

    // ==================== assignEmployeeToWarehouse ====================

    @Test
    public void assignEmployeeToWarehouse_validEmployee_shouldAssign() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        User employee = createUser(employeeId, Role.WAREHOUSE_EMPLOYEE);
        Warehouse warehouse = createWarehouse(warehouseId, "Main Warehouse");

        when(userRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId)).thenReturn(false);
        when(warehouseEmployeeRepository.save(any(WarehouseEmployee.class))).thenAnswer(invocation -> {
            WarehouseEmployee we = invocation.getArgument(0);
            we.setId(UUID.randomUUID());
            return we;
        });

        WarehouseEmployee result = warehouseEmployeeService.assignEmployeeToWarehouse(employeeId, warehouseId, "admin");

        assertNotNull(result);
        assertEquals(employee, result.getUser());
        assertEquals(warehouse, result.getWarehouse());
        assertEquals("admin", result.getAssignedBy());
        verify(warehouseEmployeeRepository).save(any(WarehouseEmployee.class));
    }

    @Test
    public void assignEmployeeToWarehouse_wrongRole_shouldThrow() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        User nonWarehouseUser = createUser(employeeId, Role.HR_MANAGER);

        when(userRepository.findById(employeeId)).thenReturn(Optional.of(nonWarehouseUser));

        assertThrows(RuntimeException.class,
                () -> warehouseEmployeeService.assignEmployeeToWarehouse(employeeId, warehouseId, "admin"));
    }

    @Test
    public void assignEmployeeToWarehouse_employeeNotFound_shouldThrow() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        when(userRepository.findById(employeeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseEmployeeService.assignEmployeeToWarehouse(employeeId, warehouseId, "admin"));
    }

    @Test
    public void assignEmployeeToWarehouse_warehouseNotFound_shouldThrow() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        User employee = createUser(employeeId, Role.WAREHOUSE_EMPLOYEE);
        when(userRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseEmployeeService.assignEmployeeToWarehouse(employeeId, warehouseId, "admin"));
    }

    @Test
    public void assignEmployeeToWarehouse_alreadyAssigned_shouldThrow() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        User employee = createUser(employeeId, Role.WAREHOUSE_EMPLOYEE);
        Warehouse warehouse = createWarehouse(warehouseId, "Warehouse");

        when(userRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId)).thenReturn(true);

        assertThrows(RuntimeException.class,
                () -> warehouseEmployeeService.assignEmployeeToWarehouse(employeeId, warehouseId, "admin"));
    }

    // ==================== unassignEmployeeFromWarehouse ====================

    @Test
    public void unassignEmployee_validAssignment_shouldDelete() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .build();

        when(warehouseEmployeeRepository.findByUserIdAndWarehouseId(employeeId, warehouseId))
                .thenReturn(Optional.of(assignment));

        warehouseEmployeeService.unassignEmployeeFromWarehouse(employeeId, warehouseId);

        verify(warehouseEmployeeRepository).delete(assignment);
    }

    @Test
    public void unassignEmployee_noAssignment_shouldThrow() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        when(warehouseEmployeeRepository.findByUserIdAndWarehouseId(employeeId, warehouseId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> warehouseEmployeeService.unassignEmployeeFromWarehouse(employeeId, warehouseId));
    }

    // ==================== getWarehousesForEmployee ====================

    @Test
    public void getWarehousesForEmployee_shouldReturnWarehouses() {
        UUID employeeId = UUID.randomUUID();
        Warehouse wh1 = createWarehouse(UUID.randomUUID(), "WH1");
        Warehouse wh2 = createWarehouse(UUID.randomUUID(), "WH2");

        WarehouseEmployee we1 = WarehouseEmployee.builder().warehouse(wh1).build();
        WarehouseEmployee we2 = WarehouseEmployee.builder().warehouse(wh2).build();

        when(warehouseEmployeeRepository.findByUserIdWithWarehouse(employeeId))
                .thenReturn(List.of(we1, we2));

        List<Warehouse> result = warehouseEmployeeService.getWarehousesForEmployee(employeeId);

        assertEquals(2, result.size());
    }

    // ==================== getEmployeesForWarehouse ====================

    @Test
    public void getEmployeesForWarehouse_shouldReturnUsers() {
        UUID warehouseId = UUID.randomUUID();
        User user1 = createUser(UUID.randomUUID(), Role.WAREHOUSE_EMPLOYEE);
        User user2 = createUser(UUID.randomUUID(), Role.WAREHOUSE_EMPLOYEE);

        WarehouseEmployee we1 = WarehouseEmployee.builder().user(user1).build();
        WarehouseEmployee we2 = WarehouseEmployee.builder().user(user2).build();

        when(warehouseEmployeeRepository.findByWarehouseIdWithUser(warehouseId))
                .thenReturn(List.of(we1, we2));

        List<User> result = warehouseEmployeeService.getEmployeesForWarehouse(warehouseId);

        assertEquals(2, result.size());
    }

    // ==================== getAllWarehouseEmployees ====================

    @Test
    public void getAllWarehouseEmployees_shouldReturnAll() {
        List<User> employees = List.of(
                createUser(UUID.randomUUID(), Role.WAREHOUSE_EMPLOYEE),
                createUser(UUID.randomUUID(), Role.WAREHOUSE_EMPLOYEE)
        );
        when(userRepository.findByRole(Role.WAREHOUSE_EMPLOYEE)).thenReturn(employees);

        List<User> result = warehouseEmployeeService.getAllWarehouseEmployees();

        assertEquals(2, result.size());
    }

    // ==================== hasWarehouseAccess ====================

    @Test
    public void hasWarehouseAccess_hasAccess_shouldReturnTrue() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        when(warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId)).thenReturn(true);

        assertTrue(warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId));
    }

    @Test
    public void hasWarehouseAccess_noAccess_shouldReturnFalse() {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        when(warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId)).thenReturn(false);

        assertFalse(warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId));
    }

    // ==================== getAccessibleWarehouseIds ====================

    @Test
    public void getAccessibleWarehouseIds_shouldReturnIds() {
        UUID employeeId = UUID.randomUUID();
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID());

        when(warehouseEmployeeRepository.findWarehouseIdsByUserId(employeeId)).thenReturn(ids);

        List<UUID> result = warehouseEmployeeService.getAccessibleWarehouseIds(employeeId);

        assertEquals(2, result.size());
    }

    // ==================== isEmployeeAssignedToAnyWarehouse ====================

    @Test
    public void isEmployeeAssignedToAnyWarehouse_assigned_shouldReturnTrue() {
        UUID employeeId = UUID.randomUUID();
        when(warehouseEmployeeRepository.findByUserId(employeeId))
                .thenReturn(List.of(WarehouseEmployee.builder().build()));

        assertTrue(warehouseEmployeeService.isEmployeeAssignedToAnyWarehouse(employeeId));
    }

    @Test
    public void isEmployeeAssignedToAnyWarehouse_notAssigned_shouldReturnFalse() {
        UUID employeeId = UUID.randomUUID();
        when(warehouseEmployeeRepository.findByUserId(employeeId)).thenReturn(List.of());

        assertFalse(warehouseEmployeeService.isEmployeeAssignedToAnyWarehouse(employeeId));
    }

    // ==================== getEmployeeCountForWarehouse ====================

    @Test
    public void getEmployeeCountForWarehouse_shouldReturnCount() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseEmployeeRepository.findByWarehouseId(warehouseId))
                .thenReturn(List.of(
                        WarehouseEmployee.builder().build(),
                        WarehouseEmployee.builder().build(),
                        WarehouseEmployee.builder().build()
                ));

        assertEquals(3, warehouseEmployeeService.getEmployeeCountForWarehouse(warehouseId));
    }

    // ==================== getWarehouseCountForEmployee ====================

    @Test
    public void getWarehouseCountForEmployee_shouldReturnCount() {
        UUID employeeId = UUID.randomUUID();
        when(warehouseEmployeeRepository.findByUserId(employeeId))
                .thenReturn(List.of(WarehouseEmployee.builder().build()));

        assertEquals(1, warehouseEmployeeService.getWarehouseCountForEmployee(employeeId));
    }

    // ==================== Helpers ====================

    private User createUser(UUID id, Role role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setFirstName("Test");
        user.setLastName("User");
        user.setUsername("testuser");
        return user;
    }

    private Warehouse createWarehouse(UUID id, String name) {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName(name);
        return warehouse;
    }
}