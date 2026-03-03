package com.example.backend.repositories.hr;

import com.example.backend.models.hr.DemotionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DemotionRequestRepository extends JpaRepository<DemotionRequest, UUID> {

    List<DemotionRequest> findByStatus(DemotionRequest.Status status);

    @Query("SELECT d FROM DemotionRequest d ORDER BY d.createdAt DESC")
    List<DemotionRequest> findAllOrderByCreatedAtDesc();

    @Query("SELECT d FROM DemotionRequest d WHERE d.employee.id = :employeeId ORDER BY d.createdAt DESC")
    List<DemotionRequest> findByEmployeeId(@Param("employeeId") UUID employeeId);

    long countByStatus(DemotionRequest.Status status);

    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM DemotionRequest d " +
           "WHERE d.employee.id = :employeeId AND d.status IN ('PENDING', 'DEPT_HEAD_APPROVED')")
    boolean existsPendingForEmployee(@Param("employeeId") UUID employeeId);
}
