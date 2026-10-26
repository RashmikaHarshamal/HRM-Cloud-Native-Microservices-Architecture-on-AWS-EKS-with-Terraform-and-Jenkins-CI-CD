package com.affin.hrm.service;

import com.affin.hrm.dto.LeaveApplicationDTO;
import com.affin.hrm.dto.LeaveBalanceDTO;
import com.affin.hrm.dto.LeaveEntitlementDTO;
import com.affin.hrm.dto.LeaveTypeDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.Company;
import com.affin.hrm.model.Employee;
import com.affin.hrm.model.LeaveApplication;
import com.affin.hrm.model.LeaveBalance;
import com.affin.hrm.model.Notification;
import com.affin.hrm.repository.CompanyRepository;
import com.affin.hrm.repository.LeaveApplicationRepository;
import com.affin.hrm.repository.LeaveBalanceRepository;
import com.affin.hrm.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.modelmapper.ModelMapper;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class LeaveServiceTest {

    private LeaveApplicationRepository leaveRepo;
    private LeaveBalanceRepository balanceRepo;
    private HrServiceClient hrServiceClient;
    private EmployeeDirectory employeeDirectory;
    private AuditService auditService;
    private NotificationService notificationService;
    private ModelMapper modelMapper;
    private LeaveService service;

    private Employee employee;
    private Employee hr;
    private LocalDate monday;

    @BeforeEach
    void setUp() {
        leaveRepo = mock(LeaveApplicationRepository.class);
        balanceRepo = mock(LeaveBalanceRepository.class);
        hrServiceClient = mock(HrServiceClient.class);
        employeeDirectory = mock(EmployeeDirectory.class);
        auditService = mock(AuditService.class);
        notificationService = mock(NotificationService.class);
        modelMapper = mock(ModelMapper.class);
        service = new LeaveService(leaveRepo, balanceRepo, hrServiceClient, employeeDirectory,
                mock(NotificationRepository.class), mock(CompanyRepository.class), modelMapper,
                auditService, notificationService);

        Company company = new Company();
        company.setId(1L);

        employee = new Employee();
        employee.setId(7L);
        employee.setEmail("ann@acme.test");
        employee.setFullName("Ann Perera");
        employee.setEmployeeId("SE001");
        employee.setCompany(company);

        hr = new Employee();
        hr.setId(2L);
        hr.setFullName("Hari HR");
        hr.setRole(Employee.Role.HR_MANAGER);
        hr.setCompany(company);

        // A Monday at least a week away, so Mon-Wed is always 3 working days
        monday = LocalDate.now().plusDays(7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(employeeDirectory.findById(2L)).thenReturn(Optional.of(hr));
        when(leaveRepo.save(any(LeaveApplication.class))).thenAnswer(inv -> {
            LeaveApplication l = inv.getArgument(0);
            if (l.getId() == null) l.setId(100L);
            return l;
        });
        when(balanceRepo.save(any(LeaveBalance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(modelMapper.map(any(), eq(LeaveApplicationDTO.class))).thenAnswer(inv -> new LeaveApplicationDTO());
        when(modelMapper.map(any(), eq(LeaveBalanceDTO.class))).thenAnswer(inv -> new LeaveBalanceDTO());
    }

    private LeaveEntitlementDTO entitlement(Long typeId, String name, int daysPerYear) {
        LeaveEntitlementDTO e = new LeaveEntitlementDTO();
        e.setLeaveTypeId(typeId);
        e.setLeaveTypeName(name);
        e.setDaysPerYear(daysPerYear);
        return e;
    }

    private LeaveApplicationDTO request(Long typeId, LocalDate start, LocalDate end) {
        LeaveApplicationDTO dto = new LeaveApplicationDTO();
        dto.setLeaveTypeId(typeId);
        dto.setStartDate(start);
        dto.setEndDate(end);
        dto.setReason("Family event");
        return dto;
    }

    private LeaveApplication pendingLeave() {
        LeaveApplication l = new LeaveApplication();
        l.setId(50L);
        l.setUserId(7L);
        l.setCompanyId(1L);
        l.setLeaveTypeId(1L);
        l.setLeaveTypeName("Annual");
        l.setStartDate(monday);
        l.setEndDate(monday.plusDays(2));
        l.setNumberOfDays(3);
        l.setStatus(LeaveApplication.LeaveStatus.PENDING);
        return l;
    }

    // ------ applyLeave ------

    @Test
    void applyLeave_happyPath_savesPendingLeaveAndNotifiesHr() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));

        LeaveApplicationDTO result = service.applyLeave(request(1L, monday, monday.plusDays(2)), 7L);

        ArgumentCaptor<LeaveApplication> captor = ArgumentCaptor.forClass(LeaveApplication.class);
        verify(leaveRepo).save(captor.capture());
        LeaveApplication saved = captor.getValue();
        assertEquals(7L, saved.getUserId());
        assertEquals(1L, saved.getCompanyId());
        assertEquals(1L, saved.getLeaveTypeId());
        assertEquals("Annual", saved.getLeaveTypeName());
        assertEquals(3, saved.getNumberOfDays());
        assertEquals(LeaveApplication.LeaveStatus.PENDING, saved.getStatus());
        assertEquals("PENDING", result.getStatus());
        assertEquals(7L, result.getEmployeeId());

        verify(notificationService).notifyHrManagers(eq(1L), eq("New Leave Request"), anyString(),
                eq(NotificationService.LEAVE_REQUEST), eq("/hr/leave?view=100"), eq(100L));
        verify(auditService).logAction("APPLY_LEAVE", "LeaveApplication", 100L, "Applied for leave", 1L);
    }

    @Test
    void applyLeave_weekendIsNotCountedAsWorkingDays() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));

        // Friday to Monday = 2 working days
        LocalDate friday = monday.plusDays(4);
        service.applyLeave(request(1L, friday, friday.plusDays(3)), 7L);

        ArgumentCaptor<LeaveApplication> captor = ArgumentCaptor.forClass(LeaveApplication.class);
        verify(leaveRepo).save(captor.capture());
        assertEquals(2, captor.getValue().getNumberOfDays());
    }

    @Test
    void applyLeave_employeeNotFound_throwsResourceNotFound() {
        when(employeeDirectory.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.applyLeave(request(1L, monday, monday), 99L));
    }

    @Test
    void applyLeave_leaveTypeNotAssigned_throwsBusinessException() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(2L, "Sick", 7)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, monday, monday), 7L));

        assertEquals("This leave type has not been assigned to your job role", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_endBeforeStart_throwsBusinessException() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, monday.plusDays(2), monday), 7L));

        assertEquals("End date cannot be before start date", ex.getMessage());
    }

    @Test
    void applyLeave_onlyWeekendDays_throwsBusinessException() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));
        LocalDate saturday = monday.plusDays(5);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, saturday, saturday.plusDays(1)), 7L));

        assertTrue(ex.getMessage().contains("weekend"));
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_overlappingLeave_throwsBusinessException() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));
        when(leaveRepo.findOverlappingLeaves(7L, monday, monday.plusDays(2))).thenReturn(List.of(pendingLeave()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, monday, monday.plusDays(2)), 7L));

        assertEquals("You already have a pending or approved leave on these dates", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_insufficientBalance_throwsBusinessException() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 2)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, monday, monday.plusDays(2)), 7L));

        assertEquals("Insufficient Annual balance. Available: 2 day(s), requested: 3", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_pendingDaysAreReservedAgainstBalance() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 5)));
        when(leaveRepo.sumPendingDays(eq(7L), eq(1L), anyInt())).thenReturn(3);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(1L, monday, monday.plusDays(2)), 7L));

        assertEquals("Insufficient Annual balance. Available: 2 day(s), requested: 3", ex.getMessage());
    }

    // ------ approveLeave ------

    @Test
    void approveLeave_happyPath_updatesBalanceAndNotifiesEmployee() {
        LeaveApplication leave = pendingLeave();
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));
        LeaveBalance balance = new LeaveBalance();
        balance.setTotalDays(14);
        balance.setUsedDays(2);
        balance.setRemainingDays(12);
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(7L), eq(1L), anyInt())).thenReturn(Optional.of(balance));

        LeaveApplicationDTO dto = service.approveLeave(50L, 2L);

        assertEquals(LeaveApplication.LeaveStatus.APPROVED, leave.getStatus());
        assertEquals(2L, leave.getApprovedByUserId());
        assertNotNull(leave.getApprovedAt());
        assertEquals(5, balance.getUsedDays());
        assertEquals(9, balance.getRemainingDays());
        assertEquals("APPROVED", dto.getStatus());
        verify(balanceRepo).save(balance);
        verify(notificationService).notifyUser(eq(7L), eq(1L), eq("Leave Approved"), anyString(),
                eq(Notification.NotificationType.LEAVE_APPROVAL), eq(NotificationService.LEAVE_APPROVED),
                eq("/employee/leave"), eq(50L));
        verify(auditService).logAction("APPROVE_LEAVE", "LeaveApplication", 50L, "Approved leave application", 1L);
    }

    @Test
    void approveLeave_leaveNotFound_throwsResourceNotFound() {
        when(leaveRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(50L, 2L));
    }

    @Test
    void approveLeave_approverFromAnotherCompany_throwsResourceNotFound() {
        Company other = new Company();
        other.setId(9L);
        hr.setCompany(other);
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(pendingLeave()));

        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(50L, 2L));
        verify(balanceRepo, never()).save(any());
    }

    @Test
    void approveLeave_notPending_throwsBusinessException() {
        LeaveApplication leave = pendingLeave();
        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.approveLeave(50L, 2L));

        assertEquals("Leave application is not in pending status", ex.getMessage());
        verify(balanceRepo, never()).save(any());
    }

    @Test
    void approveLeave_missingBalance_throwsResourceNotFound() {
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(pendingLeave()));
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(anyLong(), anyLong(), anyInt())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(50L, 2L));
    }

    // ------ rejectLeave ------

    @Test
    void rejectLeave_blankReason_throwsBusinessException() {
        BusinessException ex = assertThrows(BusinessException.class, () -> service.rejectLeave(50L, "   ", 2L));
        assertEquals("A comment is required to reject a leave request", ex.getMessage());
        assertThrows(BusinessException.class, () -> service.rejectLeave(50L, null, 2L));
        verifyNoInteractions(leaveRepo);
    }

    @Test
    void rejectLeave_happyPath_storesTrimmedReasonAndNotifies() {
        LeaveApplication leave = pendingLeave();
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));

        LeaveApplicationDTO dto = service.rejectLeave(50L, "  Team deadline  ", 2L);

        assertEquals(LeaveApplication.LeaveStatus.REJECTED, leave.getStatus());
        assertEquals("Team deadline", leave.getRejectionReason());
        assertEquals(2L, leave.getApprovedByUserId());
        assertEquals("REJECTED", dto.getStatus());
        verify(notificationService).notifyUser(eq(7L), eq(1L), eq("Leave Rejected"), anyString(),
                eq(Notification.NotificationType.LEAVE_REJECTION), eq(NotificationService.LEAVE_REJECTED),
                eq("/employee/leave"), eq(50L));
        verify(balanceRepo, never()).save(any());
    }

    @Test
    void rejectLeave_notPending_throwsBusinessException() {
        LeaveApplication leave = pendingLeave();
        leave.setStatus(LeaveApplication.LeaveStatus.CANCELLED);
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));

        assertThrows(BusinessException.class, () -> service.rejectLeave(50L, "No", 2L));
    }

    // ------ cancelLeave ------

    @Test
    void cancelLeave_ownPendingLeave_isCancelled() {
        LeaveApplication leave = pendingLeave();
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));

        service.cancelLeave(50L, 7L);

        assertEquals(LeaveApplication.LeaveStatus.CANCELLED, leave.getStatus());
        verify(leaveRepo).save(leave);
        verify(auditService).logAction("CANCEL_LEAVE", "LeaveApplication", 50L, "Cancelled leave application", 1L);
    }

    @Test
    void cancelLeave_someoneElsesLeave_throwsBusinessException() {
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(pendingLeave()));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.cancelLeave(50L, 8L));

        assertEquals("Unauthorized to cancel this leave", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void cancelLeave_alreadyApproved_throwsBusinessException() {
        LeaveApplication leave = pendingLeave();
        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        when(leaveRepo.findById(50L)).thenReturn(Optional.of(leave));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.cancelLeave(50L, 7L));

        assertEquals("Only pending leave can be cancelled", ex.getMessage());
    }

    @Test
    void cancelLeave_notFound_throwsResourceNotFound() {
        when(leaveRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.cancelLeave(50L, 7L));
    }

    // ------ queries ------

    @Test
    void getLeaveTypes_mapsHrEntitlements() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(entitlement(1L, "Annual", 14)));

        List<LeaveTypeDTO> types = service.getLeaveTypes(7L);

        assertEquals(1, types.size());
        assertEquals(1L, types.get(0).getId());
        assertEquals("Annual", types.get(0).getName());
        assertEquals(14, types.get(0).getDefaultDaysPerYear());
    }

    @Test
    void getEmployeeLeaveBalances_createsMissingBalancesSortedByLeaveType() {
        when(hrServiceClient.getLeaveEntitlements("ann@acme.test")).thenReturn(List.of(
                entitlement(2L, "Sick", 7), entitlement(1L, "Annual", 14)));

        List<LeaveBalanceDTO> balances = service.getEmployeeLeaveBalances(7L);

        assertEquals(2, balances.size());
        assertEquals(1L, balances.get(0).getLeaveTypeId());
        assertEquals("Annual", balances.get(0).getLeaveTypeName());
        assertEquals(2L, balances.get(1).getLeaveTypeId());
        assertEquals(7L, balances.get(0).getEmployeeId());
        assertEquals("Ann Perera", balances.get(0).getEmployeeName());
        verify(balanceRepo, times(2)).save(any(LeaveBalance.class));
    }

    @Test
    void getOnLeaveCount_delegatesToRepository() {
        LocalDate today = LocalDate.now();
        when(leaveRepo.countApprovedOnDate(1L, today)).thenReturn(4L);

        assertEquals(4L, service.getOnLeaveCount(1L, today));
    }
}
