package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.services.MinioService;
import com.example.backend.services.procurement.ProcurementTeamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProcurmentTeamController.class)
@AutoConfigureMockMvc(addFilters = false)
public class ProcurmentTeamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProcurementTeamService procurementTeamService;

    @MockBean
    private MinioService minioService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== POST /api/v1/procurement ====================

    @Test
    @WithMockUser
    public void addMerchant_withoutPhoto_shouldReturn200WithMerchant() throws Exception {
        UUID merchantId = UUID.randomUUID();

        Merchant merchant = Merchant.builder()
                .id(merchantId)
                .merchantId("MERCH-001")
                .name("Acme Supplies")
                .contactEmail("contact@acme.com")
                .build();

        given(procurementTeamService.addMerchant(anyMap())).willReturn(merchant);

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "Acme Supplies", "contactEmail", "contact@acme.com")
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement")
                        .param("merchantData", merchantDataJson)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(merchantId.toString()))
                .andExpect(jsonPath("$.merchantId").value("MERCH-001"))
                .andExpect(jsonPath("$.name").value("Acme Supplies"));
    }

    @Test
    @WithMockUser
    public void addMerchant_withPhoto_shouldReturn200WithMerchant() throws Exception {
        UUID merchantId = UUID.randomUUID();

        Merchant merchant = Merchant.builder()
                .id(merchantId)
                .merchantId("MERCH-002")
                .name("BuildRight Co")
                .photoUrl("http://minio/photos/merchant-photo.jpg")
                .build();

        given(minioService.uploadFile(any())).willReturn("merchant-photo.jpg");
        given(minioService.getFileUrl("merchant-photo.jpg"))
                .willReturn("http://minio/photos/merchant-photo.jpg");
        given(procurementTeamService.addMerchant(anyMap())).willReturn(merchant);

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "BuildRight Co", "contactPhone", "0501234567")
        );

        MockMultipartFile photo = new MockMultipartFile(
                "photo",
                "merchant-photo.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-image-content".getBytes()
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement")
                        .file(photo)
                        .param("merchantData", merchantDataJson)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(merchantId.toString()))
                .andExpect(jsonPath("$.name").value("BuildRight Co"))
                .andExpect(jsonPath("$.photoUrl").value("http://minio/photos/merchant-photo.jpg"));
    }

    @Test
    @WithMockUser
    public void addMerchant_whenServiceThrows_shouldReturn500WithErrorBody() throws Exception {
        given(procurementTeamService.addMerchant(anyMap()))
                .willThrow(new RuntimeException("Could not save merchant"));

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "Failing Merchant")
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement")
                        .param("merchantData", merchantDataJson)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Server Error"))
                .andExpect(jsonPath("$.message").value("Could not save merchant"));
    }

    @Test
    @WithMockUser
    public void addMerchant_withInvalidJson_shouldReturn500() throws Exception {
        // Passing malformed JSON that will cause objectMapper.readValue to throw
        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement")
                        .param("merchantData", "{ this is not valid json }")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Server Error"));
    }

    // ==================== PUT /api/v1/procurement/{id} ====================

    @Test
    @WithMockUser
    public void updateMerchant_withoutPhoto_shouldReturn200WithUpdatedMerchant() throws Exception {
        UUID id = UUID.randomUUID();

        Merchant updatedMerchant = Merchant.builder()
                .id(id)
                .merchantId("MERCH-001")
                .name("Acme Supplies Updated")
                .contactPhone("0509876543")
                .build();

        given(procurementTeamService.updateMerchant(eq(id), anyMap())).willReturn(updatedMerchant);

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "Acme Supplies Updated", "contactPhone", "0509876543")
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement/{id}", id)
                        .param("merchantData", merchantDataJson)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Acme Supplies Updated"));
    }

    @Test
    @WithMockUser
    public void updateMerchant_withPhoto_shouldReturn200WithUpdatedPhotoUrl() throws Exception {
        UUID id = UUID.randomUUID();

        Merchant updatedMerchant = Merchant.builder()
                .id(id)
                .merchantId("MERCH-003")
                .name("NewPhoto Corp")
                .photoUrl("http://minio/photos/new-photo.jpg")
                .build();

        given(minioService.uploadFile(any())).willReturn("new-photo.jpg");
        given(minioService.getFileUrl("new-photo.jpg"))
                .willReturn("http://minio/photos/new-photo.jpg");
        given(procurementTeamService.updateMerchant(eq(id), anyMap())).willReturn(updatedMerchant);

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "NewPhoto Corp")
        );

        MockMultipartFile photo = new MockMultipartFile(
                "photo",
                "new-photo.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "updated-image-content".getBytes()
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement/{id}", id)
                        .file(photo)
                        .param("merchantData", merchantDataJson)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value("http://minio/photos/new-photo.jpg"));
    }

    @Test
    @WithMockUser
    public void updateMerchant_whenMerchantNotFound_shouldReturn404() throws Exception {
        UUID id = UUID.randomUUID();

        given(procurementTeamService.updateMerchant(eq(id), anyMap()))
                .willThrow(new RuntimeException("Merchant not found with ID: " + id));

        String merchantDataJson = objectMapper.writeValueAsString(
                Map.of("name", "Ghost Merchant")
        );

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement/{id}", id)
                        .param("merchantData", merchantDataJson)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void updateMerchant_withInvalidJson_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/procurement/{id}", id)
                        .param("merchantData", "{ bad json }")
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== DELETE /api/v1/procurement/{id} ====================

    @Test
    @WithMockUser
    public void deleteMerchant_shouldReturn200WithSuccessMessage() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(procurementTeamService).deleteMerchant(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/procurement/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Merchant deleted successfully"));
    }

    @Test
    @WithMockUser
    public void deleteMerchant_whenMerchantNotFound_shouldReturn404WithErrorBody() throws Exception {
        UUID id = UUID.randomUUID();

        doThrow(new RuntimeException("Merchant not found"))
                .when(procurementTeamService).deleteMerchant(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/procurement/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Merchant not found"));
    }

    @Test
    @WithMockUser
    public void deleteMerchant_whenUnexpectedErrorOccurs_shouldReturn500WithErrorBody() throws Exception {
        UUID id = UUID.randomUUID();

        doThrow(new Error("JVM crash simulation"))
                .when(procurementTeamService).deleteMerchant(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/procurement/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Server Error"));
    }
}