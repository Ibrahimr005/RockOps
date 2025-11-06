package com.example.backend.repositories.hr;

import com.example.backend.models.hr.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for EmployeeDocument entity
 */
@Repository
public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, UUID> {

    /**
     * Find all documents for a specific employee (excluding deleted)
     * @param employeeId Employee ID
     * @return List of documents
     */
    @Query("SELECT d FROM EmployeeDocument d WHERE d.employee.id = :employeeId AND d.isDeleted = false ORDER BY d.uploadedAt DESC")
    List<EmployeeDocument> findByEmployeeIdAndIsDeletedFalse(@Param("employeeId") UUID employeeId);

    /**
     * Find documents by type for a specific employee
     * @param employeeId Employee ID
     * @param documentType Document type
     * @return List of documents
     */
    @Query("SELECT d FROM EmployeeDocument d WHERE d.employee.id = :employeeId AND d.documentType = :documentType AND d.isDeleted = false")
    List<EmployeeDocument> findByEmployeeIdAndDocumentType(
            @Param("employeeId") UUID employeeId,
            @Param("documentType") EmployeeDocument.DocumentType documentType
    );

    /**
     * Count documents for an employee
     * @param employeeId Employee ID
     * @return Document count
     */
    @Query("SELECT COUNT(d) FROM EmployeeDocument d WHERE d.employee.id = :employeeId AND d.isDeleted = false")
    long countByEmployeeId(@Param("employeeId") UUID employeeId);

    /**
     * Find all documents (including deleted) for an employee
     * @param employeeId Employee ID
     * @return List of all documents
     */
    List<EmployeeDocument> findByEmployeeId(UUID employeeId);
}