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
public class S3Service {

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

    public S3Service() {
        this.s3Client = S3Client.builder()
                .region(Region.US_EAST_1)  // You can make this configurable
                .build();
        this.s3Presigner = S3Presigner.builder()
                .region(Region.US_EAST_1)
                .build();
    }

    // Drop-in replacement methods for MinioService

    public void createBucketIfNotExists(String bucketName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, skipping bucket creation");
            return;
        }

        try {
            HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                    .bucket(bucketName)
                    .build();
            s3Client.headBucket(headBucketRequest);
        } catch (NoSuchBucketException e) {
            // Bucket doesn't exist, create it
            CreateBucketRequest createBucketRequest = CreateBucketRequest.builder()
                    .bucket(bucketName)
                    .build();
            s3Client.createBucket(createBucketRequest);
            System.out.println("✅ S3 bucket created: " + bucketName);
        } catch (Exception e) {
            System.err.println("Error checking/creating S3 bucket: " + e.getMessage());
        }
    }

    public void setBucketPublicReadPolicy(String bucketName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, skipping bucket policy");
            return;
        }

        try {
            String policyJson = """
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
                """.formatted(bucketName);

            PutBucketPolicyRequest policyRequest = PutBucketPolicyRequest.builder()
                    .bucket(bucketName)
                    .policy(policyJson)
                    .build();
            s3Client.putBucketPolicy(policyRequest);
        } catch (Exception e) {
            System.err.println("Error setting S3 bucket policy: " + e.getMessage());
        }
    }

    public String uploadFile(MultipartFile file) throws Exception {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, file upload skipped");
            return "disabled";
        }

        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        return uploadFile(bucketName, file, fileName);
    }

    public String uploadFile(String bucketName, MultipartFile file, String fileName) throws Exception {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, file upload skipped");
            return "disabled";
        }

        try {
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

    public InputStream downloadFile(String fileName) throws Exception {
        if (!s3Enabled) {
            throw new Exception("S3 is disabled, cannot download file");
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();
        return s3Client.getObject(getObjectRequest);
    }

    public String getFileUrl(String fileName) {
        if (!s3Enabled) {
            return "disabled";
        }

        if (!s3PublicUrl.isEmpty()) {
            return s3PublicUrl + "/" + bucketName + "/" + fileName;
        }
        // Default S3 URL format
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    }

    public String getFileUrl(String bucketName, String fileName) {
        if (!s3Enabled) {
            return "disabled";
        }

        if (!s3PublicUrl.isEmpty()) {
            return s3PublicUrl + "/" + bucketName + "/" + fileName;
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    }

    public void initializeService() {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled via configuration. File storage features will be unavailable.");
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
    public void createEquipmentBucket(Long equipmentId) {
        String equipmentBucket = "equipment-" + equipmentId;
        createBucketIfNotExists(equipmentBucket);
    }

    public String uploadEquipmentFile(Long equipmentId, MultipartFile file, String customFileName) throws Exception {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, equipment file upload skipped");
            return "disabled";
        }

        String equipmentBucket = "equipment-" + equipmentId;
        String fileName = customFileName.isEmpty() ?
                UUID.randomUUID().toString() + "_" + file.getOriginalFilename() :
                customFileName + "_" + file.getOriginalFilename();

        return uploadFile(equipmentBucket, file, fileName);
    }

    public String getEquipmentMainPhoto(Long equipmentId) {
        if (!s3Enabled) {
            return null;
        }

        String equipmentBucket = "equipment-" + equipmentId;
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

    public void deleteEquipmentFile(Long equipmentId, String fileName) throws Exception {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, equipment file deletion skipped");
            return;
        }

        String equipmentBucket = "equipment-" + equipmentId;

        try {
            // List all objects with the filename prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(equipmentBucket)
                    .prefix(fileName)
                    .build();

            ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);

            // Delete matching files
            for (S3Object s3Object : response.contents()) {
                if (s3Object.key().contains(fileName)) {
                    DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                            .bucket(equipmentBucket)
                            .key(s3Object.key())
                            .build();
                    s3Client.deleteObject(deleteRequest);
                    System.out.println("Deleted: " + s3Object.key());
                }
            }
        } catch (Exception e) {
            throw new Exception("Error deleting equipment file from S3: " + e.getMessage());
        }
    }

    public String getEquipmentFileUrl(Long equipmentId, String documentPath) {
        if (!s3Enabled) {
            return null;
        }

        String equipmentBucket = "equipment-" + equipmentId;
        return getFileUrl(equipmentBucket, documentPath);
    }

    // Entity file methods (for generic file storage)
    public void uploadEntityFile(String entityType, Long entityId, MultipartFile file, String fileName) throws Exception {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, entity file upload skipped");
            return;
        }

        String bucketName = entityType + "-" + entityId;
        createBucketIfNotExists(bucketName);
        uploadFile(bucketName, file, fileName);
    }

    public String getEntityFileUrl(String entityType, Long entityId, String fileName) {
        if (!s3Enabled) {
            return null;
        }

        String bucketName = entityType + "-" + entityId;
        return getFileUrl(bucketName, fileName);
    }

    public void deleteEntityFile(String entityType, Long entityId, String fileName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, entity file deletion skipped");
            return;
        }

        String bucketName = entityType + "-" + entityId;
        deleteFile(bucketName, fileName);
    }

    // Presigned URL methods
    public String getPresignedDownloadUrl(String fileName, int expirationMinutes) throws Exception {
        if (!s3Enabled) {
            return null;
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

    public String getPresignedDownloadUrl(String bucketName, String fileName, int expirationMinutes) throws Exception {
        if (!s3Enabled) {
            return null;
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
    public List<S3Object> listFiles(String bucketName) throws Exception {
        if (!s3Enabled) {
            throw new Exception("S3 is disabled, cannot list files");
        }

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .build();

        ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);
        return response.contents();
    }

    public void deleteFile(String fileName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, file deletion skipped");
            return;
        }

        deleteFile(bucketName, fileName);
    }

    public void deleteFile(String bucketName, String fileName) {
        if (!s3Enabled) {
            System.out.println("⚠️ S3 is disabled, file deletion skipped");
            return;
        }

        try {
            // Handle both exact filename and filename with extensions
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