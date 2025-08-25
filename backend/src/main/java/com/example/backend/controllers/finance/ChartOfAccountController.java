//package com.example.backend.controllers.finance;
//
//
//
//import com.example.backend.dto.finance.ChartOfAccountDTO;
//import com.example.backend.models.finance.AccountType;
//import com.example.backend.services.finance.ChartOfAccountService;
////import com.example.backend.util.SecurityUtils;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.Arrays;
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//import java.util.stream.Collectors;
//
//@RestController
//@RequestMapping("/api/accounts")
//public class ChartOfAccountController {
//
//    @Autowired
//    private ChartOfAccountService accountService;
//
//    @GetMapping
//    public ResponseEntity<List<ChartOfAccountDTO>> getAllAccounts(
//            @RequestParam(required = false) Boolean activeOnly) {
//        if (Boolean.TRUE.equals(activeOnly)) {
//            return ResponseEntity.ok(accountService.getActiveAccounts());
//        }
//        return ResponseEntity.ok(accountService.getAllAccounts());
//    }
//
//    @GetMapping("/{id}")
//    public ResponseEntity<ChartOfAccountDTO> getAccountById(@PathVariable UUID id) {
//        return ResponseEntity.ok(accountService.getAccountById(id));
//    }
//
//    @GetMapping("/types")
//    public ResponseEntity<List<Map<String, String>>> getAccountTypes() {
//        List<Map<String, String>> types = Arrays.stream(AccountType.values())
//                .map(type -> Map.of(
//                        "code", type.name(),
//                        "name", type.getDisplayName()
//                ))
//                .collect(Collectors.toList());
//        return ResponseEntity.ok(types);
//    }
//
//    @GetMapping("/by-type/{type}")
//    public ResponseEntity<List<ChartOfAccountDTO>> getAccountsByType(@PathVariable AccountType type) {
//        return ResponseEntity.ok(accountService.getAccountsByType(type));
//    }
//
//    @GetMapping("/hierarchy")
//    public ResponseEntity<List<Map<String, Object>>> getAccountHierarchy() {
//        return ResponseEntity.ok(accountService.getAccountHierarchy());
//    }
////
////    @PostMapping
////    public ResponseEntity<ChartOfAccountDTO> createAccount(@RequestBody ChartOfAccountCreateDTO dto) {
////        System.out.println(dto);
////        UUID currentUserId = SecurityUtils.getCurrentUserId();
////        System.out.println(currentUserId);
////        ChartOfAccountDTO createdAccount = accountService.createAccount(dto, currentUserId);
////        return new ResponseEntity<>(createdAccount, HttpStatus.CREATED);
////    }
////
////    @PutMapping("/{id}")
////    public ResponseEntity<ChartOfAccountDTO> updateAccount(
////            @PathVariable UUID id,
////            @RequestBody ChartOfAccountCreateDTO dto) {
////        UUID currentUserId = SecurityUtils.getCurrentUserId();
////        return ResponseEntity.ok(accountService.updateAccount(id, dto, currentUserId));
////    }
////
////    @PutMapping("/{id}/deactivate")
////    public ResponseEntity<ChartOfAccountDTO> deactivateAccount(@PathVariable UUID id) {
////        UUID currentUserId = SecurityUtils.getCurrentUserId();
////        return ResponseEntity.ok(accountService.deactivateAccount(id, currentUserId));
////    }
//}