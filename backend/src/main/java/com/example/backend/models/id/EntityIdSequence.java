package com.example.backend.models.id;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "entity_id_sequences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityIdSequence {

    @Id
    @Enumerated(EnumType.STRING)
    private EntityTypeConfig entityType; // Now it's an enum!

    @Column(nullable = false)
    private Long currentSequence;

    @Version
    private Long version;
}