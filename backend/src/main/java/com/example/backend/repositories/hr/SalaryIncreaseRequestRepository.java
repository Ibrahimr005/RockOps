package com.example.backend.repositories.hr;

import com.example.backend.models.hr.SalaryIncreaseRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SalaryIncreaseRequestRepository extends JpaRepository<SalaryIncreaseRequest, UUID> {

    List<SalaryIncreaseRequest> findByStatus(SalaryIncreaseRequest.Status status);

    List<SalaryIncreaseRequest> findByStatusAndSiteId(SalaryIncreaseRequest.Status status, UUID siteId);

    List<SalaryIncreaseRequest> findByEmployeeId(UUID employeeId);

    List<SalaryIncreaseRequest> findByJobPositionId(UUID jobPositionId);

    List<SalaryIncreaseRequest> findByRequestType(SalaryIncreaseRequest.RequestType requestType);

    List<SalaryIncreaseRequest> findBySiteId(UUID siteId);

    @Query("SELECT s FROM SalaryIncreaseRequest s LEFT JOIN FETCH s.employee LEFT JOIN FETCH s.jobPosition jp LEFT JOIN FETCH jp.department LEFT JOIN FETCH s.site ORDER BY s.createdAt DESC")
    List<SalaryIncreaseRequest> findAllOrderByCreatedAtDesc();

    long countByStatus(SalaryIncreaseRequest.Status status);

    @Query("SELECT COUNT(r) > 0 FROM SalaryIncreaseRequest r " +
            "WHERE r.employee.id = :employeeId AND r.status IN ('PENDING_HR', 'PENDING_FINANCE')")
    boolean existsPendingForEmployee(@Param("employeeId") UUID employeeId);

    @Query("SELECT COUNT(r) > 0 FROM SalaryIncreaseRequest r " +
            "WHERE r.jobPosition.id = :jobPositionId AND r.status IN ('PENDING_HR', 'PENDING_FINANCE')")
    boolean existsPendingForPosition(@Param("jobPositionId") UUID jobPositionId);
}
