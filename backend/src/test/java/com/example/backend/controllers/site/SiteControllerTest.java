package com.example.backend.controllers.site;

import com.example.backend.config.JwtService;
import com.example.backend.dto.equipment.EquipmentDTO;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.services.site.SiteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SiteController.class)
@AutoConfigureMockMvc(addFilters = false)
public class SiteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SiteService siteService;

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
        site.setEquipment(Collections.emptyList());
        return site;
    }

    // ==================== GET /api/v1/site ====================

    @Test
    public void getAllSites_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Alpha Mine");

        given(siteService.getAllSites()).willReturn(List.of(site));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Alpha Mine"));
    }

    @Test
    public void getAllSites_emptySites_shouldReturn200WithEmptyList() throws Exception {
        given(siteService.getAllSites()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/{siteId} ====================

    @Test
    public void getSiteById_found_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Beta Mine");

        given(siteService.getSiteById(siteId)).willReturn(site);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Beta Mine"));
    }

    // ==================== GET /api/v1/site/{siteId}/equipment ====================

    @Test
    public void getSiteEquipments_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Equipment equipment = new Equipment();
        equipment.setId(UUID.randomUUID());

        Site site = buildSite(siteId, "Gamma Mine");
        site.setEquipment(List.of(equipment));

        given(siteService.getSiteById(siteId)).willReturn(site);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/equipment", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getSiteEquipments_nullEquipmentList_shouldReturn200WithEmptyList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        site.setEquipment(null);

        given(siteService.getSiteById(siteId)).willReturn(site);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/equipment", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void getSiteEquipments_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/equipment", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/site/{siteId}/employees ====================

    @Test
    public void getSiteEmployees_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Delta Mine");

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("John");
        employee.setLastName("Doe");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteEmployees(siteId)).willReturn(List.of(employee));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/employees", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getSiteEmployees_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/employees", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void getSiteEmployees_nullEmployeeList_shouldReturn200WithEmptyList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Epsilon Mine");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteEmployees(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/employees", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/{siteId}/warehouses ====================

    @Test
    public void getSiteWarehouses_siteFound_shouldReturn200WithSimplifiedList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Zeta Mine");

        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Storage A");
        warehouse.setPhotoUrl("http://storage/img.jpg");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteWarehouses(siteId)).willReturn(List.of(warehouse));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/warehouses", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Storage A"))
                .andExpect(jsonPath("$[0].id").value(warehouseId.toString()))
                .andExpect(jsonPath("$[0].photoUrl").value("http://storage/img.jpg"));
    }

    @Test
    public void getSiteWarehouses_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/warehouses", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/site/{siteId}/merchants ====================

    @Test
    public void getSiteMerchants_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Eta Mine");

        Merchant merchant = new Merchant();
        merchant.setId(1);

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteMerchants(siteId)).willReturn(List.of(merchant));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/merchants", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getSiteMerchants_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/merchants", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void getSiteMerchants_nullMerchantList_shouldReturn200WithEmptyList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Theta Mine");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteMerchants(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/merchants", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/{siteId}/fixedassets ====================

    @Test
    public void getSiteFixedAssets_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Iota Mine");

        FixedAssets asset = new FixedAssets();
        asset.setId(UUID.randomUUID());

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSiteFixedAssets(siteId)).willReturn(List.of(asset));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/fixedassets", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getSiteFixedAssets_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/fixedassets", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/site/unassigned-fixedassets ====================

    @Test
    public void getUnassignedFixedAssets_shouldReturn200WithList() throws Exception {
        FixedAssets asset = new FixedAssets();
        asset.setId(UUID.randomUUID());

        given(siteService.getUnassignedFixedAssets()).willReturn(List.of(asset));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-fixedassets")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getUnassignedFixedAssets_nullList_shouldReturn200WithEmptyList() throws Exception {
        given(siteService.getUnassignedFixedAssets()).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-fixedassets")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/{siteId}/partners ====================

    @Test
    public void getSitePartners_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Kappa Mine");

        Map<String, Object> partner = new HashMap<>();
        partner.put("id", 1);
        partner.put("name", "Partner Corp");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getSitePartners(siteId)).willReturn(List.of(partner));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/partners", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Partner Corp"));
    }

    @Test
    public void getSitePartners_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/partners", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/site/{siteId}/unassigned-partners ====================

    @Test
    public void getUnassignedPartners_siteFound_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        Site site = buildSite(siteId, "Lambda Mine");

        Map<String, Object> partner = new HashMap<>();
        partner.put("id", 2);
        partner.put("name", "Free Partner");

        given(siteService.getSiteById(siteId)).willReturn(site);
        given(siteService.getUnassignedSitePartners(siteId)).willReturn(List.of(partner));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/unassigned-partners", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getUnassignedPartners_siteNotFound_shouldReturn404() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteById(siteId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{siteId}/unassigned-partners", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/site/unassigned-employees ====================

    @Test
    public void getUnassignedEmployees_shouldReturn200WithList() throws Exception {
        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("Jane");
        employee.setLastName("Smith");

        given(siteService.getUnassignedEmployees()).willReturn(List.of(employee));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getUnassignedEmployees_serviceThrowsException_shouldReturn500() throws Exception {
        given(siteService.getUnassignedEmployees()).willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    public void getUnassignedEmployees_nullResult_shouldReturn200WithEmptyList() throws Exception {
        given(siteService.getUnassignedEmployees()).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/unassigned-equipment ====================

    @Test
    public void getUnassignedEquipment_shouldReturn200WithList() throws Exception {
        Equipment equipment = new Equipment();
        equipment.setId(UUID.randomUUID());

        given(siteService.getUnassignedEquipment()).willReturn(List.of(equipment));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-equipment")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getUnassignedEquipment_nullResult_shouldReturn200WithEmptyList() throws Exception {
        given(siteService.getUnassignedEquipment()).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/unassigned-equipment")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/site/{id}/equipments-dto ====================

    @Test
    public void getSiteEquipmentsDTO_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(UUID.randomUUID());

        given(siteService.getSiteEquipmentsDTO(siteId)).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{id}/equipments-dto", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getSiteEquipmentsDTO_emptyList_shouldReturn200() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(siteService.getSiteEquipmentsDTO(siteId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/site/{id}/equipments-dto", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}