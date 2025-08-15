package com.example.backend.services;

import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

public interface FileStorageService {

    // Basic file operations
    String uploadFile(MultipartFile file) throws Exception;
    String uploadFile(String bucketName, MultipartFile file, String fileName) throws Exception;
    void uploadFile(MultipartFile file, String fileName) throws Exception;
    InputStream downloadFile(String fileName) throws Exception;
    String getFileUrl(String fileName);
    String getFileUrl(String bucketName, String fileName);
    void deleteFile(String fileName);
    void deleteFile(String bucketName, String fileName);
    List<S3Object> listFiles(String bucketName) throws Exception;

    // Bucket operations
    void createBucketIfNotExists(String bucketName);
    void setBucketPublicReadPolicy(String bucketName);
    void initializeService();

    // Equipment-specific methods
    void createEquipmentBucket(UUID equipmentId);
    String uploadEquipmentFile(UUID equipmentId, MultipartFile file, String customFileName) throws Exception;
    String getEquipmentMainPhoto(UUID equipmentId);
    void deleteEquipmentFile(UUID equipmentId, String fileName) throws Exception;
    String getEquipmentFileUrl(UUID equipmentId, String documentPath);

    // Entity file methods (for generic file storage)
    void uploadEntityFile(String entityType, UUID entityId, MultipartFile file, String fileName) throws Exception;
    String getEntityFileUrl(String entityType, UUID entityId, String fileName);
    void deleteEntityFile(String entityType, UUID entityId, String fileName);

    // Presigned URL methods
    String getPresignedDownloadUrl(String fileName, int expirationMinutes) throws Exception;
    String getPresignedDownloadUrl(String bucketName, String fileName, int expirationMinutes) throws Exception;
}