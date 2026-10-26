package com.airella.hrm.service;

import com.airella.hrm.DTO.DepartmentDTO;
import com.airella.hrm.DTO.JobRoleDTO;
import com.airella.hrm.Model.Company;
import com.airella.hrm.Model.Department;
import com.airella.hrm.Model.Employee;
import com.airella.hrm.Model.JobRole;
import com.airella.hrm.Repo.DepartmentRepo;
import com.airella.hrm.Repo.EmployeeRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DepartmentServiceTest {

    private DepartmentRepo departmentRepo;
    private EmployeeRepo employeeRepo;
    private AuthService authService;
    private AuditService auditService;
    private DepartmentService service;

    private Company company;
    private Company otherCompany;
    private Employee hr;

    @BeforeEach
    void setUp() {
        departmentRepo = mock(DepartmentRepo.class);
        employeeRepo = mock(EmployeeRepo.class);
        authService = mock(AuthService.class);
        auditService = mock(AuditService.class);
        service = new DepartmentService();
        ReflectionTestUtils.setField(service, "departmentRepo", departmentRepo);
        ReflectionTestUtils.setField(service, "employeeRepo", employeeRepo);
        ReflectionTestUtils.setField(service, "authService", authService);
        ReflectionTestUtils.setField(service, "auditService", auditService);

        company = new Company();
        company.setId(1L);
        otherCompany = new Company();
        otherCompany.setId(2L);

        hr = employee(99L, "HR-001", Employee.Role.HR_MANAGER);
        when(authService.getCurrentEmployee()).thenReturn(hr);
        when(departmentRepo.save(any(Department.class))).thenAnswer(inv -> {
            Department d = inv.getArgument(0);
            if (d.getId() == null) {
                d.setId(50L);
            }
            return d;
        });
    }

    private Employee employee(Long id, String employeeId, Employee.Role role) {
        Employee e = new Employee();
        e.setId(id);
        e.setEmployeeId(employeeId);
        e.setFullName("Person " + id);
        e.setRole(role);
        e.setCompany(company);
        return e;
    }

    private Department department(Long id, String name, Company owner) {
        Department d = new Department();
        d.setId(id);
        d.setName(name);
        d.setCompany(owner);
        d.setActive(true);
        return d;
    }

    private DepartmentDTO dto(String name) {
        DepartmentDTO d = new DepartmentDTO();
        d.setName(name);
        return d;
    }

    private JobRoleDTO jobRole(String title, Double salary) {
        JobRoleDTO r = new JobRoleDTO();
        r.setJobTitle(title);
        r.setBasicSalary(salary);
        return r;
    }

    // ---------- authorization ----------

    @Test
    void createDepartment_plainEmployee_isRejected() {
        when(authService.getCurrentEmployee()).thenReturn(employee(5L, "EMP-001", Employee.Role.EMPLOYEE));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.createDepartment(dto("Sales")));

        assertTrue(ex.getMessage().startsWith("Only HR staff"));
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void createDepartment_hrManagerWithoutHrPrefix_isRejected() {
        when(authService.getCurrentEmployee()).thenReturn(employee(6L, "EMP-002", Employee.Role.HR_MANAGER));

        assertThrows(RuntimeException.class, () -> service.createDepartment(dto("Sales")));
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void createDepartment_hrManagerWithNullEmployeeId_isRejected() {
        when(authService.getCurrentEmployee()).thenReturn(employee(6L, null, Employee.Role.HR_MANAGER));

        assertThrows(RuntimeException.class, () -> service.createDepartment(dto("Sales")));
    }

    @Test
    void createDepartment_hrPrefixIsCaseInsensitive() {
        when(authService.getCurrentEmployee()).thenReturn(employee(7L, "hr-009", Employee.Role.HR_MANAGER));

        DepartmentDTO result = service.createDepartment(dto("Sales"));

        assertEquals("Sales", result.getName());
    }

    @Test
    void createDepartment_adminWithoutHrPrefix_isAllowed() {
        when(authService.getCurrentEmployee()).thenReturn(employee(8L, "SA-001", Employee.Role.ADMIN));

        DepartmentDTO result = service.createDepartment(dto("Legal"));

        assertEquals("Legal", result.getName());
    }

    // ---------- createDepartment ----------

    @Test
    void createDepartment_happyPath_normalisesFieldsAndAudits() {
        DepartmentDTO input = dto("  Engineering  ");
        input.setShortCode(" eng ");
        input.setDescription("  Builds things ");

        DepartmentDTO result = service.createDepartment(input);

        ArgumentCaptor<Department> captor = ArgumentCaptor.forClass(Department.class);
        verify(departmentRepo).save(captor.capture());
        Department saved = captor.getValue();
        assertEquals("Engineering", saved.getName());
        assertEquals("ENG", saved.getShortCode());
        assertEquals("Builds things", saved.getDescription());
        assertSame(company, saved.getCompany());
        assertTrue(saved.getActive());

        assertEquals(50L, result.getId());
        assertEquals("Engineering", result.getName());
        assertEquals("ENG", result.getShortCode());
        assertEquals(1L, result.getCompanyId());
        assertEquals(0, result.getJobRoleCount());
        verify(auditService).logAction("CREATE_DEPARTMENT", "Department", 50L,
                "Created department: Engineering", 1L);
    }

    @Test
    void createDepartment_nullName_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.createDepartment(dto(null)));

        assertEquals("Department name is required", ex.getMessage());
    }

    @Test
    void createDepartment_blankName_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.createDepartment(dto("   ")));

        assertEquals("Department name is required", ex.getMessage());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void createDepartment_duplicateName_throws() {
        when(departmentRepo.findByCompanyIdAndName(1L, "Sales"))
                .thenReturn(Optional.of(department(3L, "Sales", company)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.createDepartment(dto(" Sales ")));

        assertEquals("A department named 'Sales' already exists", ex.getMessage());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void createDepartment_withManager_assignsManager() {
        Employee manager = employee(20L, "EMP-020", Employee.Role.EMPLOYEE);
        when(employeeRepo.findById(20L)).thenReturn(Optional.of(manager));
        DepartmentDTO input = dto("Ops");
        input.setManagerId(20L);

        DepartmentDTO result = service.createDepartment(input);

        assertEquals(20L, result.getManagerId());
        assertEquals("Person 20", result.getManagerName());
    }

    @Test
    void createDepartment_unknownManager_throws() {
        when(employeeRepo.findById(404L)).thenReturn(Optional.empty());
        DepartmentDTO input = dto("Ops");
        input.setManagerId(404L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.createDepartment(input));

        assertEquals("Employee not found with id: 404", ex.getMessage());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void createDepartment_jobRoles_skipsBlankTitlesAndDefaultsSalary() {
        DepartmentDTO input = dto("Finance");
        List<JobRoleDTO> roles = new ArrayList<>();
        roles.add(jobRole("  Accountant ", 1500.0));
        roles.add(jobRole("Clerk", null));
        roles.add(jobRole("   ", 999.0));
        roles.add(jobRole(null, 999.0));
        input.setJobRoles(roles);

        DepartmentDTO result = service.createDepartment(input);

        assertEquals(2, result.getJobRoleCount());
        assertEquals("Accountant", result.getJobRoles().get(0).getJobTitle());
        assertEquals(1500.0, result.getJobRoles().get(0).getBasicSalary());
        assertEquals("Clerk", result.getJobRoles().get(1).getJobTitle());
        assertEquals(0.0, result.getJobRoles().get(1).getBasicSalary());
    }

    @Test
    void createDepartment_nullJobRolesList_isTolerated() {
        DepartmentDTO input = dto("Support");
        input.setJobRoles(null);

        DepartmentDTO result = service.createDepartment(input);

        assertEquals(0, result.getJobRoleCount());
    }

    // ---------- reads ----------

    @Test
    void getDepartmentsByCompany_mapsAllAndIncludesEmployeeCount() {
        Department d1 = department(10L, "A", company);
        Department d2 = department(11L, "B", company);
        when(departmentRepo.findByCompanyId(1L)).thenReturn(List.of(d1, d2));
        when(employeeRepo.countByDepartmentId(10L)).thenReturn(4L);

        List<DepartmentDTO> result = service.getDepartmentsByCompany(1L);

        assertEquals(2, result.size());
        assertEquals("A", result.get(0).getName());
        assertEquals(4, result.get(0).getEmployeeCount());
        assertEquals(0, result.get(1).getEmployeeCount());
    }

    @Test
    void getDepartmentById_ownCompany_returnsDto() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "A", company)));

        DepartmentDTO result = service.getDepartmentById(10L, 1L);

        assertEquals(10L, result.getId());
        assertEquals(1L, result.getCompanyId());
        assertTrue(result.getActive());
    }

    @Test
    void getDepartmentById_otherCompany_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "A", otherCompany)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getDepartmentById(10L, 1L));

        assertEquals("Department does not belong to your company", ex.getMessage());
    }

    @Test
    void getDepartmentById_missing_throws() {
        when(departmentRepo.findById(77L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getDepartmentById(77L, 1L));

        assertEquals("Department not found with id: 77", ex.getMessage());
    }

    // ---------- updateDepartment ----------

    @Test
    void updateDepartment_partialUpdate_changesOnlyProvidedFields() {
        Department existing = department(10L, "Old", company);
        existing.setShortCode("OLD");
        existing.setDescription("keep me");
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        DepartmentDTO input = new DepartmentDTO();
        input.setName("  New  ");
        input.setShortCode(" nw ");
        input.setActive(false);

        DepartmentDTO result = service.updateDepartment(10L, input);

        assertEquals("New", result.getName());
        assertEquals("NW", result.getShortCode());
        assertEquals("keep me", result.getDescription());
        assertFalse(result.getActive());
        verify(auditService).logAction("UPDATE_DEPARTMENT", "Department", 10L, "Updated department: New", 1L);
    }

    @Test
    void updateDepartment_blankName_keepsExistingName() {
        Department existing = department(10L, "Keep", company);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));

        DepartmentDTO result = service.updateDepartment(10L, dto("   "));

        assertEquals("Keep", result.getName());
    }

    @Test
    void updateDepartment_nullJobRoles_leavesExistingRolesUntouched() {
        Department existing = department(10L, "Dept", company);
        JobRole role = new JobRole();
        role.setJobTitle("Lead");
        role.setBasicSalary(10.0);
        existing.addJobRole(role);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        DepartmentDTO input = new DepartmentDTO();
        input.setJobRoles(null);

        DepartmentDTO result = service.updateDepartment(10L, input);

        assertEquals(1, result.getJobRoleCount());
        assertEquals("Lead", result.getJobRoles().get(0).getJobTitle());
    }

    @Test
    void updateDepartment_providedJobRoles_replacesExistingRoles() {
        Department existing = department(10L, "Dept", company);
        JobRole oldRole = new JobRole();
        oldRole.setJobTitle("Old Role");
        oldRole.setBasicSalary(10.0);
        existing.addJobRole(oldRole);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        DepartmentDTO input = new DepartmentDTO();
        input.setJobRoles(List.of(jobRole("New Role", 2000.0)));

        DepartmentDTO result = service.updateDepartment(10L, input);

        assertEquals(1, result.getJobRoleCount());
        assertEquals("New Role", result.getJobRoles().get(0).getJobTitle());
        assertEquals(2000.0, result.getJobRoles().get(0).getBasicSalary());
        assertNull(oldRole.getDepartment());
    }

    @Test
    void updateDepartment_otherCompany_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "X", otherCompany)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.updateDepartment(10L, dto("Y")));

        assertEquals("Department does not belong to your company", ex.getMessage());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void updateDepartment_missing_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.updateDepartment(10L, dto("Y")));

        assertEquals("Department not found with id: 10", ex.getMessage());
    }

    // ---------- deactivate / delete / assignManager ----------

    @Test
    void deactivateDepartment_setsInactiveAndAudits() {
        Department existing = department(10L, "Ops", company);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));

        service.deactivateDepartment(10L);

        assertFalse(existing.getActive());
        verify(departmentRepo).save(existing);
        verify(auditService).logAction("DEACTIVATE_DEPARTMENT", "Department", 10L,
                "Deactivated department: Ops", 1L);
    }

    @Test
    void deactivateDepartment_otherCompany_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "Ops", otherCompany)));

        assertThrows(RuntimeException.class, () -> service.deactivateDepartment(10L));
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void deleteDepartment_noEmployees_deletesAndAudits() {
        Department existing = department(10L, "Ops", company);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        when(employeeRepo.countByDepartmentId(10L)).thenReturn(0L);

        service.deleteDepartment(10L);

        verify(departmentRepo).delete(existing);
        verify(auditService).logAction("DELETE_DEPARTMENT", "Department", 10L, "Deleted department: Ops", 1L);
    }

    @Test
    void deleteDepartment_withAssignedEmployees_isRejected() {
        Department existing = department(10L, "Ops", company);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        when(employeeRepo.countByDepartmentId(10L)).thenReturn(3L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.deleteDepartment(10L));

        assertTrue(ex.getMessage().startsWith("Cannot delete 'Ops': 3 employee(s) are still assigned to it."));
        verify(departmentRepo, never()).delete(any(Department.class));
    }

    @Test
    void deleteDepartment_otherCompany_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "Ops", otherCompany)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.deleteDepartment(10L));

        assertEquals("Department does not belong to your company", ex.getMessage());
        verify(departmentRepo, never()).delete(any(Department.class));
    }

    @Test
    void assignManager_setsManagerAndReturnsDto() {
        Department existing = department(10L, "Ops", company);
        Employee manager = employee(30L, "EMP-030", Employee.Role.EMPLOYEE);
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(existing));
        when(employeeRepo.findById(30L)).thenReturn(Optional.of(manager));

        DepartmentDTO result = service.assignManager(10L, 30L);

        assertSame(manager, existing.getManager());
        assertEquals(30L, result.getManagerId());
        assertEquals("Person 30", result.getManagerName());
        verify(auditService).logAction("ASSIGN_DEPARTMENT_MANAGER", "Department", 10L,
                "Assigned manager Person 30 to department: Ops", 1L);
    }

    @Test
    void assignManager_unknownEmployee_throws() {
        when(departmentRepo.findById(10L)).thenReturn(Optional.of(department(10L, "Ops", company)));
        when(employeeRepo.findById(31L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.assignManager(10L, 31L));

        assertEquals("Employee not found with id: 31", ex.getMessage());
        verify(departmentRepo, never()).save(any(Department.class));
    }

    @Test
    void assignManager_nonHrCaller_isRejected() {
        when(authService.getCurrentEmployee()).thenReturn(employee(5L, "EMP-001", Employee.Role.EMPLOYEE));

        assertThrows(RuntimeException.class, () -> service.assignManager(10L, 30L));
        verifyNoInteractions(employeeRepo);
    }
}
