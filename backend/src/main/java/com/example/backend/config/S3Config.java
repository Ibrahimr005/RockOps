package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${storage.type:minio}")
    private String storageType;

    @Bean
    public S3Client s3Client() {
        if ("minio".equalsIgnoreCase(storageType)) {
            // Local development with MinIO
            return S3Client.builder()
                    .region(Region.of(region))
                    .endpointOverride(URI.create("http://localhost:9000"))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create("minioadmin", "minioadmin")
                    ))
                    .forcePathStyle(true)
                    .build();
        } else {
            // Production with AWS S3
            return S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();
        }
    }

    @Bean
    public S3Presigner s3Presigner() {
        if ("minio".equalsIgnoreCase(storageType)) {
            // Local development with MinIO
            return S3Presigner.builder()
                    .region(Region.of(region))
                    .endpointOverride(URI.create("http://localhost:9000"))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create("minioadmin", "minioadmin")
                    ))
                    .build();
        } else {
            // Production with AWS S3
            return S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();
        }
    }
}