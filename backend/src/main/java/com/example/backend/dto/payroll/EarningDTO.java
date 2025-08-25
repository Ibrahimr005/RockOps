// EarningDTO.java
package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EarningDTO {
    private UUID id;
    private String earningType;
    private String description;
    private BigDecimal amount;
    private Boolean isTaxable;
}
