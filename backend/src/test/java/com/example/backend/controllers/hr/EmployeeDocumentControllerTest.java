package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.EmployeeDocumentDTO;
import com.example.backend.services.hr.EmployeeDocumentService;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = EmployeeDocumentController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EmployeeDocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmployeeDocumentService documentService;

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

    private EmployeeDocumentDTO buildDocumentDTO(UUID id, UUID employeeId) {
        return EmployeeDocumentDTO.builder()
                .id(id)
                .employeeId(employeeId)
                .fileName("contract.pdf")
                .fileUrl("http://storage/contract.pdf")
                .fileSize(1024L)
                .mimeType("application/pdf")
                .documentType("CONTRACT")
                .documentTypeName("Employment Contract")
                .description("Initial contract")
                .uploadedAt(LocalDateTime.now())
                .uploadedBy("HR Admin")
                .build();
    }

    // ==================== GET /api/v1/hr/employees/{employeeId}/documents ====================

    @Test
    public void getEmployeeDocuments_shouldReturn200WithDocumentsAndCount() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(docId, employeeId);

        given(documentService.getEmployeeDocuments(employeeId)).willReturn(List.of(dto));
        given(documentService.getDocumentCount(employeeId)).willReturn(1L);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.documents").isArray())
                .andExpect(jsonPath("$.documents[0].fileName").value("contract.pdf"));
    }

    @Test
    public void getEmployeeDocuments_empty_shouldReturn200WithZeroCount() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.getEmployeeDocuments(employeeId)).willReturn(Collections.emptyList());
        given(documentService.getDocumentCount(employeeId)).willReturn(0L);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.documents").isArray())
                .andExpect(jsonPath("$.documents").isEmpty());
    }

    @Test
    public void getEmployeeDocuments_whenServiceThrows_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(documentService.getEmployeeDocuments(employeeId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== GET /api/v1/hr/employees/{employeeId}/documents/{documentId} ====================

    @Test
    public void getDocumentById_shouldReturn200WithDocument() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(documentId, employeeId);

        given(documentService.getDocumentById(documentId)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents/{documentId}",
                                employeeId, documentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(documentId.toString()))
                .andExpect(jsonPath("$.fileName").value("contract.pdf"));
    }

    @Test
    public void getDocumentById_whenNotFound_shouldReturn404() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();

        given(documentService.getDocumentById(documentId))
                .willThrow(new RuntimeException("Document not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents/{documentId}",
                                employeeId, documentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== POST /api/v1/hr/employees/{employeeId}/documents ====================

    @Test
    public void uploadDocument_shouldReturn201WithDocument() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(docId, employeeId);

        given(documentService.uploadDocument(
                eq(employeeId), any(), eq("CONTRACT"), anyString(), anyString()))
                .willReturn(dto);

        MockMultipartFile file = new MockMultipartFile(
                "file", "contract.pdf", MediaType.APPLICATION_PDF_VALUE,
                "pdf-content".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .file(file)
                        .param("documentType", "CONTRACT")
                        .param("description", "Initial contract")
                        .param("uploadedBy", "HR Admin"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document uploaded successfully"))
                .andExpect(jsonPath("$.document.fileName").value("contract.pdf"));
    }

    @Test
    public void uploadDocument_withoutOptionalParams_shouldReturn201() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(docId, employeeId);

        given(documentService.uploadDocument(
                eq(employeeId), any(), eq("ID"), isNull(), eq("System")))
                .willReturn(dto);

        MockMultipartFile file = new MockMultipartFile(
                "file", "id.jpg", MediaType.IMAGE_JPEG_VALUE,
                "image-bytes".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .file(file)
                        .param("documentType", "ID"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void uploadDocument_whenServiceThrows_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.uploadDocument(any(), any(), any(), any(), any()))
                .willThrow(new RuntimeException("Upload failed: file too large"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "big.pdf", MediaType.APPLICATION_PDF_VALUE,
                "content".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents", employeeId)
                        .file(file)
                        .param("documentType", "CONTRACT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== POST /api/v1/hr/employees/{employeeId}/documents/bulk ====================

    @Test
    public void uploadMultipleDocuments_shouldReturn201WithCount() throws Exception {
        UUID employeeId = UUID.randomUUID();
        EmployeeDocumentDTO dto1 = buildDocumentDTO(UUID.randomUUID(), employeeId);
        EmployeeDocumentDTO dto2 = buildDocumentDTO(UUID.randomUUID(), employeeId);

        given(documentService.uploadMultipleDocuments(
                eq(employeeId), any(), eq("CERTIFICATE"), any(), any()))
                .willReturn(List.of(dto1, dto2));

        MockMultipartFile file1 = new MockMultipartFile(
                "files", "cert1.pdf", MediaType.APPLICATION_PDF_VALUE, "c1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "files", "cert2.pdf", MediaType.APPLICATION_PDF_VALUE, "c2".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents/bulk", employeeId)
                        .file(file1)
                        .file(file2)
                        .param("documentType", "CERTIFICATE")
                        .param("uploadedBy", "Admin"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.documents").isArray());
    }

    @Test
    public void uploadMultipleDocuments_whenServiceThrows_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.uploadMultipleDocuments(any(), any(), any(), any(), any()))
                .willThrow(new RuntimeException("Bulk upload failed"));

        MockMultipartFile file = new MockMultipartFile(
                "files", "doc.pdf", MediaType.APPLICATION_PDF_VALUE, "bytes".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents/bulk", employeeId)
                        .file(file)
                        .param("documentType", "CERTIFICATE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== PUT /api/v1/hr/employees/{employeeId}/documents/id-card ====================

    @Test
    public void updateIdCard_front_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(UUID.randomUUID(), employeeId);
        dto.setDocumentType("ID_FRONT");

        given(documentService.updateIdCard(eq(employeeId), any(), eq(true), eq("HR Admin")))
                .willReturn(dto);

        MockMultipartFile file = new MockMultipartFile(
                "file", "id_front.jpg", MediaType.IMAGE_JPEG_VALUE, "img".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents/id-card", employeeId)
                        .file(file)
                        .param("isFront", "true")
                        .param("uploadedBy", "HR Admin")
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("ID card updated successfully"));
    }

    @Test
    public void updateIdCard_back_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(UUID.randomUUID(), employeeId);

        given(documentService.updateIdCard(eq(employeeId), any(), eq(false), anyString()))
                .willReturn(dto);

        MockMultipartFile file = new MockMultipartFile(
                "file", "id_back.jpg", MediaType.IMAGE_JPEG_VALUE, "img".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents/id-card", employeeId)
                        .file(file)
                        .param("isFront", "false")
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void updateIdCard_whenServiceThrows_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.updateIdCard(any(), any(), anyBoolean(), anyString()))
                .willThrow(new RuntimeException("Employee not found"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "id.jpg", MediaType.IMAGE_JPEG_VALUE, "img".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/hr/employees/{employeeId}/documents/id-card", employeeId)
                        .file(file)
                        .param("isFront", "true")
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== DELETE /api/v1/hr/employees/{employeeId}/documents/{documentId} ====================

    @Test
    public void deleteDocument_shouldReturn200WithSuccessMessage() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();

        doNothing().when(documentService).deleteDocument(documentId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/hr/employees/{employeeId}/documents/{documentId}",
                                employeeId, documentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document deleted successfully"));
    }

    @Test
    public void deleteDocument_whenServiceThrows_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();

        doThrow(new RuntimeException("Document not found"))
                .when(documentService).deleteDocument(documentId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/hr/employees/{employeeId}/documents/{documentId}",
                                employeeId, documentId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Document not found"));
    }

    // ==================== GET /api/v1/hr/employees/{employeeId}/documents/type/{documentType} ====================

    @Test
    public void getDocumentsByType_shouldReturn200WithList() throws Exception {
        UUID employeeId = UUID.randomUUID();
        EmployeeDocumentDTO dto = buildDocumentDTO(UUID.randomUUID(), employeeId);

        given(documentService.getDocumentsByType(employeeId, "CONTRACT"))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents/type/{documentType}",
                                employeeId, "CONTRACT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].documentType").value("CONTRACT"));
    }

    @Test
    public void getDocumentsByType_empty_shouldReturn200EmptyList() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.getDocumentsByType(employeeId, "CERTIFICATE"))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents/type/{documentType}",
                                employeeId, "CERTIFICATE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void getDocumentsByType_whenServiceThrows_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(documentService.getDocumentsByType(any(), anyString()))
                .willThrow(new RuntimeException("Invalid document type"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/hr/employees/{employeeId}/documents/type/{documentType}",
                                employeeId, "INVALID_TYPE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}