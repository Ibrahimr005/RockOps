package com.example.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        List<CaffeineCache> caches = new ArrayList<>();

        // Default caches: 5 min TTL, max 500 entries
        List<String> defaultCacheNames = List.of(
                "sites", "departments", "itemCategories", "equipmentTypes",
                "measuringUnits", "workTypes", "paymentTypes",
                "merchants", "partners", "jobPositions", "employees"
        );

        for (String name : defaultCacheNames) {
            caches.add(new CaffeineCache(name,
                    Caffeine.newBuilder()
                            .maximumSize(500)
                            .expireAfterWrite(5, TimeUnit.MINUTES)
                            .build()));
        }

        // Statistics cache: 2 min TTL (salary increase, promotion, demotion stats)
        caches.add(new CaffeineCache("statisticsCache",
                Caffeine.newBuilder()
                        .maximumSize(100)
                        .expireAfterWrite(2, TimeUnit.MINUTES)
                        .build()));

        // Dashboard cache: 1 min TTL (finance dashboard summary, merchants)
        caches.add(new CaffeineCache("dashboardCache",
                Caffeine.newBuilder()
                        .maximumSize(50)
                        .expireAfterWrite(1, TimeUnit.MINUTES)
                        .build()));

        cacheManager.setCaches(caches);
        return cacheManager;
    }
}
