package com.example.backend.services.id;

import com.example.backend.models.id.EntityIdSequence;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.id.EntityIdSequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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
    @Transactional(propagation = Propagation.MANDATORY)
    public String generateNextId(EntityTypeConfig entityType) {
        System.out.println("🔵 Starting ID generation for: " + entityType.name());

        int maxRetries = 5;
        int retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                System.out.println("🔵 Attempt #" + (retryCount + 1));

                // Find or create sequence
                EntityIdSequence sequence = sequenceRepository.findByEntityType(entityType)
                        .orElseGet(() -> {
                            System.out.println("⚠️ Sequence not found, creating new one");
                            EntityIdSequence newSequence = EntityIdSequence.builder()
                                    .entityType(entityType)
                                    .currentSequence(0L)
                                    .build();
                            return sequenceRepository.saveAndFlush(newSequence);
                        });

                System.out.println("🔵 Current sequence: " + sequence.getCurrentSequence() + ", version: " + sequence.getVersion());

                // Increment sequence
                Long nextNumber = sequence.getCurrentSequence() + 1;
                sequence.setCurrentSequence(nextNumber);

                System.out.println("🔵 Updating to sequence: " + nextNumber);
                EntityIdSequence saved = sequenceRepository.saveAndFlush(sequence);
                System.out.println("✅ Successfully saved! New version: " + saved.getVersion());

                // Format with enum-defined padding
                String paddedNumber = String.format(
                        "%0" + entityType.getPaddingLength() + "d",
                        nextNumber
                );

                String generatedId = entityType.getPrefix() + paddedNumber;
                System.out.println("✅ Generated ID: " + generatedId);
                return generatedId;

            } catch (Exception e) {
                System.err.println("❌ Error on attempt #" + (retryCount + 1) + ": " + e.getClass().getName());
                System.err.println("❌ Error message: " + e.getMessage());
                e.printStackTrace();

                retryCount++;
                if (retryCount >= maxRetries) {
                    System.err.println("❌ FAILED after " + maxRetries + " attempts");
                    throw new RuntimeException("Failed to generate ID after " + maxRetries + " attempts", e);
                }

                // Small delay before retry
                try {
                    System.out.println("⏳ Waiting 50ms before retry...");
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while retrying ID generation", ie);
                }
            }
        }

        System.err.println("❌ Should never reach here!");
        throw new RuntimeException("Failed to generate ID for " + entityType.name());
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