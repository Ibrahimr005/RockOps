package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.EquipmentPurchaseSpecDTO;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.services.procurement.EquipmentPurchaseSpecService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EquipmentPurchaseSpecController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EquipmentPurchaseSpecControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentPurchaseSpecService specService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private EquipmentPurchaseSpec buildSpec(UUID id, String name) {
        return EquipmentPurchaseSpec.builder()
                .id(id)
                .name(name)
                .description("Standard mining excavator")
                .model("CAT 390F")
                .manufactureYear(2024)
                .countryOfOrigin("USA")
                .estimatedBudget(500_000.00)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private EquipmentPurchaseSpecDTO buildSpecDTO(String name) {
        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setName(name);
        dto.setDescription("Standard mining excavator");
        dto.setModel("CAT 390F");
        dto.setManufactureYear(2024);
        dto.setCountryOfOrigin("USA");
        dto.setEstimatedBudget(500_000.00);
        return dto;
    }

    // ==================== GET /api/procurement/equipment-purchase-specs ====================

    @Test
    @WithMockUser
    public void getAll_shouldReturn200WithList() throws Exception {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();

        List<EquipmentPurchaseSpec> specs = List.of(
                buildSpec(id1, "Excavator Spec"),
                buildSpec(id2, "Bulldozer Spec")
        );

        given(specService.getAll()).willReturn(specs);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/equipment-purchase-specs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(id1.toString()))
                .andExpect(jsonPath("$[0].name").value("Excavator Spec"))
                .andExpect(jsonPath("$[1].id").value(id2.toString()))
                .andExpect(jsonPath("$[1].name").value("Bulldozer Spec"));
    }

    @Test
    @WithMockUser
    public void getAll_emptyList_shouldReturn200() throws Exception {
        given(specService.getAll()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/equipment-purchase-specs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/procurement/equipment-purchase-specs/{id} ====================

    @Test
    @WithMockUser
    public void getById_shouldReturn200WithSpec() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentPurchaseSpec spec = buildSpec(id, "Crane Spec");

        given(specService.getById(id)).willReturn(spec);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/equipment-purchase-specs/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Crane Spec"))
                .andExpect(jsonPath("$.model").value("CAT 390F"))
                .andExpect(jsonPath("$.manufactureYear").value(2024))
                .andExpect(jsonPath("$.estimatedBudget").value(500_000.00));
    }

    @Test
    @WithMockUser
    public void getById_withDifferentId_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentPurchaseSpec spec = buildSpec(id, "Loader Spec");
        spec.setCountryOfOrigin("Germany");

        given(specService.getById(id)).willReturn(spec);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/equipment-purchase-specs/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Loader Spec"))
                .andExpect(jsonPath("$.countryOfOrigin").value("Germany"));
    }

    // ==================== POST /api/procurement/equipment-purchase-specs ====================

    @Test
    @WithMockUser
    public void create_shouldReturn200WithCreatedSpec() throws Exception {
        UUID createdId = UUID.randomUUID();

        EquipmentPurchaseSpecDTO requestDto = buildSpecDTO("Grader Spec");
        EquipmentPurchaseSpec createdSpec = buildSpec(createdId, "Grader Spec");

        given(specService.create(any(EquipmentPurchaseSpecDTO.class))).willReturn(createdSpec);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/equipment-purchase-specs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdId.toString()))
                .andExpect(jsonPath("$.name").value("Grader Spec"))
                .andExpect(jsonPath("$.model").value("CAT 390F"))
                .andExpect(jsonPath("$.estimatedBudget").value(500_000.00));
    }

    @Test
    @WithMockUser
    public void create_withMinimalFields_shouldReturn200() throws Exception {
        UUID createdId = UUID.randomUUID();

        EquipmentPurchaseSpecDTO requestDto = new EquipmentPurchaseSpecDTO();
        requestDto.setName("Minimal Spec");

        EquipmentPurchaseSpec createdSpec = EquipmentPurchaseSpec.builder()
                .id(createdId)
                .name("Minimal Spec")
                .createdAt(LocalDateTime.now())
                .build();

        given(specService.create(any(EquipmentPurchaseSpecDTO.class))).willReturn(createdSpec);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/equipment-purchase-specs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdId.toString()))
                .andExpect(jsonPath("$.name").value("Minimal Spec"));
    }

    // ==================== PUT /api/procurement/equipment-purchase-specs/{id} ====================

    @Test
    @WithMockUser
    public void update_shouldReturn200WithUpdatedSpec() throws Exception {
        UUID id = UUID.randomUUID();

        EquipmentPurchaseSpecDTO requestDto = buildSpecDTO("Excavator Spec Updated");
        requestDto.setManufactureYear(2025);
        requestDto.setEstimatedBudget(600_000.00);

        EquipmentPurchaseSpec updatedSpec = buildSpec(id, "Excavator Spec Updated");
        updatedSpec.setManufactureYear(2025);
        updatedSpec.setEstimatedBudget(600_000.00);

        given(specService.update(eq(id), any(EquipmentPurchaseSpecDTO.class))).willReturn(updatedSpec);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/procurement/equipment-purchase-specs/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Excavator Spec Updated"))
                .andExpect(jsonPath("$.manufactureYear").value(2025))
                .andExpect(jsonPath("$.estimatedBudget").value(600_000.00));
    }

    @Test
    @WithMockUser
    public void update_withCountryChange_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        EquipmentPurchaseSpecDTO requestDto = buildSpecDTO("Bulldozer Spec");
        requestDto.setCountryOfOrigin("Japan");

        EquipmentPurchaseSpec updatedSpec = buildSpec(id, "Bulldozer Spec");
        updatedSpec.setCountryOfOrigin("Japan");

        given(specService.update(eq(id), any(EquipmentPurchaseSpecDTO.class))).willReturn(updatedSpec);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/procurement/equipment-purchase-specs/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.countryOfOrigin").value("Japan"));
    }

    // ==================== DELETE /api/procurement/equipment-purchase-specs/{id} ====================

    @Test
    @WithMockUser
    public void delete_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(specService).delete(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/procurement/equipment-purchase-specs/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void delete_anotherSpec_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(specService).delete(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/procurement/equipment-purchase-specs/{id}", id))
                .andExpect(status().isOk());
    }
}