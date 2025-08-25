package com.example.backend.dto.user;

import com.example.backend.dto.warehouse.WarehouseDTO;
import com.example.backend.models.user.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private UUID id;
    private String username;
    private String firstName;
    private String lastName;
    private Role role;
    private boolean enabled;
    private List<WarehouseDTO> assignedWarehouses;
}