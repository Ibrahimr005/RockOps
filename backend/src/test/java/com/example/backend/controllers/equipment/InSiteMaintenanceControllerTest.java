package com.example.backend.controllers.equipment;

import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.equipment.InSiteMaintenanceService;
import com.example.backend.services.hr.EmployeeService;
import com.example.backend.services.transaction.TransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InSiteMaintenanceController.class)
@AutoConfigureMockMvc(addFilters = false)
public class InSiteMaintenanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InSiteMaintenanceService maintenanceService;

    @MockBean
    private EmployeeService employeeService;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private ItemTypeRepository itemTypeRepository;

    @MockBean
    private EquipmentRepository equipmentRepository;

    @MockBean
    private EmployeeRepository employeeRepository;

    // -----------------------------------------------------------------------
    // GET /api/equipment/{equipmentId}/maintenance
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllMaintenanceRecords_returns200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        InSiteMaintenance record = new InSiteMaintenance();
        given(maintenanceService.getMaintenanceByEquipmentId(equipmentId))
                .willReturn(List.of(record));

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getAllMaintenanceRecords_whenServiceThrows_returns500() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(maintenanceService.getMaintenanceByEquipmentId(equipmentId))
                .willThrow(new RuntimeException("db error"));

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance", equipmentId))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // GET /api/equipment/{equipmentId}/maintenance/technicians
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllTechnicians_whenEquipmentNotFound_returns200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(equipmentRepository.findById(equipmentId)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance/technicians", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getAllTechnicians_whenEquipmentExists_returns200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        com.example.backend.models.equipment.Equipment equipment =
                new com.example.backend.models.equipment.Equipment();
        com.example.backend.models.site.Site site = new com.example.backend.models.site.Site();
        site.setId(UUID.randomUUID());
        equipment.setSite(site);

        given(equipmentRepository.findById(equipmentId)).willReturn(Optional.of(equipment));
        given(employeeRepository.findBySiteIdWithJobPosition(site.getId()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance/technicians", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // POST /api/equipment/{equipmentId}/maintenance  (no transaction)
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void createMaintenance_withMaintenanceTypeId_returns200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        UUID maintenanceTypeId = UUID.randomUUID();

        InSiteMaintenance maintenance = new InSiteMaintenance();
        maintenance.setId(UUID.randomUUID());

        given(maintenanceService.createMaintenance(
                any(UUID.class), any(UUID.class), any(LocalDateTime.class),
                any(UUID.class), anyString(), anyString()))
                .willReturn(maintenance);

        Map<String, Object> body = new HashMap<>();
        body.put("technicianId", technicianId.toString());
        body.put("maintenanceDate", LocalDateTime.now().toString());
        body.put("description", "Test maintenance");
        body.put("status", "SCHEDULED");
        body.put("maintenanceTypeId", maintenanceTypeId.toString());

        mockMvc.perform(post("/api/equipment/{equipmentId}/maintenance", equipmentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    @WithMockUser
    void createMaintenance_withMaintenanceTypeName_returns200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();

        InSiteMaintenance maintenance = new InSiteMaintenance();
        maintenance.setId(UUID.randomUUID());

        given(maintenanceService.createMaintenance(
                any(UUID.class), any(UUID.class), any(LocalDateTime.class),
                anyString(), anyString(), anyString()))
                .willReturn(maintenance);

        Map<String, Object> body = new HashMap<>();
        body.put("technicianId", technicianId.toString());
        body.put("maintenanceDate", LocalDateTime.now().toString());
        body.put("description", "Test maintenance");
        body.put("status", "SCHEDULED");
        body.put("maintenanceType", "OIL_CHANGE");

        mockMvc.perform(post("/api/equipment/{equipmentId}/maintenance", equipmentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    @WithMockUser
    void createMaintenance_whenNeitherTypeProvided_returns400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        body.put("technicianId", technicianId.toString());
        body.put("maintenanceDate", LocalDateTime.now().toString());
        body.put("description", "Test maintenance");
        body.put("status", "SCHEDULED");
        // no maintenanceTypeId and no maintenanceType -> IllegalArgumentException caught -> 400

        mockMvc.perform(post("/api/equipment/{equipmentId}/maintenance", equipmentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // PUT /api/equipment/{equipmentId}/maintenance/{maintenanceId}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void updateMaintenance_withTypeId_returns200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();
        UUID maintenanceTypeId = UUID.randomUUID();

        InSiteMaintenance updated = new InSiteMaintenance();
        updated.setId(maintenanceId);

        given(maintenanceService.updateMaintenance(
                any(UUID.class), any(UUID.class), any(LocalDateTime.class),
                any(UUID.class), anyString(), anyString()))
                .willReturn(updated);

        Map<String, Object> body = new HashMap<>();
        body.put("technicianId", technicianId.toString());
        body.put("maintenanceDate", LocalDateTime.now().toString());
        body.put("description", "Updated description");
        body.put("status", "COMPLETED");
        body.put("maintenanceTypeId", maintenanceTypeId.toString());

        mockMvc.perform(put("/api/equipment/{equipmentId}/maintenance/{maintenanceId}",
                        equipmentId, maintenanceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void updateMaintenance_withTypeName_returns200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        UUID technicianId = UUID.randomUUID();

        InSiteMaintenance updated = new InSiteMaintenance();
        updated.setId(maintenanceId);

        given(maintenanceService.updateMaintenance(
                any(UUID.class), any(UUID.class), any(LocalDateTime.class),
                anyString(), anyString(), anyString()))
                .willReturn(updated);

        Map<String, Object> body = new HashMap<>();
        body.put("technicianId", technicianId.toString());
        body.put("maintenanceDate", LocalDateTime.now().toString());
        body.put("description", "Updated description");
        body.put("status", "COMPLETED");
        body.put("maintenanceType", "TIRE_CHANGE");

        mockMvc.perform(put("/api/equipment/{equipmentId}/maintenance/{maintenanceId}",
                        equipmentId, maintenanceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/equipment/{equipmentId}/maintenance/{maintenanceId}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void deleteMaintenance_returns204() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();

        doNothing().when(maintenanceService).deleteMaintenance(maintenanceId);

        mockMvc.perform(delete("/api/equipment/{equipmentId}/maintenance/{maintenanceId}",
                        equipmentId, maintenanceId))
                .andExpect(status().isNoContent());
    }

    // -----------------------------------------------------------------------
    // POST /api/equipment/{equipmentId}/maintenance/{maintenanceId}/link-transaction/{transactionId}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void linkTransactionToMaintenance_returns200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        InSiteMaintenance maintenance = new InSiteMaintenance();
        maintenance.setId(maintenanceId);

        given(maintenanceService.linkTransactionToMaintenance(maintenanceId, transactionId))
                .willReturn(maintenance);

        mockMvc.perform(post(
                        "/api/equipment/{equipmentId}/maintenance/{maintenanceId}/link-transaction/{transactionId}",
                        equipmentId, maintenanceId, transactionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/equipment/{equipmentId}/maintenance/check-transaction/{batchNumber}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void checkTransactionExists_whenNotFound_returns200WithFoundFalse() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 42;

        given(maintenanceService.findTransactionByBatchNumber(batchNumber))
                .willReturn(Optional.empty());

        mockMvc.perform(get(
                        "/api/equipment/{equipmentId}/maintenance/check-transaction/{batchNumber}",
                        equipmentId, batchNumber))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").exists())
                .andExpect(jsonPath("$.scenario").exists());
    }

    @Test
    @WithMockUser
    void checkTransactionExists_whenPendingTransactionFound_returns200WithPendingScenario()
            throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 7;

        com.example.backend.models.transaction.Transaction transaction =
                new com.example.backend.models.transaction.Transaction();
        transaction.setId(UUID.randomUUID());
        transaction.setBatchNumber(batchNumber);
        transaction.setStatus(com.example.backend.models.transaction.TransactionStatus.PENDING);

        given(maintenanceService.findTransactionByBatchNumber(batchNumber))
                .willReturn(Optional.of(transaction));

        mockMvc.perform(get(
                        "/api/equipment/{equipmentId}/maintenance/check-transaction/{batchNumber}",
                        equipmentId, batchNumber))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").exists())
                .andExpect(jsonPath("$.scenario").exists());
    }

    @Test
    @WithMockUser
    void checkTransactionExists_whenServiceThrows_returns400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 99;

        given(maintenanceService.findTransactionByBatchNumber(batchNumber))
                .willThrow(new RuntimeException("unexpected error"));

        mockMvc.perform(get(
                        "/api/equipment/{equipmentId}/maintenance/check-transaction/{batchNumber}",
                        equipmentId, batchNumber))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // GET /api/equipment/{equipmentId}/maintenance/analytics
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getMaintenanceAnalytics_returns200WithAnalyticsMap() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(maintenanceService.getMaintenanceByEquipmentId(equipmentId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance/analytics", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMaintenanceEvents").exists())
                .andExpect(jsonPath("$.completionRate").exists());
    }

    @Test
    @WithMockUser
    void getMaintenanceAnalytics_whenServiceThrows_returns400() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(maintenanceService.getMaintenanceByEquipmentId(equipmentId))
                .willThrow(new RuntimeException("analytics error"));

        mockMvc.perform(get("/api/equipment/{equipmentId}/maintenance/analytics", equipmentId))
                .andExpect(status().isBadRequest());
    }
}