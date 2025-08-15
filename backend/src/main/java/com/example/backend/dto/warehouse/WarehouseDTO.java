package com.example.backend.dto.warehouse;

import com.example.backend.models.site.Site;
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
    private Site site;
}