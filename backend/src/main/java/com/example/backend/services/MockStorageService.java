package com.example.backend.services;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.logging.Logger;

@Service
@Profile("no-storage")
public class MockStorageService {
    
    private static final Logger logger = Logger.getLogger(MockStorageService.class.getName());
    
    public String uploadFile(String bucketName, String fileName, MultipartFile file) {
        logger.info("Mock upload: " + fileName + " to bucket: " + bucketName);
        // Return a placeholder URL
        return "https://via.placeholder.com/150?text=" + fileName;
    }
    
    public InputStream getFile(String bucketName, String fileName) {
        logger.info("Mock download: " + fileName + " from bucket: " + bucketName);
        // Return empty stream
        return new ByteArrayInputStream(new byte[0]);
    }
    
    public void deleteFile(String bucketName, String fileName) {
        logger.info("Mock delete: " + fileName + " from bucket: " + bucketName);
    }
    
    public void ensureBucketExists(String bucketName) {
        logger.info("Mock bucket check: " + bucketName);
    }
} 