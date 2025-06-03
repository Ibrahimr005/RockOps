package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.MonetaryFieldDocument;
import com.example.backend.models.equipment.MonetaryFieldDocument.MonetaryFieldType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MonetaryFieldDocumentRepository extends JpaRepository<MonetaryFieldDocument, UUID> {
    
    List<MonetaryFieldDocument> findByEquipmentIdOrderByUploadDateDesc(UUID equipmentId);
    
    List<MonetaryFieldDocument> findByEquipmentIdAndFieldTypeOrderByUploadDateDesc(UUID equipmentId, MonetaryFieldType fieldType);
    
    void deleteByEquipmentId(UUID equipmentId);
}