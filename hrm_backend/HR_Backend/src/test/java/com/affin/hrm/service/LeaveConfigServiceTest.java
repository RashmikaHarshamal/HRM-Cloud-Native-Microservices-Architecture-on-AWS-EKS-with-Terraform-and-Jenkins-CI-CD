package com.affin.hrm.service;

import com.affin.hrm.dto.EmploymentTypeDTO;
import com.affin.hrm.dto.LeaveAllocationDTO;
import com.affin.hrm.dto.LeaveEntitlementDTO;
import com.affin.hrm.dto.LeaveTypeDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.Company;
import com.affin.hrm.model.Department;
import com.affin.hrm.model.Employee;
import com.affin.hrm.model.EmploymentType;
import com.affin.hrm.model.JobRole;
import com.affin.hrm.model.JobRoleLeaveAllocation;
import com.affin.hrm.model.LeaveType;
import com.affin.hrm.repository.BasicPaymentRepository;
import com.affin.hrm.repository.EmploymentTypeRepository;
import com.affin.hrm.repository.JobRoleLeaveAllocationRepository;
import com.affin.hrm.repository.JobRoleRepository;
import com.affin.hrm.repository.LeaveApplicationRepository;
import com.affin.hrm.repository.LeaveTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LeaveConfigServiceTest {

    private LeaveTypeRepository leaveTypeRepo;
    private EmploymentTypeRepository employmentTypeRepo;
    private JobRoleRepository jobRoleRepo;
    private JobRoleLeaveAllocationRepository allocationRepo;
    private BasicPaymentRepository basicPaymentRepo;
    private LeaveApplicationRepository leaveApplicationRepo;
    private AuditService auditService;
    private LeaveConfigService service;

    private Company company;
    private Company otherCompany;
    private Department engineering;
    private JobRole engineer;
    private Employee hr;

    @BeforeEach
    void setUp() {
        leaveTypeRepo = mock(LeaveTypeRepository.class);
        employmentTypeRepo = mock(EmploymentTypeRepository.class);
        jobRoleRepo = mock(JobRoleRepository.class);
        allocationRepo = mock(JobRoleLeaveAllocationRepository.class);
        basicPaymentRepo = mock(BasicPaymentRepository.class);
        leaveApplicationRepo = mock(LeaveApplicationRepository.class);
        auditService = mock(AuditService.class);
        service = new LeaveConfigService(leaveTypeRepo, employmentTypeRepo, jobRoleRepo, allocationRepo,
                basicPaymentRepo, leaveApplicationRepo, auditService);

        company = new Company();
        company.setId(1L);
        otherCompany = new Company();
        otherCompany.setId(2L);

        engineering = new Department();
        engineering.setId(10L);
        engineering.setName("Engineering");
        engineering.setCompany(company);

        engineer = new JobRole();
        engineer.setId(100L);
        engineer.setJobTitle("Software Engineer");
        engineer.setDepartment(engineering);

        hr = new Employee();
        hr.setId(99L);
        hr.setFullName("HR Person");
        hr.setEmail("hr@acme.test");
        hr.setCompany(company);

        when(leaveTypeRepo.save(any(LeaveType.class))).thenAnswer(inv -> inv.getArgument(0));
        when(employmentTypeRepo.save(any(EmploymentType.class))).thenAnswer(inv -> inv.getArgument(0));
        when(allocationRepo.save(any(JobRoleLeaveAllocation.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private LeaveType leaveType(Long id, String name, Company owner) {
        LeaveType t = new LeaveType();
        t.setId(id);
        t.setName(name);
        t.setCompany(owner);
        return t;
    }

    private EmploymentType employmentType(Long id, String name, Company owner) {
        EmploymentType t = new EmploymentType();
        t.setId(id);
        t.setName(name);
        t.setCompany(owner);
        return t;
    }

    private LeaveAllocationDTO row(Long employmentTypeId, Long leaveTypeId, String period, Double days) {
        LeaveAllocationDTO dto = new LeaveAllocationDTO();
        dto.setEmploymentTypeId(employmentTypeId);
        dto.setLeaveTypeId(leaveTypeId);
        dto.setPeriod(period);
        dto.setDays(days);
        return dto;
    }

    private LeaveAllocationDTO.SaveRequest request(Long jobRoleId, LeaveAllocationDTO... rows) {
        LeaveAllocationDTO.SaveRequest req = new LeaveAllocationDTO.SaveRequest();
        req.setJobRoleId(jobRoleId);
        req.setAllocations(new ArrayList<>(List.of(rows)));
        return req;
    }

    private void stubReferenceData() {
        when(jobRoleRepo.findById(100L)).thenReturn(Optional.of(engineer));
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true))
                .thenReturn(List.of(leaveType(1L, "Annual Leave", company)));
        when(employmentTypeRepo.findByCompanyIdAndActive(1L, true))
                .thenReturn(List.of(employmentType(5L, "Full-Time", company)));
    }

    // ------ Leave types ------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void createLeaveTypes_cleansNamesAndSavesWithDefaults() {
        List<LeaveTypeDTO> result = service.createLeaveTypes(List.of("  Annual    Leave ", "Sick"), hr);

        assertEquals(2, result.size());
        assertEquals("Annual Leave", result.get(0).getName());
        assertEquals("Sick", result.get(1).getName());

        ArgumentCaptor<LeaveType> captor = ArgumentCaptor.forClass(LeaveType.class);
        verify(leaveTypeRepo, times(2)).save(captor.capture());
        LeaveType first = captor.getAllValues().get(0);
        assertEquals("Annual Leave", first.getName());
        assertSame(company, first.getCompany());
        assertTrue(first.getActive());
        assertTrue(first.getRequiresApproval());
        assertEquals(0, first.getDefaultDaysPerYear());
        assertEquals(99L, first.getCreatedById());
        assertEquals("HR Person", first.getCreatedByName());
    }

    @Test
    void createLeaveTypes_blankOrNullNamesRejected() {
        List<String> names = new ArrayList<>();
        names.add("   ");
        names.add(null);
        names.add("");
        BusinessException ex = assertThrows(BusinessException.class, () -> service.createLeaveTypes(names, hr));
        assertEquals("Enter at least one leave type", ex.getMessage());

        assertThrows(BusinessException.class, () -> service.createLeaveTypes(null, hr));
        verify(leaveTypeRepo, never()).save(any());
    }

    @Test
    void createLeaveTypes_duplicateOfExistingIsRejectedCaseInsensitively() {
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true))
                .thenReturn(List.of(leaveType(1L, "Sick", company)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.createLeaveTypes(List.of("Casual", "  SICK "), hr));

        assertEquals("Already added: SICK", ex.getMessage());
        verify(leaveTypeRepo, never()).save(any());
    }

    @Test
    void createLeaveTypes_globalLeaveTypeCountsAsExisting() {
        when(leaveTypeRepo.findByCompanyIdIsNullAndActive(true))
                .thenReturn(List.of(leaveType(50L, "Maternity", null)));

        assertThrows(BusinessException.class, () -> service.createLeaveTypes(List.of("maternity"), hr));
    }

    @Test
    void createLeaveTypes_repeatsWithinRequestAreMerged() {
        List<LeaveTypeDTO> result = service.createLeaveTypes(List.of("Casual", "casual", "CASUAL"), hr);

        assertEquals(1, result.size());
        assertEquals("Casual", result.get(0).getName());
        verify(leaveTypeRepo, times(1)).save(any(LeaveType.class));
    }

    @Test
    void getLeaveTypes_mergesCompanyAndGlobalSortedByNameIgnoringCase() {
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true))
                .thenReturn(List.of(leaveType(1L, "sick", company), leaveType(2L, "Annual", company)));
        when(leaveTypeRepo.findByCompanyIdIsNullAndActive(true))
                .thenReturn(List.of(leaveType(3L, "Birthday", null)));

        List<LeaveTypeDTO> result = service.getLeaveTypes(1L);

        assertEquals(List.of("Annual", "Birthday", "sick"),
                result.stream().map(LeaveTypeDTO::getName).toList());
    }

    @Test
    void updateLeaveType_renamesAndCollapsesWhitespace() {
        LeaveType sick = leaveType(1L, "Sick", company);
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(sick));
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(sick));

        LeaveTypeDTO result = service.updateLeaveType(1L, "  Medical   Leave ", hr);

        assertEquals("Medical Leave", result.getName());
        assertEquals("Medical Leave", sick.getName());
        verify(leaveTypeRepo).save(sick);
    }

    @Test
    void updateLeaveType_canChangeCaseOfOwnName() {
        LeaveType sick = leaveType(1L, "sick", company);
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(sick));
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(sick));

        LeaveTypeDTO result = service.updateLeaveType(1L, "Sick", hr);

        assertEquals("Sick", result.getName());
    }

    @Test
    void updateLeaveType_otherCompanyTypeReadsAsNotFound() {
        when(leaveTypeRepo.findById(7L)).thenReturn(Optional.of(leaveType(7L, "Foreign", otherCompany)));

        assertThrows(ResourceNotFoundException.class, () -> service.updateLeaveType(7L, "Whatever", hr));
        verify(leaveTypeRepo, never()).save(any());
    }

    @Test
    void updateLeaveType_globalTypeWithoutCompanyReadsAsNotFound() {
        when(leaveTypeRepo.findById(8L)).thenReturn(Optional.of(leaveType(8L, "Global", null)));

        assertThrows(ResourceNotFoundException.class, () -> service.updateLeaveType(8L, "Renamed", hr));
    }

    @Test
    void updateLeaveType_blankNameRejected() {
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(leaveType(1L, "Sick", company)));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.updateLeaveType(1L, "   ", hr));
        assertEquals("Leave type name is required", ex.getMessage());
        assertThrows(BusinessException.class, () -> service.updateLeaveType(1L, null, hr));
    }

    @Test
    void updateLeaveType_nameLengthBoundary() {
        LeaveType sick = leaveType(1L, "Sick", company);
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(sick));
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(sick));

        String exactly100 = "a".repeat(100);
        assertEquals(exactly100, service.updateLeaveType(1L, exactly100, hr).getName());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.updateLeaveType(1L, "a".repeat(101), hr));
        assertEquals("Leave type name must be at most 100 characters", ex.getMessage());
    }

    @Test
    void updateLeaveType_nameUsedByAnotherTypeRejected() {
        LeaveType sick = leaveType(1L, "Sick", company);
        LeaveType annual = leaveType(2L, "Annual", company);
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(sick));
        when(leaveTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(sick, annual));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.updateLeaveType(1L, "ANNUAL", hr));
        assertEquals("A leave type named 'ANNUAL' already exists", ex.getMessage());
        verify(leaveTypeRepo, never()).save(any());
    }

    @Test
    void deleteLeaveType_blockedWhenAllocationsExist() {
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(leaveType(1L, "Sick", company)));
        when(allocationRepo.countByLeaveTypeId(1L)).thenReturn(3L);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.deleteLeaveType(1L, hr));
        assertTrue(ex.getMessage().contains("3 leave entitlement(s)"));
        verify(leaveTypeRepo, never()).delete(any());
    }

    @Test
    void deleteLeaveType_blockedWhenApplicationsExist() {
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(leaveType(1L, "Sick", company)));
        when(leaveApplicationRepo.countByLeaveTypeId(1L)).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.deleteLeaveType(1L, hr));
        assertTrue(ex.getMessage().contains("2 leave application(s)"));
        verify(leaveTypeRepo, never()).delete(any());
    }

    @Test
    void deleteLeaveType_unusedTypeIsDeletedAndAudited() {
        LeaveType sick = leaveType(1L, "Sick", company);
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(sick));

        service.deleteLeaveType(1L, hr);

        verify(leaveTypeRepo).delete(sick);
        verify(leaveTypeRepo).flush();
        verify(auditService).logAction(eq("DELETE"), eq("LeaveType"), eq(1L), anyString(), eq(1L));
    }

    @Test
    void deleteLeaveType_otherCompanyReadsAsNotFound() {
        when(leaveTypeRepo.findById(1L)).thenReturn(Optional.of(leaveType(1L, "Sick", otherCompany)));

        assertThrows(ResourceNotFoundException.class, () -> service.deleteLeaveType(1L, hr));
    }

    @Test
    void auditFailureDoesNotBlockLeaveTypeCreation() {
        doThrow(new RuntimeException("audit down")).when(auditService)
                .logAction(anyString(), anyString(), any(), anyString(), any());

        List<LeaveTypeDTO> result = service.createLeaveTypes(List.of("Sick"), hr);

        assertEquals(1, result.size());
    }

    // ------ Employment types ---------------------------------------------------------------------------------------------------------------------------

    @Test
    void createEmploymentTypes_savesTrimmedNames() {
        List<EmploymentTypeDTO> result = service.createEmploymentTypes(List.of(" Full-Time ", "Contract"), hr);

        assertEquals(List.of("Full-Time", "Contract"), result.stream().map(EmploymentTypeDTO::getName).toList());
        ArgumentCaptor<EmploymentType> captor = ArgumentCaptor.forClass(EmploymentType.class);
        verify(employmentTypeRepo, times(2)).save(captor.capture());
        assertSame(company, captor.getAllValues().get(0).getCompany());
        assertTrue(captor.getAllValues().get(0).getActive());
    }

    @Test
    void createEmploymentTypes_emptyAndDuplicateRejected() {
        BusinessException empty = assertThrows(BusinessException.class,
                () -> service.createEmploymentTypes(List.of(" "), hr));
        assertEquals("Enter at least one employment type", empty.getMessage());

        when(employmentTypeRepo.findByCompanyIdAndActive(1L, true))
                .thenReturn(List.of(employmentType(5L, "Full-Time", company)));
        BusinessException dup = assertThrows(BusinessException.class,
                () -> service.createEmploymentTypes(List.of("full-time"), hr));
        assertEquals("Already added: full-time", dup.getMessage());
    }

    @Test
    void getEmploymentTypes_sortedById() {
        when(employmentTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(
                List.of(employmentType(6L, "Intern", company), employmentType(5L, "Full-Time", company)));

        List<EmploymentTypeDTO> result = service.getEmploymentTypes(1L);

        assertEquals(List.of(5L, 6L), result.stream().map(EmploymentTypeDTO::getId).toList());
    }

    @Test
    void updateEmploymentType_duplicateNameRejected() {
        EmploymentType fullTime = employmentType(5L, "Full-Time", company);
        EmploymentType intern = employmentType(6L, "Intern", company);
        when(employmentTypeRepo.findById(6L)).thenReturn(Optional.of(intern));
        when(employmentTypeRepo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(fullTime, intern));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.updateEmploymentType(6L, "full-time", hr));
        assertEquals("An employment type named 'full-time' already exists", ex.getMessage());
    }

    @Test
    void updateEmploymentType_otherCompanyReadsAsNotFound() {
        when(employmentTypeRepo.findById(6L)).thenReturn(Optional.of(employmentType(6L, "Intern", otherCompany)));

        assertThrows(ResourceNotFoundException.class, () -> service.updateEmploymentType(6L, "Trainee", hr));
    }

    @Test
    void deleteEmploymentType_blockedByAllocationsOrSalaryRows() {
        EmploymentType intern = employmentType(6L, "Intern", company);
        when(employmentTypeRepo.findById(6L)).thenReturn(Optional.of(intern));

        when(allocationRepo.countByEmploymentTypeId(6L)).thenReturn(1L);
        assertThrows(BusinessException.class, () -> service.deleteEmploymentType(6L, hr));

        when(allocationRepo.countByEmploymentTypeId(6L)).thenReturn(0L);
        when(basicPaymentRepo.countByEmploymentTypeId(6L)).thenReturn(4L);
        BusinessException ex = assertThrows(BusinessException.class, () -> service.deleteEmploymentType(6L, hr));
        assertTrue(ex.getMessage().contains("4 job role salary row(s)"));

        verify(employmentTypeRepo, never()).delete(any());
    }

    @Test
    void deleteEmploymentType_unusedIsDeleted() {
        EmploymentType intern = employmentType(6L, "Intern", company);
        when(employmentTypeRepo.findById(6L)).thenReturn(Optional.of(intern));

        service.deleteEmploymentType(6L, hr);

        verify(employmentTypeRepo).delete(intern);
        verify(employmentTypeRepo).flush();
    }

    // ------ Allocations ------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void saveAllocations_requiresJobRole() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(null, row(5L, 1L, "ANNUAL", 14.0)), hr));
        assertEquals("Job role is required", ex.getMessage());
    }

    @Test
    void saveAllocations_unknownOrForeignJobRoleIsNotFound() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.saveAllocations(request(100L, row(5L, 1L, "ANNUAL", 14.0)), hr));

        Department foreignDept = new Department();
        foreignDept.setId(20L);
        foreignDept.setCompany(otherCompany);
        JobRole foreignRole = new JobRole();
        foreignRole.setId(200L);
        foreignRole.setJobTitle("Spy");
        foreignRole.setDepartment(foreignDept);
        when(jobRoleRepo.findById(200L)).thenReturn(Optional.of(foreignRole));

        assertThrows(ResourceNotFoundException.class,
                () -> service.saveAllocations(request(200L, row(5L, 1L, "ANNUAL", 14.0)), hr));
    }

    @Test
    void saveAllocations_emptyRowsRejected() {
        stubReferenceData();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L), hr));
        assertEquals("Add at least one leave to assign", ex.getMessage());
    }

    @Test
    void saveAllocations_newRowIsCreatedWithNormalisedPeriod() {
        stubReferenceData();

        List<LeaveAllocationDTO> result = service.saveAllocations(
                request(100L, row(5L, 1L, " monthly ", 1.5)), hr);

        assertEquals(1, result.size());
        LeaveAllocationDTO dto = result.get(0);
        assertEquals("MONTHLY", dto.getPeriod());
        assertEquals(1.5, dto.getDays());
        assertEquals("Software Engineer", dto.getJobRoleTitle());
        assertEquals("Engineering", dto.getDepartmentName());
        assertEquals("Annual Leave", dto.getLeaveTypeName());
        assertEquals("Full-Time", dto.getEmploymentTypeName());

        ArgumentCaptor<JobRoleLeaveAllocation> captor = ArgumentCaptor.forClass(JobRoleLeaveAllocation.class);
        verify(allocationRepo).save(captor.capture());
        assertEquals(99L, captor.getValue().getCreatedById());
        assertSame(company, captor.getValue().getCompany());
        verify(auditService).logAction(eq("ASSIGN_LEAVE"), eq("JobRole"), eq(100L), anyString(), eq(1L));
    }

    @Test
    void saveAllocations_existingRowIsUpdatedNotDuplicated() {
        stubReferenceData();
        JobRoleLeaveAllocation existing = new JobRoleLeaveAllocation();
        existing.setId(900L);
        existing.setDays(5.0);
        existing.setPeriod(JobRoleLeaveAllocation.Period.ANNUAL);
        when(allocationRepo.findByJobRoleIdAndEmploymentTypeIdAndLeaveTypeId(100L, 5L, 1L))
                .thenReturn(Optional.of(existing));

        List<LeaveAllocationDTO> result = service.saveAllocations(
                request(100L, row(5L, 1L, "ANNUAL", 21.0)), hr);

        assertEquals(900L, result.get(0).getId());
        assertEquals(21.0, existing.getDays());
        verify(allocationRepo).save(existing);
    }

    @Test
    void saveAllocations_daysBoundaries() {
        stubReferenceData();

        for (Double bad : new Double[]{null, 0.0, -1.0, 366.5}) {
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> service.saveAllocations(request(100L, row(5L, 1L, "ANNUAL", bad)), hr));
            assertEquals("Row 1: number of leaves must be more than 0 and at most 366", ex.getMessage());
        }

        // 366 is the inclusive upper limit; 0.5 is a valid half day
        assertEquals(1, service.saveAllocations(request(100L, row(5L, 1L, "ANNUAL", 366.0)), hr).size());
        assertEquals(1, service.saveAllocations(request(100L, row(5L, 1L, "ANNUAL", 0.5)), hr).size());
    }

    @Test
    void saveAllocations_invalidPeriodRejected() {
        stubReferenceData();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L, row(5L, 1L, "DAILY", 1.0)), hr));
        assertEquals("Row 1: select Annual, Monthly or Weekly", ex.getMessage());

        assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L, row(5L, 1L, null, 1.0)), hr));
        verify(allocationRepo, never()).save(any());
    }

    @Test
    void saveAllocations_unknownEmploymentOrLeaveTypeRejectedWithRowNumber() {
        stubReferenceData();

        BusinessException noEmployment = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L, row(null, 1L, "ANNUAL", 1.0)), hr));
        assertEquals("Row 1: select an employment type", noEmployment.getMessage());

        BusinessException unknownLeave = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L,
                        row(5L, 1L, "ANNUAL", 1.0), row(5L, 999L, "ANNUAL", 1.0)), hr));
        assertEquals("Row 2: select a leave type", unknownLeave.getMessage());
    }

    @Test
    void saveAllocations_sameCombinationTwiceRejected() {
        stubReferenceData();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.saveAllocations(request(100L,
                        row(5L, 1L, "ANNUAL", 10.0), row(5L, 1L, "MONTHLY", 1.0)), hr));
        assertEquals("Row 2: Annual Leave for Full-Time is listed twice", ex.getMessage());
    }

    @Test
    void deleteAllocation_removesRowAndAudits() {
        JobRoleLeaveAllocation allocation = new JobRoleLeaveAllocation();
        allocation.setId(900L);
        allocation.setCompany(company);
        allocation.setJobRole(engineer);
        allocation.setLeaveType(leaveType(1L, "Annual Leave", company));
        allocation.setEmploymentType(employmentType(5L, "Full-Time", company));
        when(allocationRepo.findById(900L)).thenReturn(Optional.of(allocation));

        service.deleteAllocation(900L, hr);

        verify(allocationRepo).delete(allocation);
        verify(allocationRepo).flush();
        verify(auditService).logAction(eq("DELETE"), eq("JobRoleLeaveAllocation"), eq(900L),
                eq("Removed Annual Leave (Full-Time) from Software Engineer"), eq(1L));
    }

    @Test
    void deleteAllocation_otherCompanyReadsAsNotFound() {
        JobRoleLeaveAllocation allocation = new JobRoleLeaveAllocation();
        allocation.setId(900L);
        allocation.setCompany(otherCompany);
        when(allocationRepo.findById(900L)).thenReturn(Optional.of(allocation));

        assertThrows(ResourceNotFoundException.class, () -> service.deleteAllocation(900L, hr));
        verify(allocationRepo, never()).delete(any());
    }

    @Test
    void getAllocations_usesDepartmentFilterOnlyWhenGiven() {
        service.getAllocations(1L, null);
        verify(allocationRepo).findByCompanyIdOrderByUpdatedAtDesc(1L);

        service.getAllocations(1L, 10L);
        verify(allocationRepo).findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(1L, 10L);
    }

    // ------ Entitlements ---------------------------------------------------------------------------------------------------------------------------------------

    private JobRoleLeaveAllocation allocation(Long leaveTypeId, String leaveTypeName,
                                              JobRoleLeaveAllocation.Period period, double days,
                                              String employmentTypeName) {
        JobRoleLeaveAllocation a = new JobRoleLeaveAllocation();
        a.setJobRole(engineer);
        a.setLeaveType(leaveType(leaveTypeId, leaveTypeName, company));
        a.setEmploymentType(employmentType(5L, employmentTypeName, company));
        a.setPeriod(period);
        a.setDays(days);
        return a;
    }

    private Employee staff(String designation, String employmentType) {
        Employee e = new Employee();
        e.setId(5L);
        e.setCompany(company);
        e.setDepartment(engineering);
        e.setDesignation(designation);
        e.setEmploymentType(employmentType);
        return e;
    }

    @Test
    void getEntitlements_matchesTitleAndEmploymentTypeAndScalesToYear() {
        when(allocationRepo.findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(1L, 10L)).thenReturn(List.of(
                allocation(2L, "Casual", JobRoleLeaveAllocation.Period.WEEKLY, 1.0, "Full-Time"),
                allocation(1L, "Annual", JobRoleLeaveAllocation.Period.MONTHLY, 1.5, "full-time"),
                allocation(3L, "Intern Only", JobRoleLeaveAllocation.Period.ANNUAL, 3.0, "Intern")));

        List<LeaveEntitlementDTO> result = service.getEntitlements(staff("  software   ENGINEER ", "Full-Time"));

        assertEquals(2, result.size());
        assertEquals(1L, result.get(0).getLeaveTypeId());
        assertEquals("MONTHLY", result.get(0).getPeriod());
        assertEquals(18, result.get(0).getDaysPerYear());   // 1.5 x 12
        assertEquals(2L, result.get(1).getLeaveTypeId());
        assertEquals(52, result.get(1).getDaysPerYear());   // 1 x 52
    }

    @Test
    void getEntitlements_ignoresInactiveJobRoleAndInactiveLeaveType() {
        JobRoleLeaveAllocation inactiveLeave = allocation(1L, "Annual", JobRoleLeaveAllocation.Period.ANNUAL, 10.0, "Full-Time");
        inactiveLeave.getLeaveType().setActive(false);
        JobRole retired = new JobRole();
        retired.setId(101L);
        retired.setJobTitle("Software Engineer");
        retired.setActive(false);
        retired.setDepartment(engineering);
        JobRoleLeaveAllocation retiredRole = allocation(2L, "Sick", JobRoleLeaveAllocation.Period.ANNUAL, 5.0, "Full-Time");
        retiredRole.setJobRole(retired);
        when(allocationRepo.findByCompanyIdAndDepartmentIdOrderByUpdatedAtDesc(1L, 10L))
                .thenReturn(List.of(inactiveLeave, retiredRole));

        assertTrue(service.getEntitlements(staff("Software Engineer", "Full-Time")).isEmpty());
    }

    @Test
    void getEntitlements_missingEmployeeDetailsGiveEmptyListWithoutQuerying() {
        assertTrue(service.getEntitlements(staff(null, "Full-Time")).isEmpty());
        assertTrue(service.getEntitlements(staff("Software Engineer", "  ")).isEmpty());

        Employee noDepartment = staff("Software Engineer", "Full-Time");
        noDepartment.setDepartment(null);
        assertTrue(service.getEntitlements(noDepartment).isEmpty());

        verifyNoInteractions(allocationRepo);
    }
}
