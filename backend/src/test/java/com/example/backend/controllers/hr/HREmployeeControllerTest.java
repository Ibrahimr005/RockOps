package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.SalaryStatisticsDTO;
import com.example.backend.dto.hr.employee.EmployeeDistributionDTO;
import com.example.backend.services.FileStorageService;
import com.example.backend.services.hr.HREmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = HREmployeeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class HREmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HREmployeeService hrEmployeeService;

    @MockBean
    private FileStorageService fileStorageService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // ==================== GET /api/v1/hr/dashboard/salary-statistics ====================

    @Test
    public void getSalaryStatistics_shouldReturn200WithDTO() throws Exception {
        SalaryStatisticsDTO dto = SalaryStatisticsDTO.builder()
                .averageSalary(new BigDecimal("5000.00"))
                .totalSalaries(new BigDecimal("250000.00"))
                .employeeCount(50)
                .minSalary(new BigDecimal("2000.00"))
                .maxSalary(new BigDecimal("15000.00"))
                .build();

        given(hrEmployeeService.getSalaryStatistics()).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/dashboard/salary-statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageSalary").value(5000.00))
                .andExpect(jsonPath("$.employeeCount").value(50));
    }

    @Test
    public void getSalaryStatistics_whenServiceReturnsEmpty_shouldReturn200() throws Exception {
        SalaryStatisticsDTO emptyDto = SalaryStatisticsDTO.builder()
                .employeeCount(0)
                .build();

        given(hrEmployeeService.getSalaryStatistics()).willReturn(emptyDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/dashboard/salary-statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeCount").value(0));
    }

    // ==================== GET /api/v1/hr/dashboard/employee-distribution ====================

    @Test
    public void getEmployeeDistribution_shouldReturn200WithList() throws Exception {
        EmployeeDistributionDTO dto = EmployeeDistributionDTO.builder()
                .siteName("Site Alpha")
                .siteLocation("Cairo")
                .totalEmployees(30)
                .build();

        given(hrEmployeeService.getEmployeeDistribution()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/dashboard/employee-distribution")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].siteName").value("Site Alpha"))
                .andExpect(jsonPath("$[0].totalEmployees").value(30));
    }

    @Test
    public void getEmployeeDistribution_empty_shouldReturn200EmptyList() throws Exception {
        given(hrEmployeeService.getEmployeeDistribution()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/dashboard/employee-distribution")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/v1/hr/employee (multipart) ====================

    @Test
    public void addEmployee_withMinimalData_shouldReturn200() throws Exception {
        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("id", UUID.randomUUID().toString());
        responseMap.put("firstName", "Ahmad");
        responseMap.put("lastName", "Sayed");

        given(hrEmployeeService.addEmployee(any(), isNull(), isNull(), isNull()))
                .willReturn(responseMap);

        // Build the EmployeeRequestDTO JSON part
        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Ahmad", "lastName", "Sayed", "email", "ahmad@site.com"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee")
                        .file(employeeDataPart))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ahmad"));
    }

    @Test
    public void addEmployee_withPhoto_shouldReturn200() throws Exception {
        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("id", UUID.randomUUID().toString());
        responseMap.put("firstName", "Dalia");

        given(fileStorageService.uploadFile(any())).willReturn("photo-file-name.jpg");
        given(fileStorageService.getFileUrl("photo-file-name.jpg")).willReturn("http://storage/photo-file-name.jpg");
        given(hrEmployeeService.addEmployee(any(), isNull(), isNull(), isNull()))
                .willReturn(responseMap);

        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Dalia", "lastName", "Hassan"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        MockMultipartFile photoPart = new MockMultipartFile(
                "photo", "photo.jpg", MediaType.IMAGE_JPEG_VALUE,
                "photo-bytes".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee")
                        .file(employeeDataPart)
                        .file(photoPart))
                .andExpect(status().isOk());
    }

    @Test
    public void addEmployee_whenServiceThrows_shouldReturn400() throws Exception {
        given(hrEmployeeService.addEmployee(any(), isNull(), isNull(), isNull()))
                .willThrow(new RuntimeException("Duplicate email"));

        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Bad", "lastName", "Data"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee")
                        .file(employeeDataPart))
                .andExpect(status().isBadRequest());
    }

    // ==================== PUT /api/v1/hr/employee/{id} (multipart) ====================

    @Test
    public void updateEmployee_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("id", id.toString());
        responseMap.put("firstName", "Updated");

        given(hrEmployeeService.updateEmployee(eq(id), any(), isNull(), isNull(), isNull()))
                .willReturn(responseMap);

        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Updated", "lastName", "Name"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee/{id}", id)
                        .file(employeeDataPart)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Updated"));
    }

    @Test
    public void updateEmployee_withAllImages_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("id", id.toString());

        given(fileStorageService.uploadFile(any())).willReturn("file.jpg");
        given(fileStorageService.getFileUrl("file.jpg")).willReturn("http://storage/file.jpg");
        given(hrEmployeeService.updateEmployee(eq(id), any(), isNull(), isNull(), isNull()))
                .willReturn(responseMap);

        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Test", "lastName", "User"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        MockMultipartFile photo = new MockMultipartFile(
                "photo", "p.jpg", MediaType.IMAGE_JPEG_VALUE, "img".getBytes());
        MockMultipartFile idFront = new MockMultipartFile(
                "idFrontImage", "front.jpg", MediaType.IMAGE_JPEG_VALUE, "front".getBytes());
        MockMultipartFile idBack = new MockMultipartFile(
                "idBackImage", "back.jpg", MediaType.IMAGE_JPEG_VALUE, "back".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee/{id}", id)
                        .file(employeeDataPart)
                        .file(photo)
                        .file(idFront)
                        .file(idBack)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk());
    }

    @Test
    public void updateEmployee_whenServiceThrows_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        given(hrEmployeeService.updateEmployee(eq(id), any(), isNull(), isNull(), isNull()))
                .willThrow(new RuntimeException("Employee not found"));

        String employeeJson = objectMapper.writeValueAsString(
                Map.of("firstName", "Test", "lastName", "User"));

        MockMultipartFile employeeDataPart = new MockMultipartFile(
                "employeeData", "", MediaType.APPLICATION_JSON_VALUE,
                employeeJson.getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employee/{id}", id)
                        .file(employeeDataPart)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/hr/employee/{id} ====================

    @Test
    public void getEmployeeById_shouldReturn200WithData() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> employeeData = new HashMap<>();
        employeeData.put("id", id.toString());
        employeeData.put("firstName", "Rania");
        employeeData.put("lastName", "Gaber");

        given(hrEmployeeService.getEmployeeById(id)).willReturn(employeeData);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employee/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Rania"))
                .andExpect(jsonPath("$.lastName").value("Gaber"));
    }

    // ==================== DELETE /api/v1/hr/employee/{id} ====================

    @Test
    public void deleteEmployee_shouldReturn200WithMessage() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(hrEmployeeService).deleteEmployee(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/hr/employee/{id}", id))
                .andExpect(status().isOk())
                .andExpect(content().string("Employee deleted successfully"));
    }

    @Test
    public void deleteEmployee_whenServiceThrows_shouldBubbleException() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new RuntimeException("Cannot delete")).when(hrEmployeeService).deleteEmployee(id);

        // Controller does not catch; Spring will return 500
        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/hr/employee/{id}", id))
                .andExpect(status().isInternalServerError());
    }
}