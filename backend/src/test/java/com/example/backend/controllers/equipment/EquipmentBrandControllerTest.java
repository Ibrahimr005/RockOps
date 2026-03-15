package com.example.backend.controllers.equipment;

import com.example.backend.config.JwtService;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.services.equipment.EquipmentBrandService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = EquipmentBrandController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class EquipmentBrandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentBrandService equipmentBrandService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private EquipmentBrand buildBrand(UUID id, String name) {
        EquipmentBrand brand = new EquipmentBrand();
        brand.setId(id);
        brand.setName(name);
        brand.setDescription("Brand description for " + name);
        return brand;
    }

    // --- GET /api/equipment/brands ---

    @Test
    @WithMockUser
    void getAllEquipmentBrands_returns200WithList() throws Exception {
        List<EquipmentBrand> brands = Arrays.asList(
                buildBrand(UUID.randomUUID(), "Caterpillar"),
                buildBrand(UUID.randomUUID(), "Komatsu")
        );
        given(equipmentBrandService.getAllEquipmentBrands()).willReturn(brands);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment/brands")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Caterpillar"))
                .andExpect(jsonPath("$[1].name").value("Komatsu"));
    }

    @Test
    @WithMockUser
    void getAllEquipmentBrands_returnsEmptyList_whenNoBrands() throws Exception {
        given(equipmentBrandService.getAllEquipmentBrands()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment/brands")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/equipment/brands/{id} ---

    @Test
    @WithMockUser
    void getEquipmentBrandById_returns200_whenFound() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentBrand brand = buildBrand(id, "Volvo");
        given(equipmentBrandService.getEquipmentBrandById(id)).willReturn(Optional.of(brand));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment/brands/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Volvo"));
    }

    @Test
    @WithMockUser
    void getEquipmentBrandById_returns404_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(equipmentBrandService.getEquipmentBrandById(id)).willReturn(Optional.empty());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment/brands/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // --- POST /api/equipment/brands ---

    @Test
    @WithMockUser
    void createEquipmentBrand_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentBrand request = buildBrand(null, "Liebherr");
        EquipmentBrand saved = buildBrand(id, "Liebherr");
        given(equipmentBrandService.createEquipmentBrand(request)).willReturn(saved);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Liebherr"));
    }

    @Test
    @WithMockUser
    void createEquipmentBrand_returns500_whenDuplicateName() throws Exception {
        EquipmentBrand request = buildBrand(null, "Caterpillar");
        given(equipmentBrandService.createEquipmentBrand(request))
                .willThrow(new RuntimeException("Equipment brand with name 'Caterpillar' already exists"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- PUT /api/equipment/brands/{id} ---

    @Test
    @WithMockUser
    void updateEquipmentBrand_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentBrand request = buildBrand(id, "Hitachi Updated");
        EquipmentBrand updated = buildBrand(id, "Hitachi Updated");
        given(equipmentBrandService.updateEquipmentBrand(id, request)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment/brands/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Hitachi Updated"));
    }

    @Test
    @WithMockUser
    void updateEquipmentBrand_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentBrand request = buildBrand(id, "Nonexistent");
        given(equipmentBrandService.updateEquipmentBrand(id, request))
                .willThrow(new RuntimeException("Equipment brand not found"));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment/brands/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- DELETE /api/equipment/brands/{id} ---

    @Test
    @WithMockUser
    void deleteEquipmentBrand_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(equipmentBrandService).deleteEquipmentBrand(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment/brands/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deleteEquipmentBrand_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Equipment brand not found"))
                .when(equipmentBrandService).deleteEquipmentBrand(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment/brands/{id}", id))
                .andExpect(status().is5xxServerError());
    }
}