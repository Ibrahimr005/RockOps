package com.example.backend.repositories;

import com.example.backend.models.maintenance.DirectPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DirectPurchaseItemRepository extends JpaRepository<DirectPurchaseItem, UUID> {

    /**
     * Find all items for a specific direct purchase ticket
     * @param ticketId The ticket ID
     * @return List of items
     */
    @Query("SELECT i FROM DirectPurchaseItem i WHERE i.directPurchaseTicket.id = :ticketId ORDER BY i.createdAt ASC")
    List<DirectPurchaseItem> findByDirectPurchaseTicketId(@Param("ticketId") UUID ticketId);

    /**
     * Find items with expected costs set for a ticket
     * @param ticketId The ticket ID
     * @return List of items with expected costs
     */
    @Query("SELECT i FROM DirectPurchaseItem i WHERE i.directPurchaseTicket.id = :ticketId AND i.expectedCostPerUnit IS NOT NULL AND i.expectedCostPerUnit > 0")
    List<DirectPurchaseItem> findItemsWithExpectedCostsById(@Param("ticketId") UUID ticketId);

    /**
     * Find items with actual costs set for a ticket
     * @param ticketId The ticket ID
     * @return List of items with actual costs
     */
    @Query("SELECT i FROM DirectPurchaseItem i WHERE i.directPurchaseTicket.id = :ticketId AND i.actualCostPerUnit IS NOT NULL AND i.actualCostPerUnit > 0")
    List<DirectPurchaseItem> findItemsWithActualCostsById(@Param("ticketId") UUID ticketId);

    /**
     * Count items for a specific ticket
     * @param ticketId The ticket ID
     * @return Number of items
     */
    @Query("SELECT COUNT(i) FROM DirectPurchaseItem i WHERE i.directPurchaseTicket.id = :ticketId")
    long countByDirectPurchaseTicketId(@Param("ticketId") UUID ticketId);

    /**
     * Delete all items for a specific ticket
     * @param ticketId The ticket ID
     */
    void deleteByDirectPurchaseTicketId(UUID ticketId);
}
