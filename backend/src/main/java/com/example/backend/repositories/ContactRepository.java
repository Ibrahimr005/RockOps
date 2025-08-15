package com.example.backend.repositories;

import com.example.backend.models.Contact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactRepository extends JpaRepository<Contact, UUID> {
    
    // Basic search methods
    List<Contact> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);
    
    List<Contact> findByEmailContainingIgnoreCase(String email);
    
    List<Contact> findByPhoneNumberContaining(String phoneNumber);
    
    Optional<Contact> findByEmail(String email);
    
    // Contact type filtering
    List<Contact> findByContactType(Contact.ContactType contactType);
    
    List<Contact> findByContactTypeAndIsActiveTrue(Contact.ContactType contactType);
    
    // Company and department filtering
    List<Contact> findByCompanyContainingIgnoreCase(String company);
    
    List<Contact> findByDepartmentContainingIgnoreCase(String department);
    
    List<Contact> findByPositionContainingIgnoreCase(String position);
    
    // Specialization filtering
    List<Contact> findBySpecializationContainingIgnoreCase(String specialization);
    
    // Active contacts
    List<Contact> findByIsActiveTrue();
    
    List<Contact> findByIsActiveFalse();
    
    // Emergency contacts
    List<Contact> findByEmergencyContactTrue();
    
    List<Contact> findByEmergencyContactTrueAndIsActiveTrue();
    
    // Preferred contact method
    List<Contact> findByPreferredContactMethod(Contact.ContactMethod preferredContactMethod);
    
    // Complex queries
    @Query("SELECT c FROM Contact c WHERE " +
           "(:firstName IS NULL OR c.firstName LIKE %:firstName%) AND " +
           "(:lastName IS NULL OR c.lastName LIKE %:lastName%) AND " +
           "(:contactType IS NULL OR c.contactType = :contactType) AND " +
           "(:company IS NULL OR c.company LIKE %:company%) AND " +
           "(:isActive IS NULL OR c.isActive = :isActive)")
    List<Contact> findContactsWithFilters(
            @Param("firstName") String firstName,
            @Param("lastName") String lastName,
            @Param("contactType") Contact.ContactType contactType,
            @Param("company") String company,
            @Param("isActive") Boolean isActive
    );
    
    // Find contacts by availability
    @Query("SELECT c FROM Contact c WHERE c.isActive = true AND " +
           "SIZE(c.assignedSteps) < 5") // Limit to contacts with less than 5 active assignments
    List<Contact> findAvailableContacts();
    
    // Find contacts by specialization and availability
    @Query("SELECT c FROM Contact c WHERE c.isActive = true AND " +
           "c.specialization LIKE %:specialization% AND " +
           "SIZE(c.assignedSteps) < 3")
    List<Contact> findAvailableContactsBySpecialization(@Param("specialization") String specialization);
    
    // Find contacts by contact type and availability
    @Query("SELECT c FROM Contact c WHERE c.isActive = true AND " +
           "c.contactType = :contactType AND " +
           "SIZE(c.assignedSteps) < 5")
    List<Contact> findAvailableContactsByType(@Param("contactType") Contact.ContactType contactType);
    
    // Statistics queries
    @Query("SELECT c.contactType, COUNT(c) FROM Contact c GROUP BY c.contactType")
    List<Object[]> getContactCountByType();
    
    @Query("SELECT c.company, COUNT(c) FROM Contact c WHERE c.company IS NOT NULL GROUP BY c.company")
    List<Object[]> getContactCountByCompany();
    
    @Query("SELECT c.department, COUNT(c) FROM Contact c WHERE c.department IS NOT NULL GROUP BY c.department")
    List<Object[]> getContactCountByDepartment();
    
    // Find contacts with overdue assignments
    @Query("SELECT DISTINCT c FROM Contact c JOIN c.assignedSteps s " +
           "WHERE s.actualEndDate IS NULL AND s.expectedEndDate < CURRENT_TIMESTAMP")
    List<Contact> findContactsWithOverdueAssignments();
    
    // Find contacts needing follow-up
    @Query("SELECT DISTINCT c FROM Contact c JOIN c.contactLogs cl " +
           "WHERE cl.followUpRequired = true AND cl.followUpDate < CURRENT_TIMESTAMP")
    List<Contact> findContactsNeedingFollowUp();
} 