package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTypeDTO {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean requiresBankDetails;
    private Boolean requiresWalletDetails;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private String createdBy;
}
