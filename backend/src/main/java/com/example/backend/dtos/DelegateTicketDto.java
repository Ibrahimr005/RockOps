package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DelegateTicketDto {
    @NotNull(message = "Responsible user ID is required")
    private UUID responsibleUserId;
}
