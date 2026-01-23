package com.example.backend.dto.payroll;

import com.example.backend.models.payroll.DeductionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for DeductionType entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionTypeDTO {

    private UUID id;

    @NotBlank(message = "Code is required")
    @Size(max = 20, message = "Code must be less than 20 characters")
    private String code;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be less than 100 characters")
    private String name;

    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;

    @NotNull(message = "Category is required")
    private DeductionType.DeductionCategory category;

    private String categoryDisplayName;

    private Boolean isSystemDefined;

    private Boolean isActive;

    private Boolean isTaxable;

    private Boolean showOnPayslip;

    private UUID siteId;

    private String siteName;

    // Audit fields
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to DTO
     */
    public static DeductionTypeDTO fromEntity(DeductionType entity) {
        if (entity == null) {
            return null;
        }

        return DeductionTypeDTO.builder()
            .id(entity.getId())
            .code(entity.getCode())
            .name(entity.getName())
            .description(entity.getDescription())
            .category(entity.getCategory())
            .categoryDisplayName(entity.getCategory() != null ? entity.getCategory().getDisplayName() : null)
            .isSystemDefined(entity.getIsSystemDefined())
            .isActive(entity.getIsActive())
            .isTaxable(entity.getIsTaxable())
            .showOnPayslip(entity.getShowOnPayslip())
            .siteId(entity.getSite() != null ? entity.getSite().getId() : null)
            .siteName(entity.getSite() != null ? entity.getSite().getName() : null)
            .createdBy(entity.getCreatedBy())
            .createdAt(entity.getCreatedAt())
            .updatedBy(entity.getUpdatedBy())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
