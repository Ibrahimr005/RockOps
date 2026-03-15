package com.example.backend.controllers.site;

import com.example.backend.config.JwtService;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.services.FileStorageService;
import com.example.backend.services.site.SiteAdminService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SiteAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
public class SiteAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SiteAdminService siteAdminService;

    @MockBean
    private FileStorageService fileStorageService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== Helper builders ====================

    private Site buildSite(UUID id, String name) {
        Site site = new Site();
        site.setId(id);
        site.setName(name);
        return site;
    }

    private Employee buildEmployee(UUID id, String firstName) {
        Employee e = new Employee();
        e.setId(id);
        e.setFirstName(firstName);
        e.setLastName("Doe");
        return e;
    }

    private Equipment buildEquipment(UUID id) {
        Equipment eq = new Equipment();
        eq.setId(id);
        return eq;
    }

    private Warehouse buildWarehouse(UUID id, String name) {
        Warehouse w = new Warehouse();
        w.setId(id);
        w.setName(name);
        return w;
    }

    // ==================== POST /siteadmin/addsite ====================

    @Test
    public void addSite_withoutPhoto_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "New Mine");

        given(siteAdminService.addSite(anyMap())).willReturn(site);

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "New Mine", "location", "North"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/addsite")
                        .param("siteData", siteDataJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Mine"));
    }

    @Test
    public void addSite_withPhoto_shouldReturn200WithPhotoUrl() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Photo Mine");
        site.setPhotoUrl("http://storage/site.jpg");

        given(fileStorageService.uploadFile(any())).willReturn("site.jpg");
        given(fileStorageService.getFileUrl("site.jpg")).willReturn("http://storage/site.jpg");
        given(siteAdminService.addSite(anyMap())).willReturn(site);

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "Photo Mine"));
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "site.jpg", MediaType.IMAGE_JPEG_VALUE, "image-content".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/addsite")
                        .file(photo)
                        .param("siteData", siteDataJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Photo Mine"));
    }

    @Test
    public void addSite_serviceThrowsException_shouldReturn400() throws Exception {
        given(siteAdminService.addSite(anyMap())).willThrow(new RuntimeException("Validation failed"));

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "Bad Mine"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/addsite")
                        .param("siteData", siteDataJson))
                .andExpect(status().isBadRequest());
    }

    // ==================== DELETE /siteadmin/{id} ====================

    @Test
    public void deleteSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();

        willDoNothing().given(siteAdminService).deleteSite(siteId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{id}", siteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Site deleted successfully"))
                .andExpect(jsonPath("$.deletedId").value(siteId.toString()));
    }

    @Test
    public void deleteSite_runtimeException_shouldReturn400() throws Exception {
        UUID siteId = UUID.randomUUID();

        willThrow(new RuntimeException("Cannot delete site with active employees"))
                .given(siteAdminService).deleteSite(siteId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{id}", siteId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Cannot delete site with active employees"));
    }

    @Test
    public void deleteSite_unexpectedException_shouldReturn500() throws Exception {
        UUID siteId = UUID.randomUUID();

        willThrow(new Error("JVM crash"))
                .given(siteAdminService).deleteSite(siteId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{id}", siteId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal server error"));
    }

    // ==================== POST /siteadmin/{siteId}/add-warehouse ====================

    @Test
    public void addWarehouse_withoutPhoto_shouldReturn201() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = buildWarehouse(warehouseId, "Main Storage");

        given(siteAdminService.addWarehouse(eq(siteId), anyMap())).willReturn(warehouse);

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Main Storage"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/{siteId}/add-warehouse", siteId)
                        .param("warehouseData", warehouseDataJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Main Storage"));
    }

    @Test
    public void addWarehouse_withPhoto_shouldReturn201() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = buildWarehouse(warehouseId, "Photo Storage");
        warehouse.setPhotoUrl("http://storage/wh.jpg");

        given(fileStorageService.uploadFile(any())).willReturn("wh.jpg");
        given(fileStorageService.getFileUrl("wh.jpg")).willReturn("http://storage/wh.jpg");
        given(siteAdminService.addWarehouse(eq(siteId), anyMap())).willReturn(warehouse);

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Photo Storage"));
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "wh.jpg", MediaType.IMAGE_JPEG_VALUE, "warehouse-image".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/{siteId}/add-warehouse", siteId)
                        .file(photo)
                        .param("warehouseData", warehouseDataJson))
                .andExpect(status().isCreated());
    }

    @Test
    public void addWarehouse_serviceThrowsException_shouldReturn400() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteAdminService.addWarehouse(eq(siteId), anyMap()))
                .willThrow(new RuntimeException("Site not found"));

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Bad Warehouse"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/{siteId}/add-warehouse", siteId)
                        .param("warehouseData", warehouseDataJson))
                .andExpect(status().isBadRequest());
    }

    // ==================== PUT /siteadmin/updatesite/{id} ====================

    @Test
    public void updateSite_withoutPhoto_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Updated Mine");

        given(siteAdminService.updateSite(eq(siteId), anyMap())).willReturn(site);

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "Updated Mine"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/updatesite/{id}", siteId)
                        .param("siteData", siteDataJson)
                        .with(req -> { req.setMethod("PUT"); return req; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Mine"));
    }

    @Test
    public void updateSite_withPhoto_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Photo Updated Mine");
        site.setPhotoUrl("http://storage/updated.jpg");

        given(fileStorageService.uploadFile(any())).willReturn("updated.jpg");
        given(fileStorageService.getFileUrl("updated.jpg")).willReturn("http://storage/updated.jpg");
        given(siteAdminService.updateSite(eq(siteId), anyMap())).willReturn(site);

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "Photo Updated Mine"));
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "updated.jpg", MediaType.IMAGE_JPEG_VALUE, "new-image".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/updatesite/{id}", siteId)
                        .file(photo)
                        .param("siteData", siteDataJson)
                        .with(req -> { req.setMethod("PUT"); return req; }))
                .andExpect(status().isOk());
    }

    @Test
    public void updateSite_runtimeException_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteAdminService.updateSite(eq(siteId), anyMap()))
                .willThrow(new RuntimeException("Site not found"));

        String siteDataJson = objectMapper.writeValueAsString(Map.of("name", "Ghost Mine"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/siteadmin/updatesite/{id}", siteId)
                        .param("siteData", siteDataJson)
                        .with(req -> { req.setMethod("PUT"); return req; }))
                .andExpect(status().isNotFound());
    }

    // ==================== POST /siteadmin/{siteId}/assign-equipment/{equipmentId} ====================

    @Test
    public void assignEquipmentToSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();
        Equipment equipment = buildEquipment(equipmentId);

        given(siteAdminService.siteExists(siteId)).willReturn(true);
        given(siteAdminService.equipmentExists(equipmentId)).willReturn(true);
        given(siteAdminService.assignEquipmentToSite(siteId, equipmentId)).willReturn(equipment);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isOk());
    }

    @Test
    public void assignEquipmentToSite_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        given(siteAdminService.siteExists(siteId)).willReturn(false);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isNotFound());
    }

    @Test
    public void assignEquipmentToSite_equipmentNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        given(siteAdminService.siteExists(siteId)).willReturn(true);
        given(siteAdminService.equipmentExists(equipmentId)).willReturn(false);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isNotFound());
    }

    @Test
    public void assignEquipmentToSite_illegalArgument_shouldReturn400() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        given(siteAdminService.siteExists(siteId)).willReturn(true);
        given(siteAdminService.equipmentExists(equipmentId)).willReturn(true);
        given(siteAdminService.assignEquipmentToSite(siteId, equipmentId))
                .willThrow(new IllegalArgumentException("Invalid assignment"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void assignEquipmentToSite_illegalState_shouldReturn409() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        given(siteAdminService.siteExists(siteId)).willReturn(true);
        given(siteAdminService.equipmentExists(equipmentId)).willReturn(true);
        given(siteAdminService.assignEquipmentToSite(siteId, equipmentId))
                .willThrow(new IllegalStateException("Equipment already assigned"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isConflict());
    }

    // ==================== DELETE /siteadmin/{siteId}/remove-equipment/{equipmentId} ====================

    @Test
    public void removeEquipmentFromSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();
        Equipment equipment = buildEquipment(equipmentId);

        given(siteAdminService.removeEquipmentFromSite(siteId, equipmentId)).willReturn(equipment);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{siteId}/remove-equipment/{equipmentId}", siteId, equipmentId))
                .andExpect(status().isOk());
    }

    // ==================== POST /siteadmin/{siteId}/assign-employee/{employeeId} ====================

    @Test
    public void assignEmployee_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        Employee employee = buildEmployee(employeeId, "Alice");

        given(siteAdminService.assignEmployeeToSite(siteId, employeeId)).willReturn(employee);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-employee/{employeeId}", siteId, employeeId))
                .andExpect(status().isOk());
    }

    // ==================== DELETE /siteadmin/{siteId}/remove-employee/{employeeId} ====================

    @Test
    public void removeEmployee_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        Employee employee = buildEmployee(employeeId, "Bob");

        given(siteAdminService.removeEmployeeFromSite(siteId, employeeId)).willReturn(employee);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{siteId}/remove-employee/{employeeId}", siteId, employeeId))
                .andExpect(status().isOk());
    }

    // ==================== POST /siteadmin/{siteId}/assign-warehouse/{warehouseId} ====================

    @Test
    public void assignWarehouseToSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = buildWarehouse(warehouseId, "Site Warehouse");

        given(siteAdminService.assignWarehouseToSite(siteId, warehouseId)).willReturn(warehouse);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-warehouse/{warehouseId}", siteId, warehouseId))
                .andExpect(status().isOk());
    }

    // ==================== POST /siteadmin/{siteId}/assign-fixedAsset/{fixedAssetId} ====================

    @Test
    public void assignFixedAssetToSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        UUID fixedAssetId = UUID.randomUUID();
        FixedAssets fixedAssets = new FixedAssets();
        fixedAssets.setId(fixedAssetId);

        given(siteAdminService.assignFixedAssetToSite(siteId, fixedAssetId)).willReturn(fixedAssets);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-fixedAsset/{fixedAssetId}", siteId, fixedAssetId))
                .andExpect(status().isOk());
    }

    // ==================== POST /siteadmin/{siteId}/assign-partner/{partnerId} ====================

    @Test
    public void assignPartnerToSite_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        int partnerId = 1;

        SitePartner sitePartner = new SitePartner();

        given(siteAdminService.assignPartnerToSite(siteId, partnerId, 25.0)).willReturn(sitePartner);

        Map<String, Double> body = Map.of("percentage", 25.0);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/siteadmin/{siteId}/assign-partner/{partnerId}", siteId, partnerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // ==================== PUT /siteadmin/{siteId}/update-partner-percentage/{partnerId} ====================

    @Test
    public void updatePartnerPercentage_happyPath_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        int partnerId = 2;
        SitePartner sitePartner = new SitePartner();

        given(siteAdminService.updatePartnerPercentage(siteId, partnerId, 40.0)).willReturn(sitePartner);

        Map<String, Double> body = Map.of("percentage", 40.0);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/siteadmin/{siteId}/update-partner-percentage/{partnerId}", siteId, partnerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // ==================== DELETE /siteadmin/{siteId}/remove-partner/{partnerId} ====================

    @Test
    public void removePartner_happyPath_shouldReturn204() throws Exception {
        UUID siteId = UUID.randomUUID();
        int partnerId = 3;

        willDoNothing().given(siteAdminService).removePartnerFromSite(siteId, partnerId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/{siteId}/remove-partner/{partnerId}", siteId, partnerId))
                .andExpect(status().isNoContent());
    }

    // ==================== GET /siteadmin/warehouse-managers/available ====================

    @Test
    public void getAvailableWarehouseManagers_shouldReturn200WithData() throws Exception {
        Map<String, Object> manager = new HashMap<>();
        manager.put("id", UUID.randomUUID().toString());
        manager.put("name", "Manager One");

        given(siteAdminService.getAvailableWarehouseManagers()).willReturn(List.of(manager));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouse-managers/available")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void getAvailableWarehouseManagers_serviceThrowsException_shouldReturn500() throws Exception {
        given(siteAdminService.getAvailableWarehouseManagers())
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouse-managers/available")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /siteadmin/sites/{siteId}/warehouse-managers/available ====================

    @Test
    public void getAvailableWarehouseManagersForSite_shouldReturn200WithData() throws Exception {
        UUID siteId = UUID.randomUUID();
        Map<String, Object> manager = new HashMap<>();
        manager.put("id", UUID.randomUUID().toString());
        manager.put("name", "Site Manager");

        given(siteAdminService.getAvailableWarehouseManagersForSite(siteId)).willReturn(List.of(manager));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/sites/{siteId}/warehouse-managers/available", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void getAvailableWarehouseManagersForSite_serviceThrowsException_shouldReturn500() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteAdminService.getAvailableWarehouseManagersForSite(siteId))
                .willThrow(new RuntimeException("Site not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/sites/{siteId}/warehouse-managers/available", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /siteadmin/warehouse-workers/available ====================

    @Test
    public void getAvailableWarehouseWorkers_shouldReturn200WithData() throws Exception {
        Map<String, Object> worker = new HashMap<>();
        worker.put("id", UUID.randomUUID().toString());
        worker.put("name", "Worker One");

        given(siteAdminService.getAvailableWarehouseWorkers()).willReturn(List.of(worker));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouse-workers/available")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void getAvailableWarehouseWorkers_serviceThrowsException_shouldReturn500() throws Exception {
        given(siteAdminService.getAvailableWarehouseWorkers())
                .willThrow(new RuntimeException("Failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouse-workers/available")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /siteadmin/{siteId}/warehouse-workers/available ====================

    @Test
    public void getAvailableWarehouseWorkersForSite_shouldReturn200WithData() throws Exception {
        UUID siteId = UUID.randomUUID();
        Map<String, Object> worker = new HashMap<>();
        worker.put("id", UUID.randomUUID().toString());
        worker.put("name", "Site Worker");

        given(siteAdminService.getAvailableWarehouseWorkersForSite(siteId)).willReturn(List.of(worker));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/{siteId}/warehouse-workers/available", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void getAvailableWarehouseWorkersForSite_serviceThrowsException_shouldReturn500() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteAdminService.getAvailableWarehouseWorkersForSite(siteId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/{siteId}/warehouse-workers/available", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== DELETE /siteadmin/warehouses/{warehouseId}/unassign-employee/{employeeId} ====================

    @Test
    public void unassignEmployeeFromWarehouse_happyPath_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        Employee employee = buildEmployee(employeeId, "Charlie");

        given(siteAdminService.unassignEmployeeFromWarehouse(warehouseId, employeeId)).willReturn(employee);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/warehouses/{warehouseId}/unassign-employee/{employeeId}",
                                warehouseId, employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Employee successfully unassigned from warehouse"));
    }

    @Test
    public void unassignEmployeeFromWarehouse_runtimeException_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        given(siteAdminService.unassignEmployeeFromWarehouse(warehouseId, employeeId))
                .willThrow(new RuntimeException("Employee not in warehouse"));

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/warehouses/{warehouseId}/unassign-employee/{employeeId}",
                                warehouseId, employeeId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Employee not in warehouse"));
    }

    @Test
    public void unassignEmployeeFromWarehouse_unexpectedException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        given(siteAdminService.unassignEmployeeFromWarehouse(warehouseId, employeeId))
                .willThrow(new Error("Critical error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/siteadmin/warehouses/{warehouseId}/unassign-employee/{employeeId}",
                                warehouseId, employeeId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /siteadmin/warehouses/{warehouseId}/employees ====================

    @Test
    public void getWarehouseEmployees_shouldReturn200WithData() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        Map<String, Object> employeeData = new HashMap<>();
        employeeData.put("id", UUID.randomUUID().toString());
        employeeData.put("name", "Dave Smith");

        given(siteAdminService.getWarehouseEmployees(warehouseId)).willReturn(List.of(employeeData));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void getWarehouseEmployees_emptyList_shouldReturn200WithEmptyData() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(siteAdminService.getWarehouseEmployees(warehouseId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    public void getWarehouseEmployees_serviceThrowsException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(siteAdminService.getWarehouseEmployees(warehouseId))
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/siteadmin/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }
}