package com.example.backend.config;

import com.example.backend.services.FileStorageService;
import com.example.backend.services.MinioService;
import com.example.backend.services.impl.S3ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class StorageConfiguration {

    @Value("${storage.type:minio}")
    private String storageType;

    @Value("${aws.s3.enabled:true}")  // Read the same property as MinioService
    private boolean s3Enabled;

    @Autowired(required = false)
    private S3Client s3Client;

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    @Bean
    @Primary
    public FileStorageService fileStorageService() {
        System.out.println("🔧 Configuring storage type: " + storageType);
        System.out.println("🔧 S3 enabled: " + s3Enabled);

        if ("s3".equalsIgnoreCase(storageType)) {
            System.out.println("📦 Using AWS S3 for file storage");
            return new S3ServiceImpl(s3Client, s3Presigner);
        } else if (s3Enabled) {
            System.out.println("📦 Using MinioService with S3 enabled for local MinIO");
            return new MinioService(s3Client, s3Presigner);
        } else {
            System.out.println("📦 Using MinioService with S3 disabled (mock mode)");
            return new MinioService(null, null);
        }
    }
}