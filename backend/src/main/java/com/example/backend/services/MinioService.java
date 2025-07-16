package com.example.backend.services;

import io.minio.*;
import io.minio.http.Method;
import io.minio.messages.Item;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import io.minio.SetBucketPolicyArgs;

@Service
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucketName}")
    private String bucketName;

    @Value("${minio.publicUrl:http://localhost:9000}")
    private String minioPublicUrl;

    @Value("${minio.enabled:true}")
    private boolean minioEnabled;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    // Create bucket if it doesn't exist
    public void createBucket() throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping bucket creation");
            return;
        }
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    public void setBucketPublicReadPolicy(String bucketName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping bucket policy");
            return;
        }
        
        String policy = """
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::%s/*"
                }
            ]
        }
        """.formatted(bucketName);

        try {
            minioClient.setBucketPolicy(
                    SetBucketPolicyArgs.builder()
                            .bucket(bucketName)
                            .config(policy)
                            .build()
            );
            System.out.println("✅ Public read policy set for bucket: " + bucketName);
        } catch (Exception e) {
            System.out.println("⚠️ Could not set bucket policy for " + bucketName + ": " + e.getMessage());
            // Don't throw exception - continue even if policy setting fails
        }
    }

    // Upload file
    public String uploadFile(MultipartFile file) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file upload skipped");
            return "dummy-file-" + System.currentTimeMillis();
        }
        
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(fileName)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );
        return fileName;
    }

    // Download file
    public InputStream downloadFile(String fileName) throws Exception {
        if (!minioEnabled) {
            throw new Exception("MinIO is disabled, cannot download file");
        }
        return minioClient.getObject(GetObjectArgs.builder().bucket(bucketName).object(fileName).build());
    }

    // Get file URL (for access)
    public String getFileUrl(String fileName) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=File+Storage+Disabled";
        }
        return minioPublicUrl + "/" + bucketName + "/" + fileName;
    }

    @PostConstruct
    public void init() {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled via configuration. File storage features will be unavailable.");
            return;
        }
        
        try {
            createBucketIfNotExists(); // Ensure bucket exists on startup
            System.out.println("✅ MinIO initialization completed successfully");
        } catch (Exception e) {
            System.out.println("❌ MinIO initialization failed: " + e.getMessage());
            e.printStackTrace();
            // Don't crash the app - just log the error
            System.out.println("⚠️ Continuing startup without MinIO. File storage will be unavailable.");
        }
    }

    public void createBucketIfNotExists() throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping bucket creation");
            return;
        }
        
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            System.out.println("✅ Bucket created: " + bucketName);
        } else {
            System.out.println("✅ Bucket already exists: " + bucketName);
        }

        // Always ensure the bucket has public read policy
        setBucketPublicReadPolicy(bucketName);
    }

    /**
     * Create a bucket if it does not exist for any bucket name
     */
    public void createBucketIfNotExists(String bucketName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping bucket creation");
            return;
        }
        
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            System.out.println("✅ Bucket created: " + bucketName);
        } else {
            System.out.println("✅ Bucket already exists: " + bucketName);
        }

        // Always ensure the bucket has public read policy
        setBucketPublicReadPolicy(bucketName);
    }

    // Get presigned URL for uploading
    public String getPresignedUploadUrl(String fileName) throws Exception {
        if (!minioEnabled) {
            return "https://httpbin.org/status/200";
        }
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.PUT)
                        .bucket(bucketName)
                        .object(fileName)
                        .expiry(60, TimeUnit.MINUTES)
                        .build()
        );
    }

    // Get presigned URL for downloading
    public String getPresignedDownloadUrl(String fileName) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=File+Storage+Disabled";
        }
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.GET)
                        .bucket(bucketName)
                        .object(fileName)
                        .expiry(60, TimeUnit.MINUTES)
                        .build()
        );
    }

    // List all files in bucket
    public Iterable<Result<Item>> listFiles() throws Exception {
        if (!minioEnabled) {
            throw new Exception("MinIO is disabled, cannot list files");
        }
        return minioClient.listObjects(ListObjectsArgs.builder().bucket(bucketName).build());
    }

    // Delete file
    public void deleteFile(String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file deletion skipped");
            return;
        }
        minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucketName).object(fileName).build());
    }
}
