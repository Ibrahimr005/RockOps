//package com.example.backend.repositories.finance;
//
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.stereotype.Repository;
//
//import java.util.List;
//import java.util.Optional;
//import java.util.UUID;
//
//@Repository
//public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, UUID> {
//
//    // Find all active payment methods (for dropdown lists)
//    List<PaymentMethod> findByIsActiveTrue();
//
//    // Find payment method by name
//    Optional<PaymentMethod> findByName(String name);
//
//    // Check if payment method name already exists (for validation)
//    boolean existsByName(String name);
//
//    // Custom query to find active payment methods ordered by name
//    @Query("SELECT pm FROM PaymentMethod pm WHERE pm.isActive = true ORDER BY pm.name")
//    List<PaymentMethod> findActivePaymentMethodsOrderedByName();
//}
