package com.affin.hrm.controller;

import com.affin.hrm.dto.ApiResponse;
import com.affin.hrm.dto.CompanyDTO;
import com.affin.hrm.dto.CompanyRequestDTO;
import com.affin.hrm.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public controller in Admin_Backend — accepts public company registration request submissions.
 * Unprotected (publicly accessible endpoint for potential client companies).
 */
@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
public class PublicCompanyController {

    private final AdminService adminService;

    public PublicCompanyController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/companies")
    public ResponseEntity<ApiResponse<CompanyDTO>> submitCompanyRequest(@Valid @RequestBody CompanyRequestDTO requestDTO) {
        CompanyDTO created = adminService.submitPublicCompanyRequest(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Company registration request submitted successfully. Our team will review your application."));
    }
}
