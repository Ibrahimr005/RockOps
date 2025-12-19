package com.example.backend.repositories.finance.balances;

import com.example.backend.models.finance.balances.CashWithPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CashWithPersonRepository extends JpaRepository<CashWithPerson, UUID> {

    List<CashWithPerson> findByIsActiveTrue();

    List<CashWithPerson> findByIsActiveFalse();

    List<CashWithPerson> findByPersonNameContainingIgnoreCase(String personName);

    List<CashWithPerson> findByPhoneNumber(String phoneNumber);

    List<CashWithPerson> findByEmail(String email);
}