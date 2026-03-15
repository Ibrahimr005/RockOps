package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.OfferItemDTO;
import com.example.backend.dto.procurement.RFQExportRequest;
import com.example.backend.dto.procurement.RFQImportPreviewDTO;
import com.example.backend.services.procurement.OfferService;
import com.example.backend.services.procurement.RFQService;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RFQController.class)
@AutoConfigureMockMvc(addFilters = false)
public class RFQControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RFQService rfqService;

    @MockBean
    private OfferService offerService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID offerId;
    private UUID merchantId;
    private RFQExportRequest exportRequest;
    private RFQImportPreviewDTO previewDTO;
    private OfferItemDTO offerItemDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        offerId = UUID.randomUUID();
        merchantId = UUID.randomUUID();

        RFQExportRequest.RFQItemSelection itemSelection = new RFQExportRequest.RFQItemSelection(
                UUID.randomUUID(), "Steel Pipe", "meter", 100.0
        );

        exportRequest = new RFQExportRequest(
                offerId,
                List.of(itemSelection),
                "en",
                "RFQ_Test"
        );

        RFQImportPreviewDTO.RFQImportRow row = RFQImportPreviewDTO.RFQImportRow.builder()
                .rowNumber(1)
                .itemName("Steel Pipe")
                .responseQuantity(100.0)
                .unitPrice(new BigDecimal("25.00"))
                .totalPrice(new BigDecimal("2500.00"))
                .measuringUnit("meter")
                .currency("USD")
                .estimatedDeliveryDays(14)
                .isValid(true)
                .itemTypeId(UUID.randomUUID())
                .requestOrderItemId(UUID.randomUUID())
                .build();

        previewDTO = RFQImportPreviewDTO.builder()
                .rows(List.of(row))
                .totalRows(1)
                .validRows(1)
                .invalidRows(0)
                .errors(Collections.emptyList())
                .build();

        offerItemDTO = OfferItemDTO.builder()
                .id(UUID.randomUUID())
                .offerId(offerId)
                .merchantId(merchantId)
                .quantity(100.0)
                .unitPrice(new BigDecimal("25.00"))
                .totalPrice(new BigDecimal("2500.00"))
                .currency("USD")
                .build();
    }

    // ==================== POST /api/procurement/rfq/export ====================

    @Test
    @WithMockUser
    void exportRFQ_validRequest_shouldReturn200WithBytes() throws Exception {
        byte[] excelBytes = "fake-excel-content".getBytes();
        given(rfqService.exportRFQ(any(RFQExportRequest.class))).willReturn(excelBytes);

        mockMvc.perform(post("/api/procurement/rfq/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void exportRFQ_noFilenameInRequest_shouldReturn200WithDefaultFilename() throws Exception {
        exportRequest.setFilename(null);
        byte[] excelBytes = "fake-excel-content".getBytes();
        given(rfqService.exportRFQ(any(RFQExportRequest.class))).willReturn(excelBytes);

        mockMvc.perform(post("/api/procurement/rfq/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void exportRFQ_filenameWithoutExtension_shouldReturn200WithXlsxExtension() throws Exception {
        exportRequest.setFilename("MyRFQ");
        byte[] excelBytes = "fake-excel-content".getBytes();
        given(rfqService.exportRFQ(any(RFQExportRequest.class))).willReturn(excelBytes);

        mockMvc.perform(post("/api/procurement/rfq/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void exportRFQ_serviceThrowsException_shouldReturn500() throws Exception {
        given(rfqService.exportRFQ(any(RFQExportRequest.class)))
                .willThrow(new RuntimeException("Export failed"));

        mockMvc.perform(post("/api/procurement/rfq/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/procurement/rfq/{offerId}/import/preview ====================

    @Test
    @WithMockUser
    void previewImport_validFile_shouldReturn200WithPreview() throws Exception {
        given(rfqService.importAndPreviewRFQ(any(UUID.class), any()))
                .willReturn(previewDTO);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "rfq_response.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fake-xlsx-content".getBytes()
        );

        mockMvc.perform(multipart("/api/procurement/rfq/{offerId}/import/preview", offerId)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(1))
                .andExpect(jsonPath("$.validRows").value(1))
                .andExpect(jsonPath("$.invalidRows").value(0));
    }

    @Test
    @WithMockUser
    void previewImport_emptyFile_shouldReturn400() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "rfq_response.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/procurement/rfq/{offerId}/import/preview", offerId)
                        .file(emptyFile))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void previewImport_serviceThrowsException_shouldReturn500() throws Exception {
        given(rfqService.importAndPreviewRFQ(any(UUID.class), any()))
                .willThrow(new RuntimeException("Cannot parse file"));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "rfq_response.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "bad-content".getBytes()
        );

        mockMvc.perform(multipart("/api/procurement/rfq/{offerId}/import/preview", offerId)
                        .file(file))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/procurement/rfq/{offerId}/import/confirm ====================

    @Test
    @WithMockUser(username = "procurement.manager")
    void confirmImport_validRequest_shouldReturn200WithItemList() throws Exception {
        UUID validRowId = UUID.randomUUID();
        given(offerService.confirmRFQImport(
                any(UUID.class), any(UUID.class), anyList(), any(RFQImportPreviewDTO.class), anyString()))
                .willReturn(List.of(offerItemDTO));

        mockMvc.perform(post("/api/procurement/rfq/{offerId}/import/confirm", offerId)
                        .param("merchantId", merchantId.toString())
                        .param("validRowIds", validRowId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(previewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].offerId").value(offerId.toString()))
                .andExpect(jsonPath("$[0].currency").value("USD"));
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void confirmImport_emptyResultList_shouldReturn200WithEmptyArray() throws Exception {
        UUID validRowId = UUID.randomUUID();
        given(offerService.confirmRFQImport(
                any(UUID.class), any(UUID.class), anyList(), any(RFQImportPreviewDTO.class), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(post("/api/procurement/rfq/{offerId}/import/confirm", offerId)
                        .param("merchantId", merchantId.toString())
                        .param("validRowIds", validRowId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(previewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void confirmImport_serviceThrowsException_shouldReturn500() throws Exception {
        UUID validRowId = UUID.randomUUID();
        given(offerService.confirmRFQImport(
                any(UUID.class), any(UUID.class), anyList(), any(RFQImportPreviewDTO.class), anyString()))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(post("/api/procurement/rfq/{offerId}/import/confirm", offerId)
                        .param("merchantId", merchantId.toString())
                        .param("validRowIds", validRowId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(previewDTO)))
                .andExpect(status().isInternalServerError());
    }
}