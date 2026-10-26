package com.affin.hrm.service;

import com.affin.hrm.dto.CompanyDTO;
import com.affin.hrm.dto.CompanyRequestDTO;
import com.affin.hrm.dto.DashboardStatsDTO;
import com.affin.hrm.dto.EmployeeDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.AuditLog;
import com.affin.hrm.model.Company;
import com.affin.hrm.model.SystemConfiguration;
import com.affin.hrm.repository.AuditLogRepository;
import com.affin.hrm.repository.CompanyRepository;
import com.affin.hrm.repository.SystemConfigurationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminServiceTest {

    private static final String USER = "http://user-svc";
    private static final String HR = "http://hr-svc";
    private static final String EMP = "http://emp-svc";

    private RestTemplate restTemplate;
    private AuditLogRepository auditLogRepository;
    private SystemConfigurationRepository configRepository;
    private CompanyRepository companyRepository;
    private EmailService emailService;
    private AdminService adminService;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        auditLogRepository = mock(AuditLogRepository.class);
        configRepository = mock(SystemConfigurationRepository.class);
        companyRepository = mock(CompanyRepository.class);
        emailService = mock(EmailService.class);
        adminService = new AdminService(restTemplate, auditLogRepository, configRepository,
                companyRepository, emailService);
        ReflectionTestUtils.setField(adminService, "userServiceUrl", USER);
        ReflectionTestUtils.setField(adminService, "hrServiceUrl", HR);
        ReflectionTestUtils.setField(adminService, "employeeServiceUrl", EMP);

        when(companyRepository.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Company company(Long id, Company.CompanyStatus status) {
        Company c = new Company();
        c.setId(id);
        c.setCompanyName("Acme");
        c.setRegistrationNumber("REG-1");
        c.setEmail("hr@acme.com");
        c.setContactPersonName("Jane");
        c.setStatus(status);
        return c;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubGetExchange(String url, Object body) {
        doReturn(new ResponseEntity(body, HttpStatus.OK)).when(restTemplate).exchange(
                eq(url), eq(HttpMethod.GET), any(), any(ParameterizedTypeReference.class));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubGetExchangeThrows(String url, Throwable t) {
        doThrow(t).when(restTemplate).exchange(
                eq(url), eq(HttpMethod.GET), any(), any(ParameterizedTypeReference.class));
    }

    // -- submitPublicCompanyRequest -------------------------------

    private CompanyRequestDTO requestDto() {
        CompanyRequestDTO dto = new CompanyRequestDTO();
        dto.setCompanyName("Acme");
        dto.setRegistrationNumber("REG-1");
        dto.setEmail("hr@acme.com");
        dto.setPhone("123");
        dto.setAddress("Street 1");
        dto.setIndustry("IT");
        dto.setEmployeeCount(50);
        dto.setContactPersonName("Jane");
        return dto;
    }

    @Test
    void submitPublicCompanyRequest_savesPendingCompanyAndSendsEmail() {
        when(companyRepository.findByRegistrationNumber("REG-1")).thenReturn(Optional.empty());

        CompanyDTO result = adminService.submitPublicCompanyRequest(requestDto());

        ArgumentCaptor<Company> captor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(captor.capture());
        assertEquals(Company.CompanyStatus.PENDING, captor.getValue().getStatus());
        assertEquals("Acme", captor.getValue().getCompanyName());
        assertEquals(50, captor.getValue().getEmployeeCount());
        assertEquals("PENDING", result.getStatus());
        assertEquals(50L, result.getEmployeeCount());
        verify(emailService).sendRequestReceivedEmail("hr@acme.com", "Jane", "Acme");
    }

    @Test
    void submitPublicCompanyRequest_duplicateRegistrationNumber_throws() {
        when(companyRepository.findByRegistrationNumber("REG-1"))
                .thenReturn(Optional.of(company(1L, Company.CompanyStatus.PENDING)));

        assertThrows(IllegalArgumentException.class, () -> adminService.submitPublicCompanyRequest(requestDto()));

        verify(companyRepository, never()).save(any(Company.class));
    }

    @Test
    void submitPublicCompanyRequest_emailFailure_isSwallowed() {
        when(companyRepository.findByRegistrationNumber("REG-1")).thenReturn(Optional.empty());
        doThrow(new RuntimeException("mail down")).when(emailService)
                .sendRequestReceivedEmail(anyString(), anyString(), anyString());

        CompanyDTO result = adminService.submitPublicCompanyRequest(requestDto());

        assertEquals("Acme", result.getCompanyName());
    }

    // -- approveCompany -------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void approveCompany_success_provisionsHrAccountAndEmailsPassword() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));

        CompanyDTO result = adminService.approveCompany(1L);

        assertEquals("APPROVED", result.getStatus());
        assertEquals(Company.CompanyStatus.APPROVED, c.getStatus());

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(restTemplate).postForObject(eq(USER + "/api/sync/employee"), payload.capture(), eq(String.class));
        Map<String, Object> employee = (Map<String, Object>) payload.getValue();
        assertEquals("hr@acme.com", employee.get("email"));
        assertEquals("HR_MANAGER", employee.get("role"));
        assertEquals("HR-001", employee.get("employeeId"));
        assertEquals(true, employee.get("mustChangePassword"));

        ArgumentCaptor<String> password = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendApprovalEmail(eq("hr@acme.com"), eq("Jane"), eq("Acme"), password.capture());
        assertEquals(12, password.getValue().length());
        assertEquals(password.getValue(), employee.get("password"));

        verify(restTemplate).postForObject(eq(HR + "/api/sync/company"), any(), eq(Object.class));
        verify(restTemplate).postForObject(eq(EMP + "/api/sync/company"), any(), eq(Object.class));
    }

    @Test
    void approveCompany_notFound_throws() {
        when(companyRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminService.approveCompany(99L));
    }

    @Test
    void approveCompany_userServiceUnreachable_throwsAndSendsNoEmail() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));
        doThrow(new ResourceAccessException("refused")).when(restTemplate)
                .postForObject(eq(USER + "/api/sync/company"), any(), eq(String.class));

        BusinessException ex = assertThrows(BusinessException.class, () -> adminService.approveCompany(1L));

        assertTrue(ex.getMessage().contains("User service is not reachable at " + USER));
        verify(emailService, never()).sendApprovalEmail(any(), any(), any(), any());
    }

    @Test
    void approveCompany_provisionHttpError_rollsBackStatusAndThrows() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        c.setRejectionReason("old reason");
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));
        doThrow(new HttpClientErrorException(HttpStatus.CONFLICT, "Conflict",
                "exists".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8))
                .when(restTemplate).postForObject(eq(USER + "/api/sync/employee"), any(), eq(String.class));

        BusinessException ex = assertThrows(BusinessException.class, () -> adminService.approveCompany(1L));

        assertTrue(ex.getMessage().contains("HTTP 409 - exists"));
        assertEquals(Company.CompanyStatus.PENDING, c.getStatus());
        assertEquals("old reason", c.getRejectionReason());
        verify(restTemplate, times(2)).postForObject(eq(USER + "/api/sync/company"), any(), eq(String.class));
        verify(emailService, never()).sendApprovalEmail(any(), any(), any(), any());
    }

    // -- rejectCompany / suspendCompany ---------------------------

    @Test
    void rejectCompany_withReason_savesRejectedAndEmails() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));

        CompanyDTO result = adminService.rejectCompany(1L, "Bad docs");

        assertEquals("REJECTED", result.getStatus());
        assertEquals("Bad docs", result.getRejectionReason());
        verify(emailService).sendRejectionEmail("hr@acme.com", "Jane", "Acme", "Bad docs");
    }

    @Test
    void rejectCompany_blankReason_usesDefaultReason() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));

        CompanyDTO result = adminService.rejectCompany(1L, "   ");

        assertEquals("Application did not meet requirements.", result.getRejectionReason());
    }

    @Test
    void rejectCompany_backendSyncFailures_doNotFail() {
        Company c = company(1L, Company.CompanyStatus.PENDING);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));
        doThrow(new ResourceAccessException("down")).when(restTemplate)
                .postForObject(eq(HR + "/api/sync/company"), any(), eq(Object.class));

        CompanyDTO result = adminService.rejectCompany(1L, "no");

        assertEquals("REJECTED", result.getStatus());
    }

    @Test
    void suspendCompany_setsSuspendedStatus() {
        Company c = company(1L, Company.CompanyStatus.APPROVED);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));

        CompanyDTO result = adminService.suspendCompany(1L, "policy");

        assertEquals("SUSPENDED", result.getStatus());
    }

    // -- resendHrCredentials --------------------------------------

    @Test
    void resendHrCredentials_notApproved_throws() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company(1L, Company.CompanyStatus.PENDING)));

        assertThrows(BusinessException.class, () -> adminService.resendHrCredentials(1L));
    }

    @Test
    void resendHrCredentials_approved_emailsNewPassword() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company(1L, Company.CompanyStatus.APPROVED)));

        CompanyDTO result = adminService.resendHrCredentials(1L);

        assertEquals("APPROVED", result.getStatus());
        verify(emailService).sendApprovalEmail(eq("hr@acme.com"), eq("Jane"), eq("Acme"), anyString());
    }

    // -- company CRUD ---------------------------------------------

    @Test
    void createCompany_savesApprovedCompany() {
        CompanyDTO dto = new CompanyDTO();
        dto.setCompanyName("NewCo");
        dto.setRegistrationNumber("REG-9");
        dto.setEmail("x@newco.com");
        dto.setEmployeeCount(20L);

        CompanyDTO result = adminService.createCompany(dto);

        ArgumentCaptor<Company> captor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(captor.capture());
        assertEquals(Company.CompanyStatus.APPROVED, captor.getValue().getStatus());
        assertEquals(20, captor.getValue().getEmployeeCount());
        assertEquals("NewCo", result.getCompanyName());
    }

    @Test
    void updateCompany_invalidStatusIgnored_validStatusApplied() {
        Company c = company(1L, Company.CompanyStatus.APPROVED);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(c));
        CompanyDTO dto = new CompanyDTO();
        dto.setCompanyName("Renamed");
        dto.setStatus("NOT_A_STATUS");

        CompanyDTO result = adminService.updateCompany(1L, dto);

        assertEquals("Renamed", result.getCompanyName());
        assertEquals("APPROVED", result.getStatus());

        dto.setStatus("SUSPENDED");
        assertEquals("SUSPENDED", adminService.updateCompany(1L, dto).getStatus());
    }

    @Test
    void getCompanyById_notFound_throws() {
        when(companyRepository.findById(5L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminService.getCompanyById(5L));
    }

    @Test
    void getAllCompanies_mapsEntitiesToDtos() {
        when(companyRepository.findAll()).thenReturn(List.of(company(1L, Company.CompanyStatus.PENDING)));

        List<CompanyDTO> result = adminService.getAllCompanies();

        assertEquals(1, result.size());
        assertEquals("REG-1", result.get(0).getRegistrationNumber());
    }

    // -- dashboard stats ------------------------------------------

    @Test
    void getDashboardStats_combinesLocalCountsAndEmployeeServiceStats() {
        when(companyRepository.countByStatus(Company.CompanyStatus.APPROVED)).thenReturn(4L);
        when(companyRepository.countByStatus(Company.CompanyStatus.PENDING)).thenReturn(2L);
        Map<String, Object> data = new HashMap<>();
        data.put("totalEmployees", 100);
        data.put("totalDepartments", "7");
        data.put("presentToday", 80L);
        data.put("pendingLeaves", "abc");
        stubGetExchange(EMP + "/api/internal/stats", data);

        DashboardStatsDTO stats = adminService.getDashboardStats();

        assertEquals(4L, stats.getTotalCompanies());
        assertEquals(2L, stats.getPendingCompanies());
        assertEquals(100L, stats.getTotalEmployees());
        assertEquals(7L, stats.getTotalDepartments());
        assertEquals(80L, stats.getPresentToday());
        assertEquals(0L, stats.getPendingLeaves());
    }

    @Test
    void getDashboardStats_employeeServiceDown_returnsPartialStats() {
        when(companyRepository.countByStatus(Company.CompanyStatus.APPROVED)).thenReturn(3L);
        when(companyRepository.countByStatus(Company.CompanyStatus.PENDING)).thenReturn(1L);
        stubGetExchangeThrows(EMP + "/api/internal/stats", new ResourceAccessException("refused"));

        DashboardStatsDTO stats = adminService.getDashboardStats();

        assertEquals(3L, stats.getTotalCompanies());
        assertEquals(1L, stats.getPendingCompanies());
        assertEquals(0L, stats.getTotalEmployees());
    }

    @Test
    void getCompanyDashboardStats_success() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalEmployees", 12);
        data.put("presentToday", 10);
        data.put("pendingLeaves", 2);
        stubGetExchange(EMP + "/api/internal/stats/company/5", data);

        DashboardStatsDTO stats = adminService.getCompanyDashboardStats(5L);

        assertEquals(12L, stats.getTotalEmployees());
        assertEquals(10L, stats.getPresentToday());
        assertEquals(2L, stats.getPendingLeaves());
    }

    @Test
    void getCompanyDashboardStats_httpError_returnsEmptyStats() {
        stubGetExchangeThrows(EMP + "/api/internal/stats/company/5", new HttpClientErrorException(HttpStatus.NOT_FOUND));

        DashboardStatsDTO stats = adminService.getCompanyDashboardStats(5L);

        assertEquals(0L, stats.getTotalEmployees());
    }

    // -- system users ---------------------------------------------

    @Test
    void getAllSystemUsers_success_returnsList() {
        EmployeeDTO e = new EmployeeDTO();
        e.setEmail("a@b.com");
        stubGetExchange(EMP + "/api/internal/employees", List.of(e));

        List<EmployeeDTO> result = adminService.getAllSystemUsers();

        assertEquals(1, result.size());
        assertEquals("a@b.com", result.get(0).getEmail());
    }

    @Test
    void getAllSystemUsers_serviceUnreachable_returnsEmptyList() {
        stubGetExchangeThrows(EMP + "/api/internal/employees", new ResourceAccessException("refused"));

        assertTrue(adminService.getAllSystemUsers().isEmpty());
    }

    @Test
    void getUsersByCompany_nullBody_returnsEmptyList() {
        stubGetExchange(EMP + "/api/internal/employees/company/3", null);

        assertTrue(adminService.getUsersByCompany(3L).isEmpty());
    }

    @Test
    void getAdminUsers_httpError_returnsEmptyList() {
        stubGetExchangeThrows(EMP + "/api/internal/employees/admins",
                new HttpClientErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertTrue(adminService.getAdminUsers().isEmpty());
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void updateUserRole_callsUserServiceAndLogsAudit() {
        EmployeeDTO updated = new EmployeeDTO();
        updated.setRole("HR_MANAGER");
        doReturn(new ResponseEntity(updated, HttpStatus.OK)).when(restTemplate).exchange(
                eq(USER + "/api/internal/users/5/role?role=HR_MANAGER"), eq(HttpMethod.PUT), any(),
                any(Class.class));

        EmployeeDTO result = adminService.updateUserRole(5L, "HR_MANAGER");

        assertEquals("HR_MANAGER", result.getRole());
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("UPDATE_USER_ROLE", captor.getValue().getAction());
        assertEquals(5L, captor.getValue().getEntityId());
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void updateUserStatus_httpError_propagatesWithoutAudit() {
        doThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND)).when(restTemplate).exchange(
                eq(USER + "/api/internal/users/5/status?status=ACTIVE"), eq(HttpMethod.PUT), any(),
                any(Class.class));

        assertThrows(HttpClientErrorException.class, () -> adminService.updateUserStatus(5L, "ACTIVE"));

        verify(auditLogRepository, never()).save(any(AuditLog.class));
    }

    // -- audit log ------------------------------------------------

    @Test
    void logAction_savesAuditLogWithDefaults() {
        adminService.logAction("ACT", "Company", 7L, "desc");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog log = captor.getValue();
        assertEquals("ACT", log.getAction());
        assertEquals("Company", log.getEntity());
        assertEquals("Company", log.getEntityType());
        assertEquals(7L, log.getEntityId());
        assertEquals("desc", log.getDescription());
        assertEquals("ADMIN", log.getPerformedBy());
    }

    @Test
    void logAction_nullEntity_usesSystem() {
        adminService.logAction("ACT", null, null, "desc");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("SYSTEM", captor.getValue().getEntity());
        assertNull(captor.getValue().getEntityId());
    }

    @Test
    void logAction_repositoryFailure_isSwallowed() {
        when(auditLogRepository.save(any(AuditLog.class))).thenThrow(new RuntimeException("db down"));

        adminService.logAction("ACT", "Company", 1L, "desc");

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void getAuditLogsByDateRange_delegatesToRepository() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        AuditLog entry = new AuditLog();
        when(auditLogRepository.findByDateRange(start, end)).thenReturn(List.of(entry));

        List<AuditLog> result = adminService.getAuditLogsByDateRange(start, end);

        assertEquals(1, result.size());
    }

    // -- system configuration -------------------------------------

    @Test
    void updateConfiguration_newKey_createsConfiguration() {
        when(configRepository.findByConfigKey("k")).thenReturn(Optional.empty());
        when(configRepository.save(any(SystemConfiguration.class))).thenAnswer(inv -> inv.getArgument(0));

        SystemConfiguration result = adminService.updateConfiguration("k", "v");

        assertEquals("k", result.getConfigKey());
        assertEquals("v", result.getConfigValue());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void updateConfiguration_existingKey_updatesValue() {
        SystemConfiguration existing = new SystemConfiguration();
        existing.setConfigKey("k");
        existing.setConfigValue("old");
        when(configRepository.findByConfigKey("k")).thenReturn(Optional.of(existing));
        when(configRepository.save(any(SystemConfiguration.class))).thenAnswer(inv -> inv.getArgument(0));

        SystemConfiguration result = adminService.updateConfiguration("k", "new");

        assertEquals("new", existing.getConfigValue());
        assertEquals("new", result.getConfigValue());
    }

    @Test
    void getConfiguration_missingKey_throwsNotFound() {
        when(configRepository.findByConfigKey("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminService.getConfiguration("missing"));
    }
}
