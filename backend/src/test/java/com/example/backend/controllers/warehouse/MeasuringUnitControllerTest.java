package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.services.warehouse.MeasuringUnitService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = MeasuringUnitController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class MeasuringUnitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MeasuringUnitService measuringUnitService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private MeasuringUnit buildMeasuringUnit(UUID id, String name, String displayName, String abbreviation) {
        MeasuringUnit unit = new MeasuringUnit();
        unit.setId(id);
        unit.setName(name);
        unit.setDisplayName(displayName);
        unit.setAbbreviation(abbreviation);
        unit.setIsActive(true);
        return unit;
    }

    private Map<String, Object> buildRequestBody(String name, String displayName, String abbreviation) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("displayName", displayName);
        body.put("abbreviation", abbreviation);
        return body;
    }

    // --- POST /api/v1/measuring-units ---

    @Test
    @WithMockUser
    void createMeasuringUnit_returns200WithCreatedUnit() throws Exception {
        UUID id = UUID.randomUUID();
        MeasuringUnit created = buildMeasuringUnit(id, "kilogram", "Kilogram", "kg");
        Map<String, Object> requestBody = buildRequestBody("kilogram", "Kilogram", "kg");

        given(measuringUnitService.createMeasuringUnit(anyMap())).willReturn(created);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/measuring-units")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("kilogram"))
                .andExpect(jsonPath("$.displayName").value("Kilogram"))
                .andExpect(jsonPath("$.abbreviation").value("kg"));
    }

    @Test
    @WithMockUser
    void createMeasuringUnit_returns409_whenNameAlreadyExists() throws Exception {
        Map<String, Object> requestBody = buildRequestBody("kilogram", "Kilogram", "kg");

        given(measuringUnitService.createMeasuringUnit(anyMap()))
                .willThrow(new IllegalArgumentException("Measuring unit with name 'kilogram' already exists"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/measuring-units")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void createMeasuringUnit_returns409_whenAbbreviationAlreadyExists() throws Exception {
        Map<String, Object> requestBody = buildRequestBody("kilogram2", "Kilogram 2", "kg");

        given(measuringUnitService.createMeasuringUnit(anyMap()))
                .willThrow(new IllegalArgumentException("Abbreviation 'kg' already in use"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/measuring-units")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }

    // --- GET /api/v1/measuring-units ---

    @Test
    @WithMockUser
    void getAllMeasuringUnits_returns200WithList() throws Exception {
        List<MeasuringUnit> units = Arrays.asList(
                buildMeasuringUnit(UUID.randomUUID(), "kilogram", "Kilogram", "kg"),
                buildMeasuringUnit(UUID.randomUUID(), "liter", "Liter", "L"),
                buildMeasuringUnit(UUID.randomUUID(), "piece", "Piece", "pcs")
        );
        given(measuringUnitService.getAllMeasuringUnits()).willReturn(units);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("kilogram"))
                .andExpect(jsonPath("$[1].name").value("liter"))
                .andExpect(jsonPath("$[2].abbreviation").value("pcs"));
    }

    @Test
    @WithMockUser
    void getAllMeasuringUnits_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(measuringUnitService.getAllMeasuringUnits()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/measuring-units/active ---

    @Test
    @WithMockUser
    void getActiveMeasuringUnits_returns200WithActiveList() throws Exception {
        List<MeasuringUnit> activeUnits = Arrays.asList(
                buildMeasuringUnit(UUID.randomUUID(), "kilogram", "Kilogram", "kg"),
                buildMeasuringUnit(UUID.randomUUID(), "meter", "Meter", "m")
        );
        given(measuringUnitService.getActiveMeasuringUnits()).willReturn(activeUnits);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units/active")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("kilogram"))
                .andExpect(jsonPath("$[1].abbreviation").value("m"));
    }

    @Test
    @WithMockUser
    void getActiveMeasuringUnits_returns200WithEmptyList_whenNoneActive() throws Exception {
        given(measuringUnitService.getActiveMeasuringUnits()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units/active")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/measuring-units/{id} ---

    @Test
    @WithMockUser
    void getMeasuringUnitById_returns200WithUnit() throws Exception {
        UUID id = UUID.randomUUID();
        MeasuringUnit unit = buildMeasuringUnit(id, "kilogram", "Kilogram", "kg");
        given(measuringUnitService.getMeasuringUnitById(id)).willReturn(unit);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("kilogram"))
                .andExpect(jsonPath("$.abbreviation").value("kg"));
    }

    @Test
    @WithMockUser
    void getMeasuringUnitById_returns404_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(measuringUnitService.getMeasuringUnitById(id))
                .willThrow(new RuntimeException("Measuring unit not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/measuring-units/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // --- PUT /api/v1/measuring-units/{id} ---

    @Test
    @WithMockUser
    void updateMeasuringUnit_returns200WithUpdatedUnit() throws Exception {
        UUID id = UUID.randomUUID();
        MeasuringUnit updated = buildMeasuringUnit(id, "kilogram", "Updated Kilogram", "KG");
        Map<String, Object> requestBody = buildRequestBody("kilogram", "Updated Kilogram", "KG");

        given(measuringUnitService.updateMeasuringUnit(eq(id), anyMap())).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/measuring-units/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.displayName").value("Updated Kilogram"))
                .andExpect(jsonPath("$.abbreviation").value("KG"));
    }

    @Test
    @WithMockUser
    void updateMeasuringUnit_returns409_whenNameConflict() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> requestBody = buildRequestBody("liter", "Liter", "L");

        given(measuringUnitService.updateMeasuringUnit(eq(id), anyMap()))
                .willThrow(new IllegalArgumentException("Measuring unit with name 'liter' already exists"));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/measuring-units/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void updateMeasuringUnit_returns404_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> requestBody = buildRequestBody("kilogram", "Kilogram", "kg");

        given(measuringUnitService.updateMeasuringUnit(eq(id), anyMap()))
                .willThrow(new RuntimeException("Measuring unit not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/measuring-units/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void updateMeasuringUnit_returns404_whenAnotherRuntimeExceptionIsThrown() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> requestBody = buildRequestBody("kilogram", "Kilogram", "kg");

        // Any RuntimeException that is not an IllegalArgumentException is handled
        // by the RuntimeException catch block which returns 404.
        given(measuringUnitService.updateMeasuringUnit(eq(id), anyMap()))
                .willThrow(new RuntimeException("Unexpected runtime error"));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/measuring-units/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // --- DELETE /api/v1/measuring-units/{id} ---

    @Test
    @WithMockUser
    void deleteMeasuringUnit_returns200_whenSuccessfullyDeactivated() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(measuringUnitService).deleteMeasuringUnit(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/measuring-units/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deleteMeasuringUnit_returns404_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("Measuring unit not found with id: " + id))
                .given(measuringUnitService).deleteMeasuringUnit(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/measuring-units/{id}", id))
                .andExpect(status().isNotFound());
    }
}