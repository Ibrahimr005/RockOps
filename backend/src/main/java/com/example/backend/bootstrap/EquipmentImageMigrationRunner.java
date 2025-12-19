package com.example.backend.bootstrap;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.services.MinioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EquipmentImageMigrationRunner implements ApplicationRunner {

    private final EquipmentRepository equipmentRepository;
    private final MinioService minioService;
    
    @Value("${app.migration.equipment-images.enabled:true}")
    private boolean migrationEnabled;

    @Autowired
    public EquipmentImageMigrationRunner(EquipmentRepository equipmentRepository, MinioService minioService) {
        this.equipmentRepository = equipmentRepository;
        this.minioService = minioService;
    }

    @Override
    @Async // Run in background to not block startup
    public void run(ApplicationArguments args) throws Exception {
        if (!migrationEnabled) {
            System.out.println("⚠️ Equipment Image Migration is disabled via property.");
            return;
        }

        System.out.println("🚀 Starting Equipment Image Migration Service...");

        // 1. Find all equipment without a storage key
        List<Equipment> equipmentToMigrate = equipmentRepository.findByImageStorageKeyIsNull();

        if (equipmentToMigrate.isEmpty()) {
            System.out.println("✅ No equipment needs image migration. All good!");
            return;
        }

        System.out.println("📊 Found " + equipmentToMigrate.size() + " equipment entries requiring image migration.");

        int successCount = 0;
        int failCount = 0;
        int noImageCount = 0;

        for (Equipment equipment : equipmentToMigrate) {
            try {
                // This method in MinioService handles checking both new and old buckets,
                // COPYING if necessary, and returning the final valid key for the MAIN bucket.
                String resolvedKey = minioService.findAndMigrateEquipmentImage(equipment.getId());

                if (resolvedKey != null) {
                    equipment.setImageStorageKey(resolvedKey);
                    equipmentRepository.save(equipment);
                    successCount++;
                    // Basic rate limiting to avoid slamming S3 from a burst
                    Thread.sleep(100); 
                } else {
                    noImageCount++;
                    // Optionally set to empty string or flag to stop retrying?
                    // For now, leaving null means we'll retry next startup, which is safe.
                }

            } catch (Exception e) {
                System.err.println("❌ Failed to migrate image for equipment " + equipment.getId() + ": " + e.getMessage());
                failCount++;
            }
        }

        System.out.println("🏁 Equipment Image Migration Completed.");
        System.out.println("✅ Success: " + successCount);
        System.out.println("⚠️ No Image Found: " + noImageCount);
        System.out.println("❌ Failed: " + failCount);
    }
}
