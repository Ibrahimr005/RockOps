package com.example.backend.repositories;

import com.example.backend.models.maintenance.DirectPurchaseTicket;
import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DirectPurchaseTicketRepository extends JpaRepository<DirectPurchaseTicket, UUID> {

    // Find by equipment
    List<DirectPurchaseTicket> findByEquipmentIdOrderByCreatedAtDesc(UUID equipmentId);

    // Find by merchant
    List<DirectPurchaseTicket> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId);

    // Find by status
    List<DirectPurchaseTicket> findByStatusOrderByCreatedAtDesc(DirectPurchaseStatus status);

    // Find by responsible user
    List<DirectPurchaseTicket> findByResponsibleUserIdOrderByCreatedAtDesc(UUID responsibleUserId);

    // Count by status
    long countByStatus(DirectPurchaseStatus status);

    // Find recent tickets
    @Query("SELECT t FROM DirectPurchaseTicket t ORDER BY t.createdAt DESC")
    List<DirectPurchaseTicket> findRecentTickets();

    // Find all ordered by creation date
    List<DirectPurchaseTicket> findAllByOrderByCreatedAtDesc();

    // Search tickets
    @Query("SELECT t FROM DirectPurchaseTicket t WHERE " +
           "LOWER(t.sparePart) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<DirectPurchaseTicket> searchTickets(@Param("searchTerm") String searchTerm);
}
