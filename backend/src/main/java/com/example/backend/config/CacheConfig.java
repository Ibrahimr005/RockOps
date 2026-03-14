package com.example.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Default cache spec: 5 min TTL, max 500 entries
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(5, TimeUnit.MINUTES));

        // Register all cache names so they're created with defaults
        cacheManager.setCacheNames(java.util.List.of(
                "sites", "departments", "itemCategories", "equipmentTypes",
                "measuringUnits", "workTypes", "paymentTypes",
                "merchants", "partners", "jobPositions", "employees"
        ));

        return cacheManager;
    }
}
