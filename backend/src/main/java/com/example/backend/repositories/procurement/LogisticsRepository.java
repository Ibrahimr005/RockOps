package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.Logistics.Logistics;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LogisticsRepository extends JpaRepository<Logistics, UUID> {

    Optional<Logistics> findByLogisticsNumber(String logisticsNumber);

    List<Logistics> findByStatus(LogisticsStatus status);

    List<Logistics> findByStatusIn(List<LogisticsStatus> statuses);

    @Query("SELECT l FROM Logistics l LEFT JOIN FETCH l.paymentRequest WHERE l.paymentRequest.id = :paymentRequestId")
    Optional<Logistics> findByPaymentRequestId(@Param("paymentRequestId") UUID paymentRequestId);

    @Query("SELECT COUNT(l) FROM Logistics l WHERE l.logisticsNumber LIKE CONCAT(:prefix, '%')")
    long countByLogisticsNumberStartingWith(@Param("prefix") String prefix);

    @Query("SELECT l FROM Logistics l ORDER BY l.createdAt DESC")
    List<Logistics> findAllOrderByCreatedAtDesc();

    @Query("SELECT l FROM Logistics l WHERE " +
            "(:status IS NULL OR l.status = :status) AND " +
            "(:searchTerm IS NULL OR " +
            "LOWER(l.logisticsNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(l.carrierCompany) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(l.merchantName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(l.driverName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "ORDER BY l.createdAt DESC")
    List<Logistics> searchLogistics(
            @Param("status") LogisticsStatus status,
            @Param("searchTerm") String searchTerm
    );
}