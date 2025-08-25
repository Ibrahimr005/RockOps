//package com.example.backend.services.impl;
//
//import com.example.backend.services.FileStorageService;
//import io.minio.*;
//import io.minio.http.Method;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
//import org.springframework.stereotype.Service;
//import org.springframework.web.multipart.MultipartFile;
//import software.amazon.awssdk.services.s3.model.S3Object;
//
//import java.io.InputStream;
//import java.util.*;
//import java.util.concurrent.TimeUnit;
//
//@Service
//@ConditionalOnProperty(name = "storage.type", havingValue = "minio", matchIfMissing = true)
//public class MinioServiceImpl implements FileStorageService {
//
//    private final MinioClient minioClient;
//
//    @Value("${minio.bucket-name:rockops}")
//    private String bucketName;
//
//    @Value("${minio.public-url:http://localhost:9000}")
//    private String minioPublicUrl;
//
//    public MinioServiceImpl(
//            @Value("${minio.endpoint:http://localhost:9000}") String endpoint,
//            @Value("${minio.access-key:minioadmin}") String accessKey,
//            @Value("${minio.secret-key:minioadmin}") String secretKey) {
//
//        this.minioClient = MinioClient.builder()
//                .endpoint(endpoint)
//                .credentials(accessKey, secretKey)
//                .build();
//    }
//
//    @Override
//    public void createBucketIfNotExists(String bucketName) {
//        try {
//            boolean bucketExists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
//            if (!bucketExists) {
//                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
//                System.out.println("✅ MinIO bucket created: " + bucketName);
//            } else {
//                System.out.println("✅ MinIO bucket exists: " + bucketName);
//            }
//        } catch (Exception e) {
//            System.err.println("Error checking/creating MinIO bucket: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public void setBucketPublicReadPolicy(String bucketName) {
//        try {
//            String policy = String.format("""
//                {
//                    "Version": "2012-10-17",
//                    "Statement": [
//                        {
//                            "Effect": "Allow",
//                            "Principal": {"AWS": "*"},
//                            "Action": "s3:GetObject",
//                            "Resource": "arn:aws:s3:::%s/*"
//                        }
//                    ]
//                }
//                """, bucketName);
//
//            minioClient.setBucketPolicy(
//                    SetBucketPolicyArgs.builder()
//                            .bucket(bucketName)
//                            .config(policy)
//                            .build()
//            );
//            System.out.println("✅ MinIO bucket policy set for: " + bucketName);
//        } catch (Exception e) {
//            System.err.println("Error setting MinIO bucket policy: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public String uploadFile(MultipartFile file) throws Exception {
//        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
//        return uploadFile(bucketName, file, fileName);
//    }
//
//    @Override
//    public String uploadFile(String bucketName, MultipartFile file, String fileName) throws Exception {
//        try {
//            createBucketIfNotExists(bucketName);
//
//            minioClient.putObject(
//                    PutObjectArgs.builder()
//                            .bucket(bucketName)
//                            .object(fileName)
//                            .stream(file.getInputStream(), file.getSize(), -1)
//                            .contentType(file.getContentType())
//                            .build()
//            );
//            System.out.println("✅ File uploaded to MinIO: " + fileName);
//            return fileName;
//        } catch (Exception e) {
//            throw new Exception("Error uploading file to MinIO: " + e.getMessage());
//        }
//    }
//
//    @Override
//    public void uploadFile(MultipartFile file, String fileName) throws Exception {
//        uploadFile(bucketName, file, fileName);
//    }
//
//    @Override
//    public InputStream downloadFile(String fileName) throws Exception {
//        return minioClient.getObject(
//                GetObjectArgs.builder()
//                        .bucket(bucketName)
//                        .object(fileName)
//                        .build()
//        );
//    }
//
//    @Override
//    public String getFileUrl(String fileName) {
//        return minioPublicUrl + "/" + bucketName + "/" + fileName;
//    }
//
//    @Override
//    public String getFileUrl(String bucketName, String fileName) {
//        return minioPublicUrl + "/" + bucketName + "/" + fileName;
//    }
//
//    @Override
//    public void initializeService() {
//        try {
//            createBucketIfNotExists(bucketName);
//            System.out.println("✅ MinIO initialization completed successfully");
//        } catch (Exception e) {
//            System.out.println("❌ MinIO initialization failed: " + e.getMessage());
//            e.printStackTrace();
//        }
//    }
//
//    // Equipment-specific methods
//    @Override
//    public void createEquipmentBucket(UUID equipmentId) {
//        String equipmentBucket = "equipment-" + equipmentId.toString();
//        createBucketIfNotExists(equipmentBucket);
//    }
//
//    @Override
//    public String uploadEquipmentFile(UUID equipmentId, MultipartFile file, String customFileName) throws Exception {
//        String equipmentBucket = "equipment-" + equipmentId.toString();
//        String fileName = customFileName.isEmpty() ?
//                UUID.randomUUID().toString() + "_" + file.getOriginalFilename() :
//                customFileName + "_" + file.getOriginalFilename();
//
//        return uploadFile(equipmentBucket, file, fileName);
//    }
//
//    @Override
//    public String getEquipmentMainPhoto(UUID equipmentId) {
//        String equipmentBucket = "equipment-" + equipmentId.toString();
//        try {
//            // MinIO doesn't have the same list API as S3, so we'll use a different approach
//            Iterable<Result<Item>> results = minioClient.listObjects(
//                    ListObjectsArgs.builder()
//                            .bucket(equipmentBucket)
//                            .prefix("Main_Image")
//                            .build()
//            );
//
//            for (Result<Item> result : results) {
//                Item item = result.get();
//                return getFileUrl(equipmentBucket, item.objectName());
//            }
//        } catch (Exception e) {
//            System.err.println("Error getting equipment main photo: " + e.getMessage());
//        }
//        return null;
//    }
//
//    @Override
//    public void deleteEquipmentFile(UUID equipmentId, String fileName) throws Exception {
//        String equipmentBucket = "equipment-" + equipmentId.toString();
//        deleteFile(equipmentBucket, fileName);
//    }
//
//    @Override
//    public String getEquipmentFileUrl(UUID equipmentId, String documentPath) {
//        String equipmentBucket = "equipment-" + equipmentId.toString();
//        return getFileUrl(equipmentBucket, documentPath);
//    }
//
//    // Entity file methods
//    @Override
//    public void uploadEntityFile(String entityType, UUID entityId, MultipartFile file, String fileName) throws Exception {
//        String bucketName = entityType + "-" + entityId.toString();
//        createBucketIfNotExists(bucketName);
//        uploadFile(bucketName, file, fileName);
//    }
//
//    @Override
//    public String getEntityFileUrl(String entityType, UUID entityId, String fileName) {
//        String bucketName = entityType + "-" + entityId.toString();
//        return getFileUrl(bucketName, fileName);
//    }
//
//    @Override
//    public void deleteEntityFile(String entityType, UUID entityId, String fileName) {
//        String bucketName = entityType + "-" + entityId.toString();
//        deleteFile(bucketName, fileName);
//    }
//
//    // Presigned URL methods
//    @Override
//    public String getPresignedDownloadUrl(String fileName, int expirationMinutes) throws Exception {
//        return minioClient.getPresignedObjectUrl(
//                GetPresignedObjectUrlArgs.builder()
//                        .method(Method.GET)
//                        .bucket(bucketName)
//                        .object(fileName)
//                        .expiry(expirationMinutes, TimeUnit.MINUTES)
//                        .build()
//        );
//    }
//
//    @Override
//    public String getPresignedDownloadUrl(String bucketName, String fileName, int expirationMinutes) throws Exception {
//        return minioClient.getPresignedObjectUrl(
//                GetPresignedObjectUrlArgs.builder()
//                        .method(Method.GET)
//                        .bucket(bucketName)
//                        .object(fileName)
//                        .expiry(expirationMinutes, TimeUnit.MINUTES)
//                        .build()
//        );
//    }
//
//    // List and delete methods - Note: These return empty lists for MinIO compatibility
//    @Override
//    public List<S3Object> listFiles(String bucketName) throws Exception {
//        // MinIO uses different objects, so we return empty for now
//        // You could implement proper conversion if needed
//        return new ArrayList<>();
//    }
//
//    @Override
//    public void deleteFile(String fileName) {
//        deleteFile(bucketName, fileName);
//    }
//
//    @Override
//    public void deleteFile(String bucketName, String fileName) {
//        try {
//            // List objects with prefix to handle partial filename matches
//            Iterable<Result<Item>> results = minioClient.listObjects(
//                    ListObjectsArgs.builder()
//                            .bucket(bucketName)
//                            .prefix(fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName)
//                            .build()
//            );
//
//            for (Result<Item> result : results) {
//                Item item = result.get();
//                if (item.objectName().equals(fileName) || item.objectName().contains(fileName)) {
//                    minioClient.removeObject(
//                            RemoveObjectArgs.builder()
//                                    .bucket(bucketName)
//                                    .object(item.objectName())
//                                    .build()
//                    );
//                    System.out.println("Deleted from MinIO: " + item.objectName());
//                }
//            }
//        } catch (Exception e) {
//            System.err.println("Error deleting file from MinIO: " + e.getMessage());
//        }
//    }
//}