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

    private static final String BASE36_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final long HASH_MULTIPLIER = 2654435761L; // Knuth's multiplicative hash constant

    @Autowired
    private EntityIdSequenceRepository sequenceRepository;

    /**
     * Generate next ID for an entity type.
     * - Hashed types:     PREFIX-XXXXXX  (e.g., "DEPT-7WDRQP", "POS-FSRJHE")
     * - Sequential types:  PREFIX000001   (e.g., "MCH000001", "WH000002")
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public String generateNextId(EntityTypeConfig entityType) {
        int maxRetries = 5;
        int retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // Find or create sequence
                EntityIdSequence sequence = sequenceRepository.findByEntityType(entityType)
                        .orElseGet(() -> {
                            EntityIdSequence newSequence = EntityIdSequence.builder()
                                    .entityType(entityType)
                                    .currentSequence(0L)
                                    .build();
                            return sequenceRepository.saveAndFlush(newSequence);
                        });

                // Increment sequence
                Long nextNumber = sequence.getCurrentSequence() + 1;
                sequence.setCurrentSequence(nextNumber);
                sequenceRepository.saveAndFlush(sequence);

                if (entityType.isHashed()) {
                    // Hashed unique: PREFIX-XXXXXX
                    String code = hashToBase36(nextNumber, entityType.getPaddingLength());
                    return entityType.getPrefix() + "-" + code;
                } else {
                    // Sequential: PREFIX-000001
                    String paddedNumber = String.format(
                            "%0" + entityType.getPaddingLength() + "d",
                            nextNumber
                    );
                    return entityType.getPrefix() + "-" + paddedNumber;
                }

            } catch (Exception e) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw new RuntimeException("Failed to generate ID after " + maxRetries + " attempts", e);
                }

                try {
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while retrying ID generation", ie);
                }
            }
        }

        throw new RuntimeException("Failed to generate ID for " + entityType.name());
    }

    /**
     * Hash a sequential counter into a fixed-length base-36 alphanumeric code.
     * Uses Knuth's multiplicative hash for a bijective (collision-free) mapping.
     */
    private String hashToBase36(long counter, int length) {
        long maxValue = 1;
        for (int i = 0; i < length; i++) {
            maxValue *= 36;
        }

        long hashed = (counter * HASH_MULTIPLIER) % maxValue;
        if (hashed < 0) {
            hashed += maxValue;
        }

        char[] result = new char[length];
        for (int i = length - 1; i >= 0; i--) {
            result[i] = BASE36_CHARS.charAt((int) (hashed % 36));
            hashed /= 36;
        }
        return new String(result);
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
