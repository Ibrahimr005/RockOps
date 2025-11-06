package com.example.backend.repositories;

import com.example.backend.models.ContactType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactTypeRepository extends JpaRepository<ContactType, UUID> {
    
    List<ContactType> findByIsActiveTrue();
    
    Optional<ContactType> findByNameIgnoreCase(String name);
    
    boolean existsByNameIgnoreCase(String name);
    
    List<ContactType> findAllByOrderByNameAsc();
    
    List<ContactType> findByIsActiveTrueOrderByNameAsc();
}





