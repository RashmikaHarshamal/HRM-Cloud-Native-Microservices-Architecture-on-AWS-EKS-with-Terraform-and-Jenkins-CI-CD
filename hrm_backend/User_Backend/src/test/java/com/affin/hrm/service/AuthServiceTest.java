package com.airella.hrm.service;

import com.airella.hrm.DTO.AuthRequest;
import com.airella.hrm.DTO.AuthResponse;
import com.airella.hrm.DTO.RegisterRequest;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Department;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Model.SessionLog;
import com.airella.hrm.Model.User;
import com.airella.hrm.Repo.CompanyRepo;
import com.airella.hrm.Repo.DepartmentRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import com.airella.hrm.Repo.SessionLogRepo;
import com.airella.hrm.Repo.UserRepo;
import com.airella.hrm.config.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private AuthenticationManager authenticationManager;
    private EmployeeRepo employeeRepo;
    private UserRepo userRepo;
    private CompanyRepo companyRepo;
    private DepartmentRepo departmentRepo;
    private SessionLogRepo sessionLogRepo;
    private JwtUtil jwtUtil;
    private PasswordEncoder passwordEncoder;
    private EmploymentTypeService employmentTypeService;
    private AuthService service;

    private Company company;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        authenticationManager = mock(AuthenticationManager.class);
        employeeRepo = mock(EmployeeRepo.class);
        userRepo = mock(UserRepo.class);
        companyRepo = mock(CompanyRepo.class);
        departmentRepo = mock(DepartmentRepo.class);
        sessionLogRepo = mock(SessionLogRepo.class);
        jwtUtil = mock(JwtUtil.class);
        passwordEncoder = mock(PasswordEncoder.class);
        employmentTypeService = mock(EmploymentTypeService.class);

        service = new AuthService();
        ReflectionTestUtils.setField(service, "authenticationManager", authenticationManager);
        ReflectionTestUtils.setField(service, "employeeRepo", employeeRepo);
        ReflectionTestUtils.setField(service, "userRepo", userRepo);
        ReflectionTestUtils.setField(service, "companyRepo", companyRepo);
        ReflectionTestUtils.setField(service, "departmentRepo", departmentRepo);
        ReflectionTestUtils.setField(service, "sessionLogRepo", sessionLogRepo);
        ReflectionTestUtils.setField(service, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(service, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(service, "employmentTypeService", employmentTypeService);

        company = new Company();
        company.setId(1L);
        company.setCompanyName("Acme");

        // "encoding" just tags the password so tests can see it was encoded
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "$2a$10$ENC_" + inv.getArgument(0));
        // repositories echo whatever is saved
        when(employeeRepo.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyRepo.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));
        when(departmentRepo.save(any(Department.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Employee employee(Long id, String email, String password, Employee.Role role) {
        Employee e = new Employee();
        e.setId(id);
        e.setEmail(email);
        e.setPassword(password);
        e.setFullName("Ann Perera");
        e.setEmployeeId("EMP-001");
        e.setRole(role);
        e.setCompany(company);
        return e;
    }

    private RegisterRequest registerRequest(String email) {
        RegisterRequest r = new RegisterRequest();
        r.setFullName("New Person");
        r.setEmail(email);
        r.setPassword("pw123456");
        return r;
    }

    private void loggedInAs(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, "x", List.of(new SimpleGrantedAuthority("ROLE_X"))));
    }

    // ------------------------------------------------------------------ login

    @Test
    void login_success_returnsTokenAndEmployeeDetails() {
        Employee emp = employee(5L, "ann@acme.test", "$2a$10$stored", Employee.Role.HR_MANAGER);
        emp.setMustChangePassword(true);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        Authentication auth = new UsernamePasswordAuthenticationToken("ann@acme.test", "pw");
        when(authenticationManager.authenticate(any(Authentication.class))).thenReturn(auth);
        when(jwtUtil.generateToken(any(Authentication.class), eq(5L))).thenReturn("jwt-token");

        AuthResponse response = service.login(new AuthRequest("  Ann@Acme.Test ", "pw"));

        assertEquals("jwt-token", response.getToken());
        assertEquals("Bearer", response.getType());
        assertEquals("ann@acme.test", response.getEmail());
        assertEquals("Ann Perera", response.getFullName());
        assertEquals("HR_MANAGER", response.getRole());
        assertEquals(1L, response.getCompanyId());
        assertEquals(5L, response.getEmployeeId());
        assertTrue(response.isMustChangePassword());
        assertSame(auth, SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void login_normalisesEmailBeforeAuthenticating() {
        Employee emp = employee(5L, "ann@acme.test", "$2a$10$stored", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ann@acme.test", "pw"));

        service.login(new AuthRequest("  ANN@ACME.TEST  ", "pw"));

        ArgumentCaptor<Authentication> captor = ArgumentCaptor.forClass(Authentication.class);
        verify(authenticationManager).authenticate(captor.capture());
        assertEquals("ann@acme.test", captor.getValue().getPrincipal());
        assertEquals("pw", captor.getValue().getCredentials());
    }

    @Test
    void login_recordsASessionLog() {
        Employee emp = employee(5L, "ann@acme.test", "$2a$10$stored", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ann@acme.test", "pw"));

        service.login(new AuthRequest("ann@acme.test", "pw"));

        ArgumentCaptor<SessionLog> captor = ArgumentCaptor.forClass(SessionLog.class);
        verify(sessionLogRepo).save(captor.capture());
        assertEquals(5L, captor.getValue().getUserId());
        assertTrue(captor.getValue().getStatus());
        assertNotNull(captor.getValue().getLoginTime());
    }

    @Test
    void login_sessionLogFailure_doesNotBreakLogin() {
        Employee emp = employee(5L, "ann@acme.test", "$2a$10$stored", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ann@acme.test", "pw"));
        when(jwtUtil.generateToken(any(Authentication.class), eq(5L))).thenReturn("jwt");
        when(sessionLogRepo.save(any(SessionLog.class))).thenThrow(new RuntimeException("db down"));

        AuthResponse response = service.login(new AuthRequest("ann@acme.test", "pw"));

        assertEquals("jwt", response.getToken());
    }

    @Test
    void login_plainTextPasswordInDb_isUpgradedToBcrypt() {
        Employee emp = employee(5L, "ann@acme.test", "plainpw", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ann@acme.test", "plainpw"));

        service.login(new AuthRequest("ann@acme.test", "plainpw"));

        assertEquals("$2a$10$ENC_plainpw", emp.getPassword());
        verify(employeeRepo).save(emp);
    }

    @Test
    void login_bcryptPasswordInDb_isLeftAlone() {
        Employee emp = employee(5L, "ann@acme.test", "$2b$10$alreadyHashed", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ann@acme.test", "pw"));

        service.login(new AuthRequest("ann@acme.test", "pw"));

        assertEquals("$2b$10$alreadyHashed", emp.getPassword());
        verify(employeeRepo, never()).save(any(Employee.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void login_wrongPlainTextPassword_isNotUpgraded() {
        Employee emp = employee(5L, "ann@acme.test", "realpw", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> service.login(new AuthRequest("ann@acme.test", "guess")));

        assertEquals("realpw", emp.getPassword());
        verify(employeeRepo, never()).save(any(Employee.class));
    }

    @Test
    void login_badCredentials_propagatesAndWritesNoSession() {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> service.login(new AuthRequest("who@acme.test", "pw")));

        verify(sessionLogRepo, never()).save(any(SessionLog.class));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void login_authenticatedButEmployeeMissing_throwsUserNotFound() {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("ghost@acme.test", "pw"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.login(new AuthRequest("ghost@acme.test", "pw")));

        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void login_nullEmailAndPassword_areTreatedAsEmpty() {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> service.login(new AuthRequest(null, null)));

        ArgumentCaptor<Authentication> captor = ArgumentCaptor.forClass(Authentication.class);
        verify(authenticationManager).authenticate(captor.capture());
        assertEquals("", captor.getValue().getPrincipal());
        assertEquals("", captor.getValue().getCredentials());
    }

    // -------------------------------------------------- legacy user migration

    @Test
    void login_legacyUserWithRightPassword_isMigratedToEmployee() {
        Employee migrated = employee(9L, "old@acme.test", "$2a$10$ENC_secret", Employee.Role.HR_MANAGER);
        // 1st call (migration check): none; later calls: the migrated employee
        when(employeeRepo.findByEmailIgnoreCase("old@acme.test"))
                .thenReturn(Optional.empty(), Optional.of(migrated), Optional.of(migrated));
        User legacy = new User();
        legacy.setEmail("old@acme.test");
        legacy.setFullName("Old Timer");
        legacy.setPassword("secret");
        legacy.setRole("hr");
        legacy.setEmployeeId("HR-005");
        when(userRepo.findByEmailIgnoreCase("old@acme.test")).thenReturn(Optional.of(legacy));
        when(companyRepo.findByRegistrationNumber("DEFAULT-REG-0001")).thenReturn(Optional.of(company));
        Department general = new Department();
        general.setId(3L);
        general.setName("General");
        when(departmentRepo.findByCompanyIdAndName(1L, "General")).thenReturn(Optional.of(general));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("old@acme.test", "secret"));

        service.login(new AuthRequest("old@acme.test", "secret"));

        ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepo).save(captor.capture());
        Employee created = captor.getValue();
        assertEquals("old@acme.test", created.getEmail());
        assertEquals("Old Timer", created.getFullName());
        assertEquals("HR-005", created.getEmployeeId());
        assertEquals(Employee.Role.HR_MANAGER, created.getRole());
        assertEquals(Employee.EmployeeStatus.ACTIVE, created.getStatus());
        assertEquals("$2a$10$ENC_secret", created.getPassword());
        assertSame(company, created.getCompany());
        assertSame(general, created.getDepartment());
    }

    @Test
    void login_legacyUserWithWrongPassword_isNotMigrated() {
        User legacy = new User();
        legacy.setEmail("old@acme.test");
        legacy.setPassword("secret");
        when(userRepo.findByEmailIgnoreCase("old@acme.test")).thenReturn(Optional.of(legacy));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> service.login(new AuthRequest("old@acme.test", "wrong")));

        verify(employeeRepo, never()).save(any(Employee.class));
    }

    @Test
    void login_legacyUserWithBcryptPassword_isCheckedWithEncoder() {
        Employee migrated = employee(9L, "old@acme.test", "$2a$10$ENC_secret", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("old@acme.test"))
                .thenReturn(Optional.empty(), Optional.of(migrated), Optional.of(migrated));
        User legacy = new User();
        legacy.setEmail("old@acme.test");
        legacy.setPassword("$2a$10$legacyHash");
        legacy.setRole("USER");
        when(userRepo.findByEmailIgnoreCase("old@acme.test")).thenReturn(Optional.of(legacy));
        when(passwordEncoder.matches("secret", "$2a$10$legacyHash")).thenReturn(true);
        when(companyRepo.findByRegistrationNumber("DEFAULT-REG-0001")).thenReturn(Optional.of(company));
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("old@acme.test", "secret"));

        service.login(new AuthRequest("old@acme.test", "secret"));

        ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepo).save(captor.capture());
        assertEquals(Employee.Role.EMPLOYEE, captor.getValue().getRole()); // legacy "USER" => EMPLOYEE
        assertEquals("User", captor.getValue().getFullName());             // no legacy name => default
    }

    // --------------------------------------------------------------- register

    @Test
    void register_duplicateEmail_isRejected() {
        when(employeeRepo.findByEmailIgnoreCase("dup@acme.test")).thenReturn(Optional.of(new Employee()));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.register(registerRequest("Dup@Acme.test")));

        assertEquals("Employee with email already exists", ex.getMessage());
        verify(employeeRepo, never()).save(any(Employee.class));
    }

    @Test
    void register_duplicateEmployeeId_isRejected() {
        RegisterRequest request = registerRequest("new@acme.test");
        request.setEmployeeId("EMP-010");
        when(employeeRepo.findByEmployeeId("EMP-010")).thenReturn(Optional.of(new Employee()));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.register(request));

        assertEquals("Employee ID already exists", ex.getMessage());
    }

    @Test
    void register_withoutLoggedInCreator_usesAndCreatesTheDefaultCompany() {
        RegisterRequest request = registerRequest("  New@Acme.Test ");
        request.setEmploymentType("Full-Time");
        when(employmentTypeService.resolve("Full-Time", null)).thenReturn("Full-Time");

        Employee saved = service.register(request);

        assertEquals("new@acme.test", saved.getEmail());
        assertEquals("$2a$10$ENC_pw123456", saved.getPassword());
        assertEquals("EMP-001", saved.getEmployeeId());
        assertEquals(Employee.Role.EMPLOYEE, saved.getRole());
        assertEquals(Employee.Gender.OTHER, saved.getGender());
        assertEquals(Employee.EmployeeStatus.ACTIVE, saved.getStatus());
        assertEquals("Full-Time", saved.getEmploymentType());
        assertNotNull(saved.getJoiningDate());
        assertEquals("Default Company", saved.getCompany().getCompanyName());
        assertEquals(Company.CompanyStatus.APPROVED, saved.getCompany().getStatus());
        assertEquals("General", saved.getDepartment().getName());
    }

    @Test
    void register_syncsTheLegacyUsersTable() {
        service.register(registerRequest("new@acme.test"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("new@acme.test", captor.getValue().getEmail());
        assertEquals("New Person", captor.getValue().getFullName());
        assertEquals("EMPLOYEE", captor.getValue().getRole());
        assertEquals("General", captor.getValue().getDepartment());
    }

    @Test
    void register_joinsTheCreatorsCompany() {
        Company hrCompany = new Company();
        hrCompany.setId(7L);
        Employee hr = employee(2L, "hr@acme.test", "x", Employee.Role.HR_MANAGER);
        hr.setCompany(hrCompany);
        when(employeeRepo.findByEmailIgnoreCase("hr@acme.test")).thenReturn(Optional.of(hr));
        loggedInAs("hr@acme.test");

        Employee saved = service.register(registerRequest("new@acme.test"));

        assertSame(hrCompany, saved.getCompany());
        verify(companyRepo, never()).findByRegistrationNumber(anyString());
    }

    @Test
    void register_creatorWithoutCompany_isRejected() {
        Employee hr = employee(2L, "hr@acme.test", "x", Employee.Role.HR_MANAGER);
        hr.setCompany(null);
        when(employeeRepo.findByEmailIgnoreCase("hr@acme.test")).thenReturn(Optional.of(hr));
        loggedInAs("hr@acme.test");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.register(registerRequest("new@acme.test")));

        assertEquals("Your account is not linked to a company", ex.getMessage());
    }

    @Test
    void register_hrManagerCannotCreateAdmin() {
        Employee hr = employee(2L, "hr@acme.test", "x", Employee.Role.HR_MANAGER);
        when(employeeRepo.findByEmailIgnoreCase("hr@acme.test")).thenReturn(Optional.of(hr));
        loggedInAs("hr@acme.test");
        RegisterRequest request = registerRequest("boss@acme.test");
        request.setRole("admin");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.register(request));

        assertEquals("Only an administrator can create administrator accounts", ex.getMessage());
        verify(employeeRepo, never()).save(any(Employee.class));
    }

    @Test
    void register_adminCanCreateAdmin_withSaPrefixedId() {
        Employee admin = employee(1L, "admin@acme.test", "x", Employee.Role.ADMIN);
        when(employeeRepo.findByEmailIgnoreCase("admin@acme.test")).thenReturn(Optional.of(admin));
        loggedInAs("admin@acme.test");
        RegisterRequest request = registerRequest("boss@acme.test");
        request.setRole("Admin");

        Employee saved = service.register(request);

        assertEquals(Employee.Role.ADMIN, saved.getRole());
        assertEquals("SA-001", saved.getEmployeeId());
    }

    @Test
    void register_generatesNextEmployeeIdFromExistingOnes() {
        Employee a = new Employee();
        a.setEmployeeId("HR-001");
        Employee b = new Employee();
        b.setEmployeeId("HR-007");
        Employee junk = new Employee();
        junk.setEmployeeId("HR-abc"); // non numeric suffix is ignored
        when(employeeRepo.findByEmployeeIdStartingWith("HR-")).thenReturn(List.of(a, b, junk));
        RegisterRequest request = registerRequest("hr2@acme.test");
        request.setRole("hr manager");

        Employee saved = service.register(request);

        assertEquals(Employee.Role.HR_MANAGER, saved.getRole());
        assertEquals("HR-008", saved.getEmployeeId());
    }

    @Test
    void register_keepsAnExplicitEmployeeId() {
        RegisterRequest request = registerRequest("new@acme.test");
        request.setEmployeeId("CUSTOM-1");

        assertEquals("CUSTOM-1", service.register(request).getEmployeeId());
    }

    @Test
    void register_unknownRoleFallsBackToEmployee() {
        RegisterRequest request = registerRequest("new@acme.test");
        request.setRole("wizard");

        assertEquals(Employee.Role.EMPLOYEE, service.register(request).getRole());
    }

    @Test
    void register_genderIsParsedAndDefaultsToOther() {
        RegisterRequest female = registerRequest("f@acme.test");
        female.setGender(" female ");
        RegisterRequest odd = registerRequest("o@acme.test");
        odd.setGender("???");

        assertEquals(Employee.Gender.FEMALE, service.register(female).getGender());
        assertEquals(Employee.Gender.OTHER, service.register(odd).getGender());
    }

    @Test
    void register_reusesAnExistingDepartment() {
        Department sales = new Department();
        sales.setId(4L);
        sales.setName("Sales");
        when(companyRepo.findByRegistrationNumber("DEFAULT-REG-0001")).thenReturn(Optional.of(company));
        when(departmentRepo.findByCompanyIdAndName(1L, "Sales")).thenReturn(Optional.of(sales));
        RegisterRequest request = registerRequest("new@acme.test");
        request.setDepartment("  Sales ");

        Employee saved = service.register(request);

        assertSame(sales, saved.getDepartment());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    // ------------------------------------------------------------ employee ids

    @Test
    void getNextEmployeeId_buildsPrefixNumberAndSuggestion() {
        Employee a = new Employee();
        a.setEmployeeId("SA-002");
        when(employeeRepo.findByEmployeeIdStartingWith("SA-")).thenReturn(List.of(a));

        Map<String, Object> result = service.getNextEmployeeId("admin");

        assertEquals("SA", result.get("prefix"));
        assertEquals(3, result.get("nextNumber"));
        assertEquals("003", result.get("formattedNumber"));
        assertEquals("SA-003", result.get("suggestedId"));
    }

    @Test
    void getNextEmployeeId_unknownRoleUsesEmpPrefixAndStartsAtOne() {
        Map<String, Object> result = service.getNextEmployeeId("something-else");

        assertEquals("EMP", result.get("prefix"));
        assertEquals("EMP-001", result.get("suggestedId"));
    }

    @Test
    void generateEmployeeIdForRole_usesTheRolePrefix() {
        assertEquals("HR-001", service.generateEmployeeIdForRole("hr_manager"));
    }

    // -------------------------------------------------------------- exists

    @Test
    void checkUserExists_andLegacyExists_normaliseTheEmail() {
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(new Employee()));
        when(userRepo.findByEmailIgnoreCase("old@acme.test")).thenReturn(Optional.of(new User()));

        assertTrue(service.checkUserExists("  ANN@acme.test "));
        assertFalse(service.checkUserExists("nobody@acme.test"));
        assertFalse(service.checkUserExists(null));
        assertTrue(service.checkLegacyUserExists("OLD@acme.test"));
        assertFalse(service.checkLegacyUserExists("nobody@acme.test"));
    }

    // ----------------------------------------------------- current employee

    @Test
    void getCurrentEmployee_looksUpTheLoggedInUser() {
        Employee emp = employee(5L, "ann@acme.test", "x", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        loggedInAs("Ann@Acme.test");

        assertSame(emp, service.getCurrentEmployee());
    }

    @Test
    void getCurrentEmployee_unknownUser_throws() {
        loggedInAs("ghost@acme.test");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getCurrentEmployee());

        assertEquals("User not found", ex.getMessage());
    }

    // --------------------------------------------------- password reset flows

    @Test
    void forgotPassword_storesATokenValidForAboutAnHour() {
        Employee emp = employee(5L, "ann@acme.test", "x", Employee.Role.EMPLOYEE);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));

        String token = service.forgotPassword(" Ann@acme.test ");

        assertNotNull(token);
        assertEquals(token, emp.getResetPasswordToken());
        assertTrue(emp.getResetPasswordTokenExpiry().isAfter(LocalDateTime.now().plusMinutes(55)));
        assertTrue(emp.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now().plusMinutes(65)));
        verify(employeeRepo).save(emp);
    }

    @Test
    void forgotPassword_unknownEmail_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.forgotPassword("nobody@acme.test"));

        assertEquals("Employee not found with email: nobody@acme.test", ex.getMessage());
    }

    @Test
    void resetPassword_unknownToken_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.resetPassword("nope", "newpw"));

        assertEquals("Invalid or expired reset token", ex.getMessage());
    }

    @Test
    void resetPassword_expiredToken_throws() {
        Employee emp = employee(5L, "ann@acme.test", "old", Employee.Role.EMPLOYEE);
        emp.setResetPasswordToken("tok");
        emp.setResetPasswordTokenExpiry(LocalDateTime.now().minusMinutes(5));
        when(employeeRepo.findByResetPasswordToken("tok")).thenReturn(Optional.of(emp));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.resetPassword("tok", "newpw"));

        assertEquals("Reset token has expired", ex.getMessage());
        assertEquals("old", emp.getPassword());
    }

    @Test
    void resetPassword_validToken_changesPasswordClearsTokenAndUpdatesLegacyUser() {
        Employee emp = employee(5L, "ann@acme.test", "old", Employee.Role.EMPLOYEE);
        emp.setResetPasswordToken("tok");
        emp.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(30));
        when(employeeRepo.findByResetPasswordToken("tok")).thenReturn(Optional.of(emp));
        User legacy = new User();
        legacy.setEmail("ann@acme.test");
        when(userRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(legacy));

        service.resetPassword("tok", "newpw");

        assertEquals("$2a$10$ENC_newpw", emp.getPassword());
        assertNull(emp.getResetPasswordToken());
        assertNull(emp.getResetPasswordTokenExpiry());
        assertEquals("$2a$10$ENC_newpw", legacy.getPassword());
        verify(userRepo).save(legacy);
    }

    @Test
    void changePassword_wrongCurrentPassword_isRejected() {
        Employee emp = employee(5L, "ann@acme.test", "stored", Employee.Role.EMPLOYEE);
        emp.setMustChangePassword(true);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(passwordEncoder.matches("wrong", "stored")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.changePassword("ann@acme.test", "wrong", "newpw"));

        assertEquals("Current temporary password is invalid", ex.getMessage());
        assertTrue(emp.getMustChangePassword());
    }

    @Test
    void changePassword_success_clearsMustChangeFlag() {
        Employee emp = employee(5L, "ann@acme.test", "stored", Employee.Role.EMPLOYEE);
        emp.setMustChangePassword(true);
        when(employeeRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(emp));
        when(passwordEncoder.matches("temp", "stored")).thenReturn(true);

        service.changePassword("ANN@acme.test", "temp", "newpw");

        assertEquals("$2a$10$ENC_newpw", emp.getPassword());
        assertFalse(emp.getMustChangePassword());
    }

    @Test
    void changePassword_unknownEmployee_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.changePassword("nobody@acme.test", "a", "b"));

        assertEquals("Employee not found with email: nobody@acme.test", ex.getMessage());
    }

    // ------------------------------------------------------ sessions / logout

    @Test
    void logout_closesTheActiveSession() {
        SessionLog session = new SessionLog();
        session.setUserId(5L);
        session.setStatus(true);
        when(sessionLogRepo.findFirstByUserIdAndStatusTrueOrderByIdDesc(5L)).thenReturn(Optional.of(session));

        service.logout(5L);

        assertFalse(session.getStatus());
        assertNotNull(session.getLogoutTime());
        verify(sessionLogRepo).save(session);
    }

    @Test
    void logout_withNoActiveSession_doesNothing() {
        service.logout(5L);

        verify(sessionLogRepo, never()).save(any(SessionLog.class));
    }

    @Test
    void validateSession_reflectsTheActiveSession() {
        SessionLog active = new SessionLog();
        active.setStatus(true);
        when(sessionLogRepo.findFirstByUserIdAndStatusTrueOrderByIdDesc(5L)).thenReturn(Optional.of(active));

        assertTrue(service.validateSession(5L));
        assertFalse(service.validateSession(6L));
    }

    // ------------------------------------------------------------- sync table

    @Test
    void syncUserTable_createsAUserFromTheEmployee() {
        Employee emp = employee(5L, "Ann@Acme.test", "$2a$10$hash", Employee.Role.HR_MANAGER);
        emp.setGender(Employee.Gender.FEMALE);
        Department dept = new Department();
        dept.setName("People");
        emp.setDepartment(dept);

        service.syncUserTable(emp);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User user = captor.getValue();
        assertEquals("ann@acme.test", user.getEmail());
        assertEquals("Ann Perera", user.getFullName());
        assertEquals("$2a$10$hash", user.getPassword());
        assertEquals("EMP-001", user.getEmployeeId());
        assertEquals("FEMALE", user.getGender());
        assertEquals("HR_MANAGER", user.getRole());
        assertEquals("People", user.getDepartment());
    }

    @Test
    void syncUserTable_updatesAnExistingUserInPlace() {
        User existing = new User();
        existing.setEmail("ann@acme.test");
        existing.setNic("keep-me");
        when(userRepo.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(existing));

        service.syncUserTable(employee(5L, "ann@acme.test", "pw", Employee.Role.EMPLOYEE));

        verify(userRepo).save(existing);
        assertEquals("keep-me", existing.getNic());
        assertEquals("Ann Perera", existing.getFullName());
    }

    @Test
    void syncUserTable_ignoresNullEmployeeAndNullEmail() {
        service.syncUserTable(null);
        service.syncUserTable(new Employee());

        verifyNoInteractions(userRepo);
    }

    @Test
    void syncUserTable_swallowsRepositoryErrors() {
        when(userRepo.save(any(User.class))).thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() -> service.syncUserTable(employee(5L, "ann@acme.test", "pw", Employee.Role.EMPLOYEE)));
    }

    @Test
    void syncAllEmployees_syncsEveryEmployee() {
        List<Employee> all = new ArrayList<>();
        all.add(employee(1L, "a@acme.test", "pw", Employee.Role.EMPLOYEE));
        all.add(employee(2L, "b@acme.test", "pw", Employee.Role.EMPLOYEE));
        when(employeeRepo.findAll()).thenReturn(all);

        service.syncAllEmployees();

        verify(userRepo, times(2)).save(any(User.class));
    }
}
