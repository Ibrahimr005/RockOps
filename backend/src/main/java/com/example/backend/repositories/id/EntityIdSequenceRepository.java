package com.example.backend.repositories.id;

import com.example.backend.models.id.EntityIdSequence;
import com.example.backend.models.id.EntityTypeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface EntityIdSequenceRepository extends JpaRepository<EntityIdSequence, EntityTypeConfig> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EntityIdSequence> findByEntityType(EntityTypeConfig entityType);
}