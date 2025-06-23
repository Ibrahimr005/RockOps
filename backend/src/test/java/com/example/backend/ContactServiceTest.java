package com.example.backend;

import com.example.backend.dtos.ContactDto;
import com.example.backend.models.Contact;
import com.example.backend.services.ContactService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ContactServiceTest {

    @Autowired
    private ContactService contactService;

    @Test
    public void testCreateContactWithUUID() {
        // Create a contact DTO
        ContactDto contactDto = ContactDto.builder()
                .firstName("Test")
                .lastName("User")
                .email("test.user@example.com")
                .phoneNumber("01234567890")
                .contactType(Contact.ContactType.TECHNICIAN)
                .isActive(true)
                .build();

        // Create the contact
        ContactDto createdContact = contactService.createContact(contactDto);

        // Verify the contact was created with a UUID
        assertNotNull(createdContact.getId());
        assertTrue(createdContact.getId() instanceof UUID);
        assertEquals("Test", createdContact.getFirstName());
        assertEquals("User", createdContact.getLastName());
        assertEquals("test.user@example.com", createdContact.getEmail());
        assertEquals("01234567890", createdContact.getPhoneNumber());
        assertEquals(Contact.ContactType.TECHNICIAN, createdContact.getContactType());
        assertTrue(createdContact.getIsActive());

        // Test retrieving the contact by UUID
        ContactDto retrievedContact = contactService.getContact(createdContact.getId());
        assertNotNull(retrievedContact);
        assertEquals(createdContact.getId(), retrievedContact.getId());
        assertEquals("Test", retrievedContact.getFirstName());
    }

    @Test
    public void testPhoneNumberWithoutRegexValidation() {
        // Test with Egyptian phone number format
        ContactDto contactDto = ContactDto.builder()
                .firstName("Ahmed")
                .lastName("Mohamed")
                .email("ahmed.mohamed@example.com")
                .phoneNumber("01234567890") // Egyptian format without +20
                .alternatePhone("+201234567890") // Egyptian format with +20
                .contactType(Contact.ContactType.TECHNICIAN)
                .isActive(true)
                .build();

        // This should not throw validation errors
        ContactDto createdContact = contactService.createContact(contactDto);

        assertNotNull(createdContact.getId());
        assertEquals("01234567890", createdContact.getPhoneNumber());
        assertEquals("+201234567890", createdContact.getAlternatePhone());
    }
} 