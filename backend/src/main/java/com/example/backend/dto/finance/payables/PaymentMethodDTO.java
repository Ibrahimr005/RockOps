package com.example.backend.dto.finance.payables;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodDTO {
    private UUID id;
    private String name;
    private String description;
    private Boolean isActive;
}
