package com.example.backend.controllers;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
public class HealthCheckController {
    
    @GetMapping("/ping")
    public String ping() {
        return "PONG - Build timestamp: " + System.currentTimeMillis();
    }
}
