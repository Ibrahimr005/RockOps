package com.example.backend.authentication;

import com.example.backend.models.user.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private String token;
    private Role role;
    private String firstName;
    private String lastName;
    private String username;

}