package com.example.backend.services.hr;

import com.example.backend.dto.hr.EmployeeDocumentDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.EmployeeDocument;
import com.example.backend.repositories.hr.EmployeeDocumentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeDocumentServiceTest {

    @Mock
    private EmployeeDocumentRepository documentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private EmployeeDocumentService documentService;

    private UUID employeeId;
    private Employee employee;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");
    }

    private EmployeeDocument createDocument(UUID docId) {
        return EmployeeDocument.builder()
                .id(docId)
                .employee(employee)
                .fileName("test.pdf")
                .fileUrl("http://storage/test.pdf")
                .fileSize(1024L)
                .mimeType("application/pdf")
                .documentType(EmployeeDocument.DocumentType.CONTRACT)
                .description("Employment contract")
                .uploadedBy("admin")
                .uploadedAt(LocalDateTime.now())
                .isDeleted(false)
                .build();
    }

    // =========================================================================
    // getEmployeeDocuments
    // =========================================================================
    @Nested
    @DisplayName("getEmployeeDocuments")
    class GetEmployeeDocuments {

        @Test
        @DisplayName("should return list of documents for employee")
        void shouldReturnDocuments() {
            EmployeeDocument doc = createDocument(UUID.randomUUID());
            when(documentRepository.findByEmployeeIdAndIsDeletedFalse(employeeId))
                    .thenReturn(List.of(doc));

            List<EmployeeDocumentDTO> result = documentService.getEmployeeDocuments(employeeId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getFileName()).isEqualTo("test.pdf");
        }

        @Test
        @DisplayName("should return empty list when no documents exist")
        void shouldReturnEmptyList() {
            when(documentRepository.findByEmployeeIdAndIsDeletedFalse(employeeId))
                    .thenReturn(Collections.emptyList());

            List<EmployeeDocumentDTO> result = documentService.getEmployeeDocuments(employeeId);

            assertThat(result).isEmpty();
        }
    }

    // =========================================================================
    // getDocumentById
    // =========================================================================
    @Nested
    @DisplayName("getDocumentById")
    class GetDocumentById {

        @Test
        @DisplayName("should return document when found and not deleted")
        void shouldReturnDocument() {
            UUID docId = UUID.randomUUID();
            EmployeeDocument doc = createDocument(docId);

            when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

            EmployeeDocumentDTO result = documentService.getDocumentById(docId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(docId);
        }

        @Test
        @DisplayName("should throw when document not found")
        void shouldThrowWhenNotFound() {
            UUID docId = UUID.randomUUID();
            when(documentRepository.findById(docId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> documentService.getDocumentById(docId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Document not found");
        }

        @Test
        @DisplayName("should throw when document is deleted")
        void shouldThrowWhenDeleted() {
            UUID docId = UUID.randomUUID();
            EmployeeDocument doc = createDocument(docId);
            doc.setIsDeleted(true);

            when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

            assertThatThrownBy(() -> documentService.getDocumentById(docId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("deleted");
        }
    }

    // =========================================================================
    // uploadDocument
    // =========================================================================
    @Nested
    @DisplayName("uploadDocument")
    class UploadDocument {

        @Test
        @DisplayName("should upload document successfully")
        void shouldUploadSuccessfully() throws Exception {
            MultipartFile file = mock(MultipartFile.class);
            when(file.isEmpty()).thenReturn(false);
            when(file.getOriginalFilename()).thenReturn("contract.pdf");
            when(file.getSize()).thenReturn(2048L);
            when(file.getContentType()).thenReturn("application/pdf");

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(fileStorageService.uploadFile(file)).thenReturn("stored-file-name.pdf");
            when(fileStorageService.getFileUrl("stored-file-name.pdf"))
                    .thenReturn("http://storage/stored-file-name.pdf");
            when(documentRepository.save(any(EmployeeDocument.class))).thenAnswer(inv -> {
                EmployeeDocument d = inv.getArgument(0);
                d.setId(UUID.randomUUID());
                d.setUploadedAt(LocalDateTime.now());
                return d;
            });

            EmployeeDocumentDTO result = documentService.uploadDocument(
                    employeeId, file, "CONTRACT", "Employment contract", "admin");

            assertThat(result).isNotNull();
            assertThat(result.getFileName()).isEqualTo("contract.pdf");
            verify(fileStorageService).uploadFile(file);
            verify(documentRepository).save(any(EmployeeDocument.class));
        }

        @Test
        @DisplayName("should throw when file is null")
        void shouldThrowWhenFileIsNull() {
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> documentService.uploadDocument(
                    employeeId, null, "CONTRACT", "desc", "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("File is required");
        }

        @Test
        @DisplayName("should throw when file is empty")
        void shouldThrowWhenFileIsEmpty() {
            MultipartFile file = mock(MultipartFile.class);
            when(file.isEmpty()).thenReturn(true);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> documentService.uploadDocument(
                    employeeId, file, "CONTRACT", "desc", "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("File is required");
        }

        @Test
        @DisplayName("should throw for invalid document type")
        void shouldThrowForInvalidType() {
            MultipartFile file = mock(MultipartFile.class);
            when(file.isEmpty()).thenReturn(false);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> documentService.uploadDocument(
                    employeeId, file, "INVALID_TYPE", "desc", "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Invalid document type");
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenEmployeeNotFound() {
            UUID unknownId = UUID.randomUUID();
            MultipartFile file = mock(MultipartFile.class);

            when(employeeRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> documentService.uploadDocument(
                    unknownId, file, "CONTRACT", "desc", "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }
    }

    // =========================================================================
    // uploadMultipleDocuments
    // =========================================================================
    @Test
    @DisplayName("uploadMultipleDocuments should upload all files")
    void shouldUploadMultipleDocuments() throws Exception {
        MultipartFile file1 = mock(MultipartFile.class);
        MultipartFile file2 = mock(MultipartFile.class);

        when(file1.isEmpty()).thenReturn(false);
        when(file1.getOriginalFilename()).thenReturn("doc1.pdf");
        when(file1.getSize()).thenReturn(1024L);
        when(file1.getContentType()).thenReturn("application/pdf");

        when(file2.isEmpty()).thenReturn(false);
        when(file2.getOriginalFilename()).thenReturn("doc2.pdf");
        when(file2.getSize()).thenReturn(2048L);
        when(file2.getContentType()).thenReturn("application/pdf");

        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(fileStorageService.uploadFile(any(MultipartFile.class))).thenReturn("stored.pdf");
        when(fileStorageService.getFileUrl("stored.pdf")).thenReturn("http://storage/stored.pdf");
        when(documentRepository.save(any(EmployeeDocument.class))).thenAnswer(inv -> {
            EmployeeDocument d = inv.getArgument(0);
            d.setId(UUID.randomUUID());
            d.setUploadedAt(LocalDateTime.now());
            return d;
        });

        List<EmployeeDocumentDTO> result = documentService.uploadMultipleDocuments(
                employeeId, List.of(file1, file2), "CERTIFICATE", "Certs", "admin");

        assertThat(result).hasSize(2);
        verify(fileStorageService, times(2)).uploadFile(any(MultipartFile.class));
    }

    // =========================================================================
    // deleteDocument
    // =========================================================================
    @Nested
    @DisplayName("deleteDocument")
    class DeleteDocument {

        @Test
        @DisplayName("should soft delete document successfully")
        void shouldSoftDelete() {
            UUID docId = UUID.randomUUID();
            EmployeeDocument doc = createDocument(docId);

            when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
            when(documentRepository.save(any(EmployeeDocument.class))).thenAnswer(inv -> inv.getArgument(0));

            documentService.deleteDocument(docId);

            verify(documentRepository).save(argThat(d -> d.getIsDeleted()));
        }

        @Test
        @DisplayName("should throw when document not found")
        void shouldThrowWhenNotFound() {
            UUID docId = UUID.randomUUID();
            when(documentRepository.findById(docId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> documentService.deleteDocument(docId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Document not found");
        }
    }

    // =========================================================================
    // getDocumentCount
    // =========================================================================
    @Test
    @DisplayName("getDocumentCount should return count from repository")
    void shouldReturnDocumentCount() {
        when(documentRepository.countByEmployeeId(employeeId)).thenReturn(5L);

        long count = documentService.getDocumentCount(employeeId);

        assertThat(count).isEqualTo(5L);
    }

    // =========================================================================
    // getDocumentsByType
    // =========================================================================
    @Nested
    @DisplayName("getDocumentsByType")
    class GetDocumentsByType {

        @Test
        @DisplayName("should return documents filtered by valid type")
        void shouldReturnDocumentsByType() {
            EmployeeDocument doc = createDocument(UUID.randomUUID());
            when(documentRepository.findByEmployeeIdAndDocumentType(employeeId, EmployeeDocument.DocumentType.CONTRACT))
                    .thenReturn(List.of(doc));

            List<EmployeeDocumentDTO> result = documentService.getDocumentsByType(employeeId, "CONTRACT");

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should throw for invalid document type")
        void shouldThrowForInvalidType() {
            assertThatThrownBy(() -> documentService.getDocumentsByType(employeeId, "INVALID_TYPE"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Invalid document type");
        }
    }
}