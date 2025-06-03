package com.example.backend.models.equipment;

import com.example.backend.models.hr.Employee;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "monetary_field_documents")
public class MonetaryFieldDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private MonetaryFieldType fieldType;

    @Column(nullable = false)
    private String documentName;

    @Column(nullable = false)
    private String documentType;

    @Column(nullable = true)
    private String fileUrl;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private LocalDate uploadDate;

    @ManyToOne
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private Employee uploadedBy;

    public enum MonetaryFieldType {
        SHIPPING,
        CUSTOMS,
        TAXES
    }
} 