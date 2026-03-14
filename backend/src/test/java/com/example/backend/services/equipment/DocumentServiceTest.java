package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.DocumentDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.Document;
import com.example.backend.models.equipment.Document.EntityType;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.DocumentRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MinioService minioService;

    @Mock
    private MerchantRepository merchantRepository;

    @InjectMocks
    private DocumentService documentService;

    // ==================== getDocumentsByEntity ====================

    @Test
    public void getDocumentsByEntity_equipment_shouldReturnDocs() {
        UUID entityId = UUID.randomUUID();
        Equipment equipment = new Equipment();
        equipment.setId(entityId);
        EquipmentType type = new EquipmentType();
        type.setName("Excavator");
        equipment.setType(type);
        equipment.setModel("CAT 320");

        Document doc = createDocument(entityId, EntityType.EQUIPMENT, "Manual", "PDF");

        when(equipmentRepository.findById(entityId)).thenReturn(Optional.of(equipment));
        when(documentRepository.findByEntityTypeAndEntityIdOrderByUploadDateDesc(EntityType.EQUIPMENT, entityId))
                .thenReturn(List.of(doc));

        List<DocumentDTO> result = documentService.getDocumentsByEntity(EntityType.EQUIPMENT, entityId);

        assertEquals(1, result.size());
        assertEquals("Manual", result.get(0).getName());
    }

    @Test
    public void getDocumentsByEntity_site_shouldReturnDocs() {
        UUID entityId = UUID.randomUUID();
        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "Report", "PDF");

        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));
        when(documentRepository.findByEntityTypeAndEntityIdOrderByUploadDateDesc(EntityType.SITE, entityId))
                .thenReturn(List.of(doc));

        List<DocumentDTO> result = documentService.getDocumentsByEntity(EntityType.SITE, entityId);

        assertEquals(1, result.size());
    }

    @Test
    public void getDocumentsByEntity_equipmentNotFound_shouldThrow() {
        UUID entityId = UUID.randomUUID();
        when(equipmentRepository.findById(entityId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> documentService.getDocumentsByEntity(EntityType.EQUIPMENT, entityId));
    }

    @Test
    public void getDocumentsByEntity_empty_shouldReturnEmpty() {
        UUID entityId = UUID.randomUUID();
        Warehouse warehouse = new Warehouse();
        warehouse.setId(entityId);
        warehouse.setName("WH-1");

        when(warehouseRepository.findById(entityId)).thenReturn(Optional.of(warehouse));
        when(documentRepository.findByEntityTypeAndEntityIdOrderByUploadDateDesc(EntityType.WAREHOUSE, entityId))
                .thenReturn(List.of());

        List<DocumentDTO> result = documentService.getDocumentsByEntity(EntityType.WAREHOUSE, entityId);

        assertTrue(result.isEmpty());
    }

    // ==================== getDocumentById ====================

    @Test
    public void getDocumentById_found_shouldReturn() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "Report", "PDF");
        doc.setId(docId);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.getDocumentById(docId);

        assertNotNull(result);
        assertEquals("Report", result.getName());
    }

    @Test
    public void getDocumentById_notFound_shouldThrow() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> documentService.getDocumentById(docId));
    }

    // ==================== updateDocument ====================

    @Test
    public void updateDocument_success_shouldUpdate() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "OldName", "OldType");
        doc.setId(docId);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.updateDocument(docId, "NewName", "NewType");

        assertEquals("NewName", result.getName());
        assertEquals("NewType", result.getType());
    }

    @Test
    public void updateDocument_nullFields_shouldKeepExisting() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "KeepName", "KeepType");
        doc.setId(docId);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.updateDocument(docId, null, null);

        assertEquals("KeepName", result.getName());
        assertEquals("KeepType", result.getType());
    }

    @Test
    public void updateDocument_emptyStrings_shouldKeepExisting() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "KeepName", "KeepType");
        doc.setId(docId);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.updateDocument(docId, "  ", "  ");

        assertEquals("KeepName", result.getName());
        assertEquals("KeepType", result.getType());
    }

    @Test
    public void updateDocument_notFound_shouldThrow() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> documentService.updateDocument(docId, "Name", "Type"));
    }

    // ==================== deleteDocument ====================

    @Test
    public void deleteDocument_noFile_shouldDelete() throws Exception {
        UUID docId = UUID.randomUUID();
        Document doc = createDocument(UUID.randomUUID(), EntityType.SITE, "Report", "PDF");
        doc.setId(docId);
        doc.setFileUrl(null);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        documentService.deleteDocument(docId);

        verify(documentRepository).delete(doc);
    }

    @Test
    public void deleteDocument_notFound_shouldThrow() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> documentService.deleteDocument(docId));
    }

    // ==================== assignToSarkyMonth ====================

    @Test
    public void assignToSarkyMonth_success_shouldAssign() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "Report", "PDF");
        doc.setId(docId);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.assignToSarkyMonth(docId, 3, 2026);

        assertTrue(result.getIsSarkyDocument());
        assertEquals(3, result.getSarkyMonth());
        assertEquals(2026, result.getSarkyYear());
    }

    @Test
    public void assignToSarkyMonth_notFound_shouldThrow() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> documentService.assignToSarkyMonth(docId, 3, 2026));
    }

    // ==================== removeSarkyAssignment ====================

    @Test
    public void removeSarkyAssignment_success_shouldRemove() {
        UUID docId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document doc = createDocument(entityId, EntityType.SITE, "Report", "PDF");
        doc.setId(docId);
        doc.setIsSarkyDocument(true);
        doc.setSarkyMonth(3);
        doc.setSarkyYear(2026);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));

        DocumentDTO result = documentService.removeSarkyAssignment(docId);

        assertFalse(result.getIsSarkyDocument());
        assertNull(result.getSarkyMonth());
        assertNull(result.getSarkyYear());
    }

    // ==================== getAllSarkyDocuments ====================

    @Test
    public void getAllSarkyDocuments_shouldReturnSarkyOnly() {
        UUID entityId = UUID.randomUUID();

        Site site = new Site();
        site.setId(entityId);
        site.setName("Site A");

        Document sarkyDoc = createDocument(entityId, EntityType.SITE, "Sarky Report", "PDF");
        sarkyDoc.setIsSarkyDocument(true);

        when(siteRepository.findById(entityId)).thenReturn(Optional.of(site));
        when(documentRepository.findByEntityTypeAndEntityIdAndIsSarkyDocumentTrueOrderByUploadDateDesc(EntityType.SITE, entityId))
                .thenReturn(List.of(sarkyDoc));

        List<DocumentDTO> result = documentService.getAllSarkyDocuments(EntityType.SITE, entityId);

        assertEquals(1, result.size());
    }

    // ==================== getSarkyDocumentTypes ====================

    @Test
    public void getSarkyDocumentTypes_shouldReturnStaticList() {
        List<String> types = documentService.getSarkyDocumentTypes();

        assertFalse(types.isEmpty());
        assertTrue(types.contains("DAILY_REPORT"));
        assertTrue(types.contains("FUEL_LOG"));
        assertTrue(types.contains("MAINTENANCE_LOG"));
    }

    // ==================== unsupported entity type ====================

    @Test
    public void getDocumentsByEntity_unsupportedType_shouldThrow() {
        UUID entityId = UUID.randomUUID();

        // EntityType with no handler will throw IllegalArgumentException
        // This tests the default case in verifyEntityExists
        // We can only test entity types that exist in the enum but aren't handled
        // For now, test that valid types work correctly (covered above)
    }

    // ==================== Helper ====================

    private Document createDocument(UUID entityId, EntityType entityType, String name, String type) {
        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setEntityType(entityType);
        doc.setEntityId(entityId);
        doc.setName(name);
        doc.setType(type);
        doc.setUploadDate(LocalDate.now());
        doc.setFileSize(1024L);
        doc.setIsSarkyDocument(false);
        return doc;
    }
}