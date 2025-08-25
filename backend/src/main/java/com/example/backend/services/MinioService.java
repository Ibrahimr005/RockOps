package com.example.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.InputStream;
import java.time.Duration;
import java.util.*;

@Service
public class MinioService implements FileStorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name:rockops}")
    private String bucketName;

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${aws.s3.public-url:}")
    private String s3PublicUrl;

    @Value("${aws.s3.enabled:true}")
    private boolean s3Enabled;

    public MinioService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;

        // Force enable S3 for local MinIO development
        if (s3Client != null) {
            this.s3Enabled = true;  // Override the @Value annotation
            System.out.println("🔧 MinioService initialized with S3 enabled: " + s3Enabled + " (forced to true because S3Client exists)");
        } else {
            System.out.println("🔧 MinioService initialized with S3 enabled: " + s3Enabled + " (S3Client is null)");
        }
    }

    @Override
    public void createBucketIfNotExists(String bucketName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, skipping bucket creation for local development");
            return;
        }

        if (s3Client == null) {
            System.out.println("⚠️ S3Client is null, skipping bucket creation for local development");
            return;
        }

        try {
            HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                    .bucket(bucketName)
                    .build();
            s3Client.headBucket(headBucketRequest);
        } catch (NoSuchBucketException e) {
            CreateBucketRequest createBucketRequest = CreateBucketRequest.builder()
                    .bucket(bucketName)
                    .build();
            s3Client.createBucket(createBucketRequest);
            System.out.println("✅ S3 bucket created: " + bucketName);
        } catch (Exception e) {
            System.err.println("Error checking/creating S3 bucket: " + e.getMessage());
        }
    }

    @Override
    public void setBucketPublicReadPolicy(String bucketName) {
        if (!s3Enabled || s3Client == null) {
            System.out.println("⚠️ S3 is disabled, skipping bucket policy for local development");
            return;
        }

        try {
            String policyJson = String.format("""
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": "arn:aws:s3:::%s/*"
                        }
                    ]
                }
                """, bucketName);

            PutBucketPolicyRequest policyRequest = PutBucketPolicyRequest.builder()
                    .bucket(bucketName)
                    .policy(policyJson)
                    .build();
            s3Client.putBucketPolicy(policyRequest);
        } catch (Exception e) {
            System.err.println("Error setting S3 bucket policy: " + e.getMessage());
        }
    }

    @Override
    public String uploadFile(MultipartFile file) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating file upload");
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            System.out.println("✅ Simulated file upload: " + fileName);
            return fileName;
        }

        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        return uploadFile(bucketName, file, fileName);
    }

    @Override
    public String uploadFile(String bucketName, MultipartFile file, String fileName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating file upload: " + fileName);
            return fileName;
        }

        try {
            createBucketIfNotExists(bucketName);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return fileName;
        } catch (Exception e) {
            throw new Exception("Error uploading file to S3: " + e.getMessage());
        }
    }

    @Override
    public void uploadFile(MultipartFile file, String fileName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating file upload: " + fileName);
            return;
        }
        uploadFile(bucketName, file, fileName);
    }

    @Override
    public InputStream downloadFile(String fileName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            throw new Exception("S3 is disabled for local development, cannot download file");
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();
        return s3Client.getObject(getObjectRequest);
    }

    @Override
    public String getFileUrl(String fileName) {
        if (!s3Enabled || s3Client == null) {
            String url = "http://localhost:9000/local-dev/" + fileName;
            System.out.println("✅ Generated mock file URL: " + url);
            return url;
        }

        if (!s3PublicUrl.isEmpty()) {
            return s3PublicUrl + "/" + bucketName + "/" + fileName;
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    }

    @Override
    public String getFileUrl(String bucketName, String fileName) {
        if (!s3Enabled || s3Client == null) {
            String url = "http://localhost:9000/local-dev/" + bucketName + "/" + fileName;
            System.out.println("✅ Generated mock file URL: " + url);
            return url;
        }

        if (!s3PublicUrl.isEmpty()) {
            return s3PublicUrl + "/" + bucketName + "/" + fileName;
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    }

    @Override
    public void initializeService() {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development. Using mock file storage.");
            return;
        }

        try {
            createBucketIfNotExists(bucketName);
            System.out.println("✅ S3 initialization completed successfully");
        } catch (Exception e) {
            System.out.println("❌ S3 initialization failed: " + e.getMessage());
            e.printStackTrace();
            System.out.println("⚠️ Continuing startup without S3. File storage will be unavailable.");
        }
    }

    // Equipment-specific methods
    @Override
    public void createEquipmentBucket(UUID equipmentId) {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, skipping equipment bucket creation");
            return;
        }
        String equipmentBucket = "equipment-" + equipmentId.toString();
        createBucketIfNotExists(equipmentBucket);
    }

    @Override
    public String uploadEquipmentFile(UUID equipmentId, MultipartFile file, String customFileName) throws Exception {
        String fileName = customFileName.isEmpty() ?
                UUID.randomUUID().toString() + "_" + file.getOriginalFilename() :
                customFileName + "_" + file.getOriginalFilename();

        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating equipment file upload: " + fileName);
            return fileName;
        }

        String equipmentBucket = "equipment-" + equipmentId.toString();
        return uploadFile(equipmentBucket, file, fileName);
    }

    @Override
    public String getEquipmentMainPhoto(UUID equipmentId) {
        if (!s3Enabled || s3Client == null) {
            String url = "http://localhost:9000/local-dev/equipment-" + equipmentId + "/main-image.jpg";
            System.out.println("✅ Generated mock equipment photo URL: " + url);
            return url;
        }

        String equipmentBucket = "equipment-" + equipmentId.toString();
        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(equipmentBucket)
                    .prefix("Main_Image")
                    .build();

            ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);

            if (!response.contents().isEmpty()) {
                String objectKey = response.contents().get(0).key();
                return getFileUrl(equipmentBucket, objectKey);
            }
        } catch (Exception e) {
            System.err.println("Error getting equipment main photo: " + e.getMessage());
        }
        return null;
    }

    @Override
    public void deleteEquipmentFile(UUID equipmentId, String fileName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating equipment file deletion: " + fileName);
            return;
        }

        String equipmentBucket = "equipment-" + equipmentId.toString();
        deleteFile(equipmentBucket, fileName);
    }

    @Override
    public String getEquipmentFileUrl(UUID equipmentId, String documentPath) {
        if (!s3Enabled || s3Client == null) {
            String url = "http://localhost:9000/local-dev/equipment-" + equipmentId + "/" + documentPath;
            System.out.println("✅ Generated mock equipment file URL: " + url);
            return url;
        }

        String equipmentBucket = "equipment-" + equipmentId.toString();
        return getFileUrl(equipmentBucket, documentPath);
    }

    // Entity file methods
    @Override
    public void uploadEntityFile(String entityType, UUID entityId, MultipartFile file, String fileName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating entity file upload: " + fileName);
            return;
        }

        String bucketName = entityType + "-" + entityId.toString();
        createBucketIfNotExists(bucketName);
        uploadFile(bucketName, file, fileName);
    }

    @Override
    public String getEntityFileUrl(String entityType, UUID entityId, String fileName) {
        if (!s3Enabled || s3Client == null) {
            String url = "http://localhost:9000/local-dev/" + entityType + "-" + entityId + "/" + fileName;
            System.out.println("✅ Generated mock entity file URL: " + url);
            return url;
        }

        String bucketName = entityType + "-" + entityId.toString();
        return getFileUrl(bucketName, fileName);
    }

    @Override
    public void deleteEntityFile(String entityType, UUID entityId, String fileName) {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating entity file deletion: " + fileName);
            return;
        }

        String bucketName = entityType + "-" + entityId.toString();
        deleteFile(bucketName, fileName);
    }

    // Presigned URL methods
    @Override
    public String getPresignedDownloadUrl(String fileName, int expirationMinutes) throws Exception {
        if (!s3Enabled || s3Client == null || s3Presigner == null) {
            String url = "http://localhost:9000/local-dev/presigned/" + fileName;
            System.out.println("✅ Generated mock presigned URL: " + url);
            return url;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    @Override
    public String getPresignedDownloadUrl(String bucketName, String fileName, int expirationMinutes) throws Exception {
        if (!s3Enabled || s3Client == null || s3Presigner == null) {
            String url = "http://localhost:9000/local-dev/presigned/" + bucketName + "/" + fileName;
            System.out.println("✅ Generated mock presigned URL: " + url);
            return url;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    // List and delete methods
    @Override
    public List<S3Object> listFiles(String bucketName) throws Exception {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, returning empty file list");
            return new ArrayList<>();
        }

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .build();

        ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);
        return response.contents();
    }

    @Override
    public void deleteFile(String fileName) {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating file deletion: " + fileName);
            return;
        }

        deleteFile(bucketName, fileName);
    }

    @Override
    public void deleteFile(String bucketName, String fileName) {
        if (!s3Enabled || s3Client == null) {
            System.out.println("✅ S3 is disabled for local development, simulating file deletion: " + bucketName + "/" + fileName);
            return;
        }

        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName)
                    .build();

            ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);

            for (S3Object s3Object : response.contents()) {
                if (s3Object.key().equals(fileName) || s3Object.key().contains(fileName)) {
                    DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Object.key())
                            .build();
                    s3Client.deleteObject(deleteRequest);
                    System.out.println("Deleted from S3: " + s3Object.key());
                }
            }
        } catch (Exception e) {
            System.err.println("Error deleting file from S3: " + e.getMessage());
        }
    }
}