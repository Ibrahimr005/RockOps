package com.example.backend.services.id;

import com.example.backend.models.id.EntityIdSequence;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.id.EntityIdSequenceRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntityIdGeneratorService {

    @Autowired
    private EntityIdSequenceRepository sequenceRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    /**
     * Generate next ID for an entity type
     * @param entityType The entity type enum
     * @return Generated ID (e.g., "MCH000001")
     */
    @Transactional
    public String generateNextId(EntityTypeConfig entityType) {
        // Find or create sequence
        EntityIdSequence sequence = sequenceRepository.findByEntityType(entityType)
                .orElseGet(() -> {
                    EntityIdSequence newSequence = EntityIdSequence.builder()
                            .entityType(entityType)
                            .currentSequence(0L)
                            .build();
                    return sequenceRepository.save(newSequence);
                });

        // SAFETY CHECK: Verify sequence is not behind actual data
        Long maxExistingId = getMaxExistingIdForType(entityType);
        if (sequence.getCurrentSequence() < maxExistingId) {
            System.err.println("WARNING: Sequence out of sync for " + entityType +
                    ". Current: " + sequence.getCurrentSequence() +
                    ", Max existing: " + maxExistingId);
            sequence.setCurrentSequence(maxExistingId);
            sequenceRepository.save(sequence);
        }

        // Increment sequence
        Long nextNumber = sequence.getCurrentSequence() + 1;
        sequence.setCurrentSequence(nextNumber);
        sequenceRepository.save(sequence);

        // Format with enum-defined padding
        String paddedNumber = String.format(
                "%0" + entityType.getPaddingLength() + "d",
                nextNumber
        );

        return entityType.getPrefix() + paddedNumber;
    }

    private Long getMaxExistingIdForType(EntityTypeConfig entityType) {
        try {
            switch (entityType) {
                case MERCHANT:
                    return merchantRepository.findTopByOrderByMerchantIdDesc()
                            .map(m -> Long.parseLong(m.getMerchantId().substring(3)))
                            .orElse(0L);
                default:
                    return 0L;
            }
        } catch (Exception e) {
            // If no entities exist or error occurs, return 0
            return 0L;
        }
    }

    /**
     * Initialize a sequence with starting number
     */
    @Transactional
    public void initializeSequence(EntityTypeConfig entityType, Long startFrom) {
        EntityIdSequence sequence = sequenceRepository.findByEntityType(entityType)
                .orElse(EntityIdSequence.builder()
                        .entityType(entityType)
                        .currentSequence(startFrom != null ? startFrom : 0L)
                        .build());

        if (sequence.getCurrentSequence() == null || sequence.getCurrentSequence() == 0) {
            sequence.setCurrentSequence(startFrom != null ? startFrom : 0L);
        }

        sequenceRepository.save(sequence);
        System.out.println("Initialized sequence: " + entityType.name() + " -> " + entityType.getPrefix());
    }

    /**
     * Get current sequence number without incrementing
     */
    public Long getCurrentSequence(EntityTypeConfig entityType) {
        return sequenceRepository.findByEntityType(entityType)
                .map(EntityIdSequence::getCurrentSequence)
                .orElse(0L);
    }
}