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

    // Upload file with custom path/name
    public String uploadFile(MultipartFile file, String objectName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file upload skipped");
            return "dummy-" + objectName + "-" + System.currentTimeMillis();
        }
        
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );
        return objectName;
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

    //Equipment Methods

    public void createEquipmentBucket(UUID equipmentId) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping equipment bucket creation");
            return;
        }
        
        String bucketName = "equipment-" + equipmentId.toString();
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            System.out.println("✅ Equipment bucket created: " + bucketName);
        } else {
            System.out.println("✅ Equipment bucket already exists: " + bucketName);
        }

        // Always ensure the bucket has public read policy
        setBucketPublicReadPolicy(bucketName);
    }

    public String uploadEquipmentFile(UUID equipmentId, MultipartFile file, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, equipment file upload skipped");
            return "dummy-equipment-" + equipmentId + "-" + fileName + "-" + System.currentTimeMillis();
        }
        
        String equipmentBucket = "equipment-" + equipmentId.toString();
        // Ensure bucket exists before uploading
        createEquipmentBucket(equipmentId);

        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(equipmentBucket)
                        .object(fileName)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        return fileName;
    }

    public String getEquipmentMainPhoto(UUID equipmentId) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=Equipment+Photo+Disabled";
        }
        
        String equipmentBucket = "equipment-" + equipmentId.toString();

        // List objects in the bucket to find the "main image"
        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder().bucket(equipmentBucket).build()
        );

        for (Result<Item> result : results) {
            Item item = result.get();
            if (item.objectName().contains("Main_Image")) {
                // Return simple public URL like working photos
                return minioPublicUrl + "/" + equipmentBucket + "/" + item.objectName();
            }
        }

        throw new Exception("Main image not found for equipment: " + equipmentId);
    }

    public void deleteEquipmentFile(UUID equipmentId, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, equipment file deletion skipped");
            return;
        }
        
        String equipmentBucket = "equipment-" + equipmentId.toString();

        // List all objects in the bucket
        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder().bucket(equipmentBucket).build()
        );

        String matchingFileName = null;

        // Find the file that contains the given fileName
        for (Result<Item> result : results) {
            String objectName = result.get().objectName();
            if (objectName.contains(fileName)) {
                matchingFileName = objectName;
                break; // Stop searching once we find a match
            }
        }

        if (matchingFileName != null) {
            // Delete the found file
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(equipmentBucket)
                            .object(matchingFileName)
                            .build()
            );
            System.out.println("File " + matchingFileName + " deleted successfully from bucket " + equipmentBucket);
        } else {
            System.out.println("File " + fileName + " not found in bucket " + equipmentBucket);
        }
    }

    public String getEquipmentFileUrl(UUID equipmentId, String documentPath) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=Equipment+File+Disabled";
        }
        
        String equipmentBucket = "equipment-" + equipmentId.toString();
        return minioPublicUrl + "/" + equipmentBucket + "/" + documentPath;
    }

    // GENERIC DOCUMENT METHODS

    /**
     * Upload a file to any bucket
     */
    public void uploadFile(String bucketName, MultipartFile file, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file upload skipped for bucket: " + bucketName);
            return;
        }
        
        // Ensure bucket exists
        createBucketIfNotExists(bucketName);

        // Upload file
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(fileName)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        System.out.println("File uploaded: " + fileName + " to bucket: " + bucketName);
    }

    /**
     * Get a file URL from any bucket
     */
    public String getFileUrl(String bucketName, String fileName) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=File+Storage+Disabled";
        }
        return minioPublicUrl + "/" + bucketName + "/" + fileName;
    }

    /**
     * Delete a file from any bucket
     */
    public void deleteFile(String bucketName, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file deletion skipped for bucket: " + bucketName);
            return;
        }
        
        // First check if the file exists
        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder().bucket(bucketName).build()
        );

        String matchingFileName = null;

        // Find the file that contains the given fileName
        for (Result<Item> result : results) {
            String objectName = result.get().objectName();
            if (objectName.contains(fileName)) {
                matchingFileName = objectName;
                break; // Stop searching once we find a match
            }
        }

        if (matchingFileName != null) {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(matchingFileName)
                            .build()
            );

            System.out.println("File deleted: " + matchingFileName + " from bucket: " + bucketName);
        } else {
            System.out.println("File not found: " + fileName + " in bucket: " + bucketName);
        }
    }

    /**
     * List all files in a bucket
     */
    public Iterable<Result<Item>> listFiles(String bucketName) throws Exception {
        if (!minioEnabled) {
            throw new Exception("MinIO is disabled, cannot list files");
        }
        
        boolean bucketExists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(bucketName).build()
        );

        if (!bucketExists) {
            throw new Exception("Bucket does not exist: " + bucketName);
        }

        return minioClient.listObjects(
                ListObjectsArgs.builder().bucket(bucketName).build()
        );
    }

    /**
     * Create a bucket for any entity type
     */
    public void createEntityBucket(String entityType, UUID entityId) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, skipping entity bucket creation");
            return;
        }
        
        String bucketName = entityType.toLowerCase() + "-" + entityId.toString();
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            System.out.println("✅ Entity bucket created: " + bucketName);
        } else {
            System.out.println("✅ Entity bucket already exists: " + bucketName);
        }

        // Always ensure the bucket has public read policy
        setBucketPublicReadPolicy(bucketName);
    }

    /**
     * Upload a file for any entity
     */
    public String uploadEntityFile(String entityType, UUID entityId, MultipartFile file, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, entity file upload skipped");
            return "dummy-entity-" + entityType + "-" + entityId + "-" + fileName + "-" + System.currentTimeMillis();
        }
        
        String bucketName = entityType.toLowerCase() + "-" + entityId.toString();
        uploadFile(bucketName, file, fileName);
        return fileName;
    }

    /**
     * Get file URL for any entity
     */
    public String getEntityFileUrl(String entityType, UUID entityId, String fileName) throws Exception {
        if (!minioEnabled) {
            return "https://via.placeholder.com/300x200?text=Entity+File+Disabled";
        }
        
        String bucketName = entityType.toLowerCase() + "-" + entityId.toString();
        return minioPublicUrl + "/" + bucketName + "/" + fileName;
    }

    /**
     * Delete a file for any entity
     */
    public void deleteEntityFile(String entityType, UUID entityId, String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, entity file deletion skipped");
            return;
        }
        
        String bucketName = entityType.toLowerCase() + "-" + entityId.toString();
        deleteFile(bucketName, fileName);
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

    // List all files in default bucket
    public Iterable<Result<Item>> listFiles() throws Exception {
        if (!minioEnabled) {
            throw new Exception("MinIO is disabled, cannot list files");
        }
        return minioClient.listObjects(ListObjectsArgs.builder().bucket(bucketName).build());
    }

    // Delete file from default bucket
    public void deleteFile(String fileName) throws Exception {
        if (!minioEnabled) {
            System.out.println("⚠️ MinIO is disabled, file deletion skipped");
            return;
        }
        minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucketName).object(fileName).build());
    }
}
