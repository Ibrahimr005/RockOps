package com.example.backend.services.id;

import com.example.backend.models.id.EntityIdSequence;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.id.EntityIdSequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntityIdGeneratorService {

    @Autowired
    private EntityIdSequenceRepository sequenceRepository;

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
                    // Auto-create if doesn't exist
                    EntityIdSequence newSequence = EntityIdSequence.builder()
                            .entityType(entityType)
                            .currentSequence(0L)
                            .build();
                    return sequenceRepository.save(newSequence);
                });

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