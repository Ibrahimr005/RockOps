package com.example.backend.dto.warehouse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseDTO {
    private UUID id;
    private String name;
    private String photoUrl;
    private UUID siteId;
    private String siteName;
}
