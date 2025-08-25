package com.example.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.UUID;

@Service
@Profile("db-storage") // Activate with SPRING_PROFILES_ACTIVE=prod,db-storage
public class DatabaseFileStorageService {

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Transactional
    public String uploadFile(String bucketName, String fileName, MultipartFile file) throws IOException {
        String fileId = UUID.randomUUID().toString();
        String fullFileName = fileId + "_" + fileName;
        
        FileEntity fileEntity = new FileEntity();
        fileEntity.setId(fileId);
        fileEntity.setBucketName(bucketName);
        fileEntity.setFileName(fullFileName);
        fileEntity.setContentType(file.getContentType());
        fileEntity.setSize(file.getSize());
        fileEntity.setData(file.getBytes());
        
        entityManager.persist(fileEntity);
        
        // Return public URL
        return baseUrl + "/api/v1/files/" + fileId;
    }

    @Transactional(readOnly = true)
    public InputStream getFile(String bucketName, String fileName) {
        String query = "SELECT f FROM FileEntity f WHERE f.bucketName = :bucket AND f.fileName = :fileName";
        FileEntity file = entityManager.createQuery(query, FileEntity.class)
                .setParameter("bucket", bucketName)
                .setParameter("fileName", fileName)
                .getSingleResult();
        
        return new ByteArrayInputStream(file.getData());
    }

    @Transactional(readOnly = true)
    public FileEntity getFileById(String fileId) {
        return entityManager.find(FileEntity.class, fileId);
    }

    @Transactional
    public void deleteFile(String bucketName, String fileName) {
        String query = "DELETE FROM FileEntity f WHERE f.bucketName = :bucket AND f.fileName = :fileName";
        entityManager.createQuery(query)
                .setParameter("bucket", bucketName)
                .setParameter("fileName", fileName)
                .executeUpdate();
    }

    public void ensureBucketExists(String bucketName) {
        // No-op for database storage
    }
}

@Entity
@Table(name = "stored_files")
class FileEntity {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String bucketName;
    
    @Column(nullable = false)
    private String fileName;
    
    @Column(nullable = false)
    private String contentType;
    
    @Column(nullable = false)
    private Long size;
    
    @Lob
    @Column(nullable = false, columnDefinition = "BYTEA")
    private byte[] data;
    
    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private java.util.Date uploadedAt = new java.util.Date();

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getBucketName() { return bucketName; }
    public void setBucketName(String bucketName) { this.bucketName = bucketName; }
    
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
    
    public java.util.Date getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(java.util.Date uploadedAt) { this.uploadedAt = uploadedAt; }
} 