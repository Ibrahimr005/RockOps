package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PaymentTypeRepository;
import com.example.backend.services.hr.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = EmployeeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmployeeService employeeService;

    @MockBean
    private PaymentTypeRepository paymentTypeRepository;

    @MockBean
    private EmployeePayrollRepository employeePayrollRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private Employee buildEmployee(UUID id, String firstName, String lastName) {
        Employee emp = new Employee();
        emp.setId(id);
        emp.setFirstName(firstName);
        emp.setLastName(lastName);
        emp.setStatus("ACTIVE");
        return emp;
    }

    // ==================== GET /api/v1/employees/warehouse-workers ====================

    @Test
    public void getWarehouseWorkers_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Ali", "Hassan");
        given(employeeService.getWarehouseWorkers()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/warehouse-workers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Ali"));
    }

    @Test
    public void getWarehouseWorkers_empty_shouldReturn200() throws Exception {
        given(employeeService.getWarehouseWorkers()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/warehouse-workers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/employees/warehouse-managers ====================

    @Test
    public void getWarehouseManagers_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Sara", "Ahmed");
        given(employeeService.getWarehouseManagers()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/warehouse-managers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Sara"));
    }

    @Test
    public void getWarehouseManagers_empty_shouldReturn200() throws Exception {
        given(employeeService.getWarehouseManagers()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/warehouse-managers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/employees/drivers ====================

    @Test
    public void getDrivers_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Omar", "Khalil");
        given(employeeService.getDrivers()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/drivers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Omar"));
    }

    @Test
    public void getDrivers_empty_shouldReturn200() throws Exception {
        given(employeeService.getDrivers()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/drivers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/employees/technicians ====================

    @Test
    public void getTechnicians_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Youssef", "Nabil");
        given(employeeService.getTechnicians()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/technicians")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Youssef"));
    }

    @Test
    public void getTechnicians_empty_shouldReturn200() throws Exception {
        given(employeeService.getTechnicians()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/technicians")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/employees/site/{siteId} ====================

    @Test
    public void getEmployeesBySite_shouldReturn200WithMappedList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Employee emp = buildEmployee(UUID.randomUUID(), "Fatima", "Mostafa");
        emp.setEmail("fatima@site.com");
        emp.setPhoneNumber("01012345678");

        given(employeeService.getEmployeesBySiteId(siteId)).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Fatima"))
                .andExpect(jsonPath("$[0].lastName").value("Mostafa"))
                .andExpect(jsonPath("$[0].email").value("fatima@site.com"));
    }

    @Test
    public void getEmployeesBySite_whenServiceThrows_shouldReturn500() throws Exception {
        UUID siteId = UUID.randomUUID();
        given(employeeService.getEmployeesBySiteId(siteId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/employees/by-contract-type/{contractType} ====================

    @Test
    public void getEmployeesByContractType_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Mona", "Ibrahim");
        given(employeeService.getEmployeesByContractType("MONTHLY")).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/by-contract-type/MONTHLY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getEmployeesByContractType_whenIllegalArgument_shouldReturn400() throws Exception {
        given(employeeService.getEmployeesByContractType("INVALID"))
                .willThrow(new IllegalArgumentException("Unknown contract type"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/by-contract-type/INVALID")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getEmployeesByContractType_whenUnexpectedException_shouldReturn500() throws Exception {
        given(employeeService.getEmployeesByContractType("DAILY"))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/by-contract-type/DAILY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/employees/grouped-by-contract ====================

    @Test
    public void getEmployeesGroupedByContractType_shouldReturn200() throws Exception {
        given(employeeService.getEmployees()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/grouped-by-contract")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }

    @Test
    public void getEmployeesGroupedByContractType_whenServiceThrows_shouldReturn500() throws Exception {
        given(employeeService.getEmployees()).willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/grouped-by-contract")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/employees/minimal ====================

    @Test
    public void getEmployeesMinimal_shouldReturn200WithList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Hana", "Salem");
        given(employeeService.getEmployees()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/minimal")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Hana"));
    }

    @Test
    public void getEmployeesMinimal_whenServiceThrows_shouldReturn500() throws Exception {
        given(employeeService.getEmployees()).willThrow(new RuntimeException("Service error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/minimal")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/employees/active/by-contract-type/{contractType} ====================

    @Test
    public void getActiveEmployeesByContractType_shouldReturn200WithActiveOnly() throws Exception {
        Employee active = buildEmployee(UUID.randomUUID(), "Karim", "Fathy");
        active.setStatus("ACTIVE");

        given(employeeService.getEmployeesByContractType("HOURLY")).willReturn(List.of(active));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/active/by-contract-type/HOURLY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getActiveEmployeesByContractType_whenIllegalArgument_shouldReturn400() throws Exception {
        given(employeeService.getEmployeesByContractType("WRONG"))
                .willThrow(new IllegalArgumentException("Invalid type"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/active/by-contract-type/WRONG")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void getActiveEmployeesByContractType_whenUnexpectedException_shouldReturn500() throws Exception {
        given(employeeService.getEmployeesByContractType("DAILY"))
                .willThrow(new RuntimeException("Unexpected"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees/active/by-contract-type/DAILY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/employees ====================

    @Test
    public void getEmployees_shouldReturn200WithMappedList() throws Exception {
        Employee emp = buildEmployee(UUID.randomUUID(), "Layla", "Ramadan");
        emp.setEmail("layla@site.com");
        given(employeeService.getEmployees()).willReturn(List.of(emp));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Layla"))
                .andExpect(jsonPath("$[0].email").value("layla@site.com"));
    }

    @Test
    public void getEmployees_empty_shouldReturn200EmptyList() throws Exception {
        given(employeeService.getEmployees()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== PUT /api/v1/employees/{employeeId}/payment-type ====================

    @Test
    public void updateEmployeePaymentType_whenEmployeeNotFound_shouldReturn404() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(employeeService.getEmployeeById(employeeId)).willReturn(null);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("bankName", "CIB");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/employees/{employeeId}/payment-type", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isNotFound());
    }

    @Test
    public void updateEmployeePaymentType_withBankDetailsOnly_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        Employee emp = buildEmployee(employeeId, "Nour", "Samir");

        given(employeeService.getEmployeeById(employeeId)).willReturn(emp);
        given(employeeService.saveEmployee(any(Employee.class))).willReturn(emp);
        given(employeePayrollRepository.findEditableByEmployeeId(employeeId))
                .willReturn(Collections.emptyList());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("bankName", "NBE");
        requestBody.put("bankAccountNumber", "1234567890");
        requestBody.put("bankAccountHolderName", "Nour Samir");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/employees/{employeeId}/payment-type", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(employeeId.toString()));
    }

    @Test
    public void updateEmployeePaymentType_whenExceptionThrown_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(employeeService.getEmployeeById(employeeId))
                .willThrow(new RuntimeException("Unexpected error"));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("bankName", "CIB");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/employees/{employeeId}/payment-type", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}