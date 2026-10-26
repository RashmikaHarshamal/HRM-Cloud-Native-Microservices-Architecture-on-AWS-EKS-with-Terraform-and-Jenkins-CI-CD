package com.affin.hrm.service;

import com.affin.hrm.dto.ApiResponse;
import com.affin.hrm.dto.AuthRequest;
import com.affin.hrm.dto.AuthResponse;
import com.affin.hrm.dto.EmployeeDTO;
import com.affin.hrm.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

class AuthServiceTest {

    private static final String USER_URL = "http://user-svc";
    private static final String EMP_URL = "http://emp-svc";

    private RestTemplate restTemplate;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        authService = new AuthService(restTemplate);
        ReflectionTestUtils.setField(authService, "userServiceUrl", USER_URL);
        ReflectionTestUtils.setField(authService, "employeeServiceUrl", EMP_URL);
    }

    private AuthRequest request() {
        return new AuthRequest("admin@hrm.com", "secret");
    }

    private Map<String, Object> adminData(String role) {
        Map<String, Object> data = new HashMap<>();
        data.put("token", "jwt-token");
        data.put("email", "admin@hrm.com");
        data.put("fullName", "Admin User");
        data.put("role", role);
        data.put("companyId", 3);
        data.put("employeeId", 9);
        return data;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubLoginReturns(Object body) {
        doReturn(new ResponseEntity(body, HttpStatus.OK)).when(restTemplate).exchange(
                eq(USER_URL + "/api/auth/login"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubLoginThrows(Throwable t) {
        doThrow(t).when(restTemplate).exchange(
                eq(USER_URL + "/api/auth/login"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class));
    }

    @Test
    void login_adminRole_returnsMappedResponse() {
        stubLoginReturns(new ApiResponse<Map<String, Object>>(true, "ok", adminData("ADMIN")));

        AuthResponse result = authService.login(request());

        assertEquals("jwt-token", result.getToken());
        assertEquals("admin@hrm.com", result.getEmail());
        assertEquals("Admin User", result.getFullName());
        assertEquals("ADMIN", result.getRole());
        assertEquals(3L, result.getCompanyId());
        assertEquals(9L, result.getId());
    }

    @Test
    void login_roleComparisonIsCaseInsensitive() {
        stubLoginReturns(new ApiResponse<Map<String, Object>>(true, "ok", adminData("admin")));

        AuthResponse result = authService.login(request());

        assertEquals("admin", result.getRole());
    }

    @Test
    void login_missingCompanyAndEmployeeId_mapsToNull() {
        Map<String, Object> data = adminData("ADMIN");
        data.remove("companyId");
        data.remove("employeeId");
        stubLoginReturns(new ApiResponse<Map<String, Object>>(true, "ok", data));

        AuthResponse result = authService.login(request());

        assertNull(result.getCompanyId());
        assertNull(result.getId());
    }

    @Test
    void login_nonAdminRole_throwsAccessDenied() {
        stubLoginReturns(new ApiResponse<Map<String, Object>>(true, "ok", adminData("HR_MANAGER")));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request()));

        assertTrue(ex.getMessage().startsWith("Access denied"));
    }

    @Test
    void login_nullBody_throwsAuthenticationFailed() {
        stubLoginReturns(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request()));

        assertEquals("Authentication failed", ex.getMessage());
    }

    @Test
    void login_responseWithoutToken_throwsAuthenticationFailed() {
        Map<String, Object> data = adminData("ADMIN");
        data.remove("token");
        stubLoginReturns(new ApiResponse<Map<String, Object>>(true, "ok", data));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request()));

        assertEquals("Authentication failed", ex.getMessage());
    }

    @Test
    void login_httpClientError_throwsInvalidCredentials() {
        stubLoginThrows(new HttpClientErrorException(HttpStatus.UNAUTHORIZED));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request()));

        assertEquals("Invalid credentials", ex.getMessage());
    }

    @Test
    void login_userServiceUnreachable_propagatesResourceAccessException() {
        stubLoginThrows(new ResourceAccessException("Connection refused"));

        assertThrows(ResourceAccessException.class, () -> authService.login(request()));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubAdmins(EmployeeDTO[] admins) {
        doReturn(new ResponseEntity(admins, HttpStatus.OK)).when(restTemplate)
                .getForEntity(eq(EMP_URL + "/api/internal/employees/admins"), eq(EmployeeDTO[].class));
    }

    private EmployeeDTO employee(String email, String fullName) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setEmail(email);
        dto.setFullName(fullName);
        return dto;
    }

    @Test
    void getCurrentAdmin_matchesEmailIgnoringCase() {
        EmployeeDTO other = employee("other@hrm.com", "Other");
        EmployeeDTO match = employee("Admin@HRM.com", "Admin User");
        stubAdmins(new EmployeeDTO[]{other, match});

        EmployeeDTO result = authService.getCurrentAdmin("admin@hrm.com");

        assertSame(match, result);
    }

    @Test
    void getCurrentAdmin_noMatch_throwsAdminNotFound() {
        stubAdmins(new EmployeeDTO[]{employee("other@hrm.com", "Other")});

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.getCurrentAdmin("admin@hrm.com"));

        assertEquals("Admin not found: admin@hrm.com", ex.getMessage());
    }

    @Test
    void getCurrentAdmin_nullBody_throwsAdminNotFound() {
        stubAdmins(null);

        assertThrows(BusinessException.class, () -> authService.getCurrentAdmin("admin@hrm.com"));
    }

    @Test
    void getCurrentAdmin_httpClientError_wrapsInBusinessException() {
        doThrow(new HttpClientErrorException(HttpStatus.FORBIDDEN)).when(restTemplate)
                .getForEntity(eq(EMP_URL + "/api/internal/employees/admins"), eq(EmployeeDTO[].class));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.getCurrentAdmin("admin@hrm.com"));

        assertTrue(ex.getMessage().startsWith("Failed to get admin info: "));
    }
}
