package com.example.backend.controllers.transaction;

import com.example.backend.config.JwtService;
import com.example.backend.dto.transaction.BatchValidationResponseDTO;
import com.example.backend.services.transaction.BatchValidationService;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BatchValidationController.class)
@AutoConfigureMockMvc(addFilters = false)
public class BatchValidationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BatchValidationService batchValidationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== Helper builder ====================

    private BatchValidationResponseDTO buildResponse(String scenario, boolean canCreateNew, boolean canValidate) {
        return BatchValidationResponseDTO.builder()
                .scenario(scenario)
                .found(true)
                .canCreateNew(canCreateNew)
                .canValidate(canValidate)
                .batchNumber(1)
                .message("Validation complete")
                .build();
    }

    // ==================== GET /api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber} ====================

    @Test
    public void validateBatchForEquipment_happyPath_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 5;

        BatchValidationResponseDTO response = buildResponse("not_found", true, false);
        given(batchValidationService.validateBatchForEquipment(batchNumber, equipmentId)).willReturn(response);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario").value("not_found"))
                .andExpect(jsonPath("$.canCreateNew").value(true))
                .andExpect(jsonPath("$.canValidate").value(false));
    }

    @Test
    public void validateBatchForEquipment_incomingValidationScenario_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 10;

        BatchValidationResponseDTO response = buildResponse("incoming_validation", false, true);
        given(batchValidationService.validateBatchForEquipment(batchNumber, equipmentId)).willReturn(response);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario").value("incoming_validation"))
                .andExpect(jsonPath("$.canValidate").value(true));
    }

    @Test
    public void validateBatchForEquipment_zeroBatchNumber_shouldReturn400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 0;

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.scenario").value("validation_error"))
                .andExpect(jsonPath("$.found").value(false));
    }

    @Test
    public void validateBatchForEquipment_negativeBatchNumber_shouldReturn400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = -3;

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.scenario").value("validation_error"));
    }

    @Test
    public void validateBatchForEquipment_serviceThrowsIllegalArgument_shouldReturn400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 7;

        given(batchValidationService.validateBatchForEquipment(batchNumber, equipmentId))
                .willThrow(new IllegalArgumentException("Invalid equipment state"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.scenario").value("validation_error"));
    }

    @Test
    public void validateBatchForEquipment_serviceThrowsException_shouldReturn500() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        int batchNumber = 8;

        given(batchValidationService.validateBatchForEquipment(batchNumber, equipmentId))
                .willThrow(new RuntimeException("DB connection lost"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/batch/{batchNumber}",
                                equipmentId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.scenario").value("system_error"))
                .andExpect(jsonPath("$.found").value(false));
    }

    // ==================== GET /api/v1/batch-validation/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber} ====================

    @Test
    public void validateBatchForMaintenance_happyPath_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        int batchNumber = 3;

        BatchValidationResponseDTO response = buildResponse("not_found", true, false);
        response.setMaintenanceContext(true);
        response.setMaintenanceId(maintenanceId);

        given(batchValidationService.validateBatchForMaintenance(batchNumber, equipmentId, maintenanceId))
                .willReturn(response);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber}",
                                equipmentId, maintenanceId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario").value("not_found"))
                .andExpect(jsonPath("$.maintenanceContext").value(true));
    }

    @Test
    public void validateBatchForMaintenance_zeroBatchNumber_shouldReturn400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        int batchNumber = 0;

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber}",
                                equipmentId, maintenanceId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.scenario").value("validation_error"))
                .andExpect(jsonPath("$.maintenanceContext").value(true));
    }

    @Test
    public void validateBatchForMaintenance_serviceThrowsIllegalArgument_shouldReturn400() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        int batchNumber = 5;

        given(batchValidationService.validateBatchForMaintenance(batchNumber, equipmentId, maintenanceId))
                .willThrow(new IllegalArgumentException("Maintenance record not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber}",
                                equipmentId, maintenanceId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.scenario").value("validation_error"))
                .andExpect(jsonPath("$.maintenanceContext").value(true));
    }

    @Test
    public void validateBatchForMaintenance_serviceThrowsException_shouldReturn500() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID maintenanceId = UUID.randomUUID();
        int batchNumber = 6;

        given(batchValidationService.validateBatchForMaintenance(batchNumber, equipmentId, maintenanceId))
                .willThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber}",
                                equipmentId, maintenanceId, batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.scenario").value("system_error"))
                .andExpect(jsonPath("$.maintenanceContext").value(true));
    }

    // ==================== GET /api/v1/batch-validation/batch/{batchNumber}/available ====================

    @Test
    public void isBatchNumberAvailable_available_shouldReturn200WithTrue() throws Exception {
        int batchNumber = 15;

        given(batchValidationService.isBatchNumberAvailable(batchNumber)).willReturn(true);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/batch/{batchNumber}/available", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(true));
    }

    @Test
    public void isBatchNumberAvailable_notAvailable_shouldReturn200WithFalse() throws Exception {
        int batchNumber = 20;

        given(batchValidationService.isBatchNumberAvailable(batchNumber)).willReturn(false);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/batch/{batchNumber}/available", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(false));
    }

    @Test
    public void isBatchNumberAvailable_zeroBatchNumber_shouldReturn400WithFalse() throws Exception {
        int batchNumber = 0;

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/batch/{batchNumber}/available", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value(false));
    }

    @Test
    public void isBatchNumberAvailable_serviceThrowsException_shouldReturn500() throws Exception {
        int batchNumber = 25;

        given(batchValidationService.isBatchNumberAvailable(batchNumber))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/batch-validation/batch/{batchNumber}/available", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$").value(false));
    }

    // ==================== POST /api/v1/batch-validation/batch/{batchNumber}/validate-uniqueness ====================

    @Test
    public void validateBatchNumberUniqueness_unique_shouldReturn200() throws Exception {
        int batchNumber = 30;

        willDoNothing().given(batchValidationService).validateBatchNumberUniqueness(batchNumber);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/batch-validation/batch/{batchNumber}/validate-uniqueness", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value("Batch number 30 is available for use"));
    }

    @Test
    public void validateBatchNumberUniqueness_zeroBatchNumber_shouldReturn400() throws Exception {
        int batchNumber = 0;

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/batch-validation/batch/{batchNumber}/validate-uniqueness", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Batch number must be a positive integer"));
    }

    @Test
    public void validateBatchNumberUniqueness_notUnique_shouldReturn409() throws Exception {
        int batchNumber = 35;

        willThrow(new IllegalArgumentException("Batch number 35 is already in use"))
                .given(batchValidationService).validateBatchNumberUniqueness(batchNumber);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/batch-validation/batch/{batchNumber}/validate-uniqueness", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$").value("Batch number 35 is already in use"));
    }

    @Test
    public void validateBatchNumberUniqueness_serviceThrowsException_shouldReturn500() throws Exception {
        int batchNumber = 40;

        willThrow(new RuntimeException("Database failure"))
                .given(batchValidationService).validateBatchNumberUniqueness(batchNumber);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/batch-validation/batch/{batchNumber}/validate-uniqueness", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$").value("System error occurred during validation"));
    }
}