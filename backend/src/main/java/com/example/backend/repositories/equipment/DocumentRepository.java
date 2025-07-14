package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.Document;
import com.example.backend.models.equipment.Document.EntityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    // Find documents by entity type and ID
    List<Document> findByEntityTypeAndEntityIdOrderByUploadDateDesc(EntityType entityType, UUID entityId);

    // Find documents by entity type
    List<Document> findByEntityTypeOrderByUploadDateDesc(EntityType entityType);

    // Find by name containing (for search functionality)
    List<Document> findByNameContainingIgnoreCaseOrderByUploadDateDesc(String name);

    // Find by document type
    List<Document> findByTypeOrderByUploadDateDesc(String type);

    // Combined filters
    List<Document> findByEntityTypeAndTypeOrderByUploadDateDesc(EntityType entityType, String type);
    
    // Sarky-specific query methods
    List<Document> findByEntityTypeAndEntityIdAndIsSarkyDocumentTrueOrderByUploadDateDesc(EntityType entityType, UUID entityId);
    
    List<Document> findByEntityTypeAndEntityIdAndSarkyMonthAndSarkyYearOrderByUploadDateDesc(
        EntityType entityType, UUID entityId, Integer sarkyMonth, Integer sarkyYear);
    
    List<Document> findByIsSarkyDocumentTrueOrderByUploadDateDesc();
    
    List<Document> findBySarkyMonthAndSarkyYearOrderByUploadDateDesc(Integer sarkyMonth, Integer sarkyYear);
    
    List<Document> findByEntityTypeAndSarkyMonthAndSarkyYearOrderByUploadDateDesc(
        EntityType entityType, Integer sarkyMonth, Integer sarkyYear);
}