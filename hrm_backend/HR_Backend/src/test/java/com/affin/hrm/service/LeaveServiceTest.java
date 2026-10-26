package com.affin.hrm.service;

import com.affin.hrm.dto.LeaveApplicationDTO;
import com.affin.hrm.dto.LeaveBalanceDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.Company;
import com.affin.hrm.model.Employee;
import com.affin.hrm.model.LeaveApplication;
import com.affin.hrm.model.LeaveBalance;
import com.affin.hrm.model.LeaveType;
import com.affin.hrm.model.Notification;
import com.affin.hrm.repository.CompanyRepository;
import com.affin.hrm.repository.LeaveApplicationRepository;
import com.affin.hrm.repository.LeaveBalanceRepository;
import com.affin.hrm.repository.LeaveTypeRepository;
import com.affin.hrm.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.mockito.ArgumentCaptor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LeaveServiceTest {

    private LeaveApplicationRepository leaveRepo;
    private LeaveBalanceRepository balanceRepo;
    private LeaveTypeRepository leaveTypeRepo;
    private EmployeeDirectory directory;
    private NotificationRepository notificationRepo;
    private CompanyRepository companyRepo;
    private ModelMapper modelMapper;
    private AuditService auditService;
    private LeaveService service;

    private Company company;
    private Employee employee;
    private Employee hr;
    private LeaveType annual;

    @BeforeEach
    void setUp() {
        leaveRepo = mock(LeaveApplicationRepository.class);
        balanceRepo = mock(LeaveBalanceRepository.class);
        leaveTypeRepo = mock(LeaveTypeRepository.class);
        directory = mock(EmployeeDirectory.class);
        notificationRepo = mock(NotificationRepository.class);
        companyRepo = mock(CompanyRepository.class);
        modelMapper = mock(ModelMapper.class);
        auditService = mock(AuditService.class);
        service = new LeaveService(leaveRepo, balanceRepo, leaveTypeRepo, directory, notificationRepo,
                companyRepo, modelMapper, auditService);

        company = new Company();
        company.setId(1L);

        employee = new Employee();
        employee.setId(5L);
        employee.setFullName("Alice Worker");
        employee.setEmployeeId("EMP-005");
        employee.setCompany(company);

        hr = new Employee();
        hr.setId(99L);
        hr.setFullName("HR Person");
        hr.setRole(Employee.Role.HR_MANAGER);
        hr.setCompany(company);

        annual = new LeaveType();
        annual.setId(2L);
        annual.setName("Annual Leave");
        annual.setDefaultDaysPerYear(14);

        when(directory.findById(5L)).thenReturn(Optional.of(employee));
        when(directory.findById(99L)).thenReturn(Optional.of(hr));
        when(directory.mapByIds(anyCollection())).thenReturn(Map.of());
        when(leaveTypeRepo.findById(2L)).thenReturn(Optional.of(annual));
        when(companyRepo.findById(1L)).thenReturn(Optional.of(company));
        when(modelMapper.map(any(LeaveApplication.class), eq(LeaveApplicationDTO.class)))
                .thenAnswer(inv -> new LeaveApplicationDTO());
        when(modelMapper.map(any(LeaveBalance.class), eq(LeaveBalanceDTO.class)))
                .thenAnswer(inv -> new LeaveBalanceDTO());
        when(leaveRepo.save(any(LeaveApplication.class))).thenAnswer(inv -> {
            LeaveApplication l = inv.getArgument(0);
            if (l.getId() == null) l.setId(77L);
            return l;
        });
    }

    /** A Monday safely in the future so the test never goes stale. */
    private LocalDate monday() {
        return LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusWeeks(1);
    }

    private LeaveApplicationDTO request(LocalDate start, LocalDate end) {
        LeaveApplicationDTO dto = new LeaveApplicationDTO();
        dto.setLeaveTypeId(2L);
        dto.setStartDate(start);
        dto.setEndDate(end);
        dto.setReason("Family trip");
        return dto;
    }

    private LeaveBalance balance(int total, int used) {
        LeaveBalance b = new LeaveBalance();
        b.setUserId(5L);
        b.setCompanyId(1L);
        b.setLeaveType(annual);
        b.setYear(LocalDate.now().getYear());
        b.setTotalDays(total);
        b.setUsedDays(used);
        b.setRemainingDays(total - used);
        return b;
    }

    private LeaveApplication pending(int days) {
        LeaveApplication l = new LeaveApplication();
        l.setId(40L);
        l.setUserId(5L);
        l.setCompanyId(1L);
        l.setLeaveType(annual);
        l.setStartDate(monday());
        l.setEndDate(monday().plusDays(days - 1));
        l.setNumberOfDays(days);
        l.setStatus(LeaveApplication.LeaveStatus.PENDING);
        return l;
    }

    // ------ applyLeave ---------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void applyLeave_countsOnlyWeekdaysAndCreatesPendingApplication() {
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(14, 0)));
        LocalDate start = monday();

        // Monday to the following Sunday: 5 weekdays
        LeaveApplicationDTO result = service.applyLeave(request(start, start.plusDays(6)), 5L);

        ArgumentCaptor<LeaveApplication> captor = ArgumentCaptor.forClass(LeaveApplication.class);
        verify(leaveRepo).save(captor.capture());
        LeaveApplication saved = captor.getValue();
        assertEquals(5, saved.getNumberOfDays());
        assertEquals(LeaveApplication.LeaveStatus.PENDING, saved.getStatus());
        assertEquals(5L, saved.getUserId());
        assertEquals(1L, saved.getCompanyId());
        assertEquals("Family trip", saved.getReason());

        assertEquals("PENDING", result.getStatus());
        assertEquals(5L, result.getEmployeeId());
        assertEquals(2L, result.getLeaveTypeId());
        assertEquals("Annual Leave", result.getLeaveTypeName());
        verify(auditService).logAction(eq("APPLY_LEAVE"), eq("LeaveApplication"), eq(77L), anyString(), eq(1L));
    }

    @Test
    void applyLeave_notifiesHr() {
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(14, 0)));

        service.applyLeave(request(monday(), monday()), 5L);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepo).save(captor.capture());
        Notification n = captor.getValue();
        assertEquals("New Leave Request", n.getTitle());
        assertEquals("Alice Worker has applied for Annual Leave", n.getMessage());
        assertEquals(Notification.NotificationType.LEAVE_APPROVAL, n.getType());
        assertSame(company, n.getCompany());
        assertNull(n.getUserId());
        assertFalse(n.getIsRead());
    }

    @Test
    void applyLeave_weekendOnlyRangeCountsZeroDays() {
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(14, 0)));
        LocalDate saturday = monday().minusDays(2);

        service.applyLeave(request(saturday, saturday.plusDays(1)), 5L);

        ArgumentCaptor<LeaveApplication> captor = ArgumentCaptor.forClass(LeaveApplication.class);
        verify(leaveRepo).save(captor.capture());
        assertEquals(0, captor.getValue().getNumberOfDays());
    }

    @Test
    void applyLeave_unknownEmployeeIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.applyLeave(request(monday(), monday()), 404L));
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_unknownLeaveTypeIsNotFound() {
        LeaveApplicationDTO dto = request(monday(), monday());
        dto.setLeaveTypeId(404L);

        assertThrows(ResourceNotFoundException.class, () -> service.applyLeave(dto, 5L));
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_overlappingApprovedLeaveRejected() {
        LocalDate start = monday();
        when(leaveRepo.findOverlappingLeaves(5L, start, start.plusDays(2))).thenReturn(List.of(pending(1)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(start, start.plusDays(2)), 5L));

        assertEquals("Leave request overlaps with existing approved leave", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_insufficientBalanceRejected() {
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(14, 12)));
        LocalDate start = monday();

        // 3 weekdays requested, 2 remaining
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.applyLeave(request(start, start.plusDays(2)), 5L));

        assertEquals("Insufficient leave balance. Available: 2 days", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void applyLeave_requestEqualToRemainingBalanceIsAllowed() {
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(14, 12)));
        LocalDate start = monday();

        service.applyLeave(request(start, start.plusDays(1)), 5L);

        verify(leaveRepo).save(any(LeaveApplication.class));
    }

    @Test
    void applyLeave_createsBalanceFromLeaveTypeDefaultWhenNoneExists() {
        LocalDate start = monday();

        service.applyLeave(request(start, start), 5L);

        ArgumentCaptor<LeaveBalance> captor = ArgumentCaptor.forClass(LeaveBalance.class);
        verify(balanceRepo).save(captor.capture());
        LeaveBalance created = captor.getValue();
        assertEquals(5L, created.getUserId());
        assertEquals(1L, created.getCompanyId());
        assertEquals(14, created.getTotalDays());
        assertEquals(0, created.getUsedDays());
        assertEquals(14, created.getRemainingDays());
        assertEquals(LocalDate.now().getYear(), created.getYear());
    }

    // ------ approveLeave ---------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void approveLeave_updatesStatusAndBalance() {
        LeaveApplication leave = pending(3);
        LeaveBalance balance = balance(10, 1);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt())).thenReturn(Optional.of(balance));

        LeaveApplicationDTO result = service.approveLeave(40L, 99L);

        assertEquals(LeaveApplication.LeaveStatus.APPROVED, leave.getStatus());
        assertEquals(99L, leave.getApprovedByUserId());
        assertNotNull(leave.getApprovedAt());
        assertEquals(4, balance.getUsedDays());
        assertEquals(6, balance.getRemainingDays());
        verify(balanceRepo).save(balance);
        assertEquals("APPROVED", result.getStatus());
        assertEquals(99L, result.getApprovedBy());

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepo).save(captor.capture());
        assertEquals("Leave Approved", captor.getValue().getTitle());
        assertEquals(5L, captor.getValue().getUserId());
    }

    @Test
    void approveLeave_nonPendingRejected() {
        LeaveApplication leave = pending(1);
        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.approveLeave(40L, 99L));

        assertEquals("Leave application is not in pending status", ex.getMessage());
        verify(balanceRepo, never()).save(any());
    }

    @Test
    void approveLeave_unknownLeaveOrApproverIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(404L, 99L));

        when(leaveRepo.findById(40L)).thenReturn(Optional.of(pending(1)));
        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(40L, 404L));
    }

    @Test
    void approveLeave_hrFromAnotherCompanyReadsAsNotFound() {
        Company other = new Company();
        other.setId(2L);
        hr.setCompany(other);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(pending(1)));

        assertThrows(ResourceNotFoundException.class, () -> service.approveLeave(40L, 99L));
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void approveLeave_adminMayApproveAcrossCompanies() {
        hr.setRole(Employee.Role.ADMIN);
        hr.setCompany(null);
        LeaveApplication leave = pending(1);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));
        when(balanceRepo.findByUserIdAndLeaveTypeIdAndYear(eq(5L), eq(2L), anyInt()))
                .thenReturn(Optional.of(balance(10, 0)));

        service.approveLeave(40L, 99L);

        assertEquals(LeaveApplication.LeaveStatus.APPROVED, leave.getStatus());
    }

    @Test
    void approveLeave_missingBalanceIsNotFound() {
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(pending(1)));

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.approveLeave(40L, 99L));
        assertEquals("LeaveBalance not found", ex.getMessage());
    }

    // ------ rejectLeave ------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void rejectLeave_setsReasonAndNotifiesEmployee() {
        LeaveApplication leave = pending(2);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));

        LeaveApplicationDTO result = service.rejectLeave(40L, "Busy period", 99L);

        assertEquals(LeaveApplication.LeaveStatus.REJECTED, leave.getStatus());
        assertEquals("Busy period", leave.getRejectionReason());
        assertEquals(99L, leave.getApprovedByUserId());
        assertEquals("REJECTED", result.getStatus());
        verify(balanceRepo, never()).save(any());

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepo).save(captor.capture());
        assertEquals(Notification.NotificationType.LEAVE_REJECTION, captor.getValue().getType());
        assertEquals("Your leave request has been rejected. Reason: Busy period", captor.getValue().getMessage());
    }

    @Test
    void rejectLeave_nonPendingRejected() {
        LeaveApplication leave = pending(1);
        leave.setStatus(LeaveApplication.LeaveStatus.CANCELLED);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));

        assertThrows(BusinessException.class, () -> service.rejectLeave(40L, "No", 99L));
        verify(leaveRepo, never()).save(any());
    }

    // ------ cancelLeave ------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void cancelLeave_ownPendingLeaveIsCancelled() {
        LeaveApplication leave = pending(1);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));

        service.cancelLeave(40L, 5L);

        assertEquals(LeaveApplication.LeaveStatus.CANCELLED, leave.getStatus());
        verify(leaveRepo).save(leave);
        verify(auditService).logAction("CANCEL_LEAVE", "LeaveApplication", 40L, "Cancelled leave application", 1L);
    }

    @Test
    void cancelLeave_someoneElsesLeaveRejected() {
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(pending(1)));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.cancelLeave(40L, 6L));
        assertEquals("Unauthorized to cancel this leave", ex.getMessage());
        verify(leaveRepo, never()).save(any());
    }

    @Test
    void cancelLeave_onlyPendingCanBeCancelled() {
        LeaveApplication leave = pending(1);
        leave.setStatus(LeaveApplication.LeaveStatus.APPROVED);
        when(leaveRepo.findById(40L)).thenReturn(Optional.of(leave));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.cancelLeave(40L, 5L));
        assertEquals("Only pending leave can be cancelled", ex.getMessage());
    }

    @Test
    void cancelLeave_unknownLeaveIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.cancelLeave(404L, 5L));
    }

    // ------ queries ------------------------------------------------------------------------------------------------------------------------------------------------------

    @Test
    void getPendingLeaves_mapsEachApplicationWithEmployeeDetails() {
        when(leaveRepo.findByCompanyIdAndStatus(1L, LeaveApplication.LeaveStatus.PENDING))
                .thenReturn(List.of(pending(2)));
        when(directory.mapByIds(anyCollection())).thenReturn(Map.of(5L, employee));

        List<LeaveApplicationDTO> result = service.getPendingLeaves(1L);

        assertEquals(1, result.size());
        assertEquals("Alice Worker", result.get(0).getEmployeeName());
        assertEquals("EMP-005", result.get(0).getEmployeeIdNumber());
        assertEquals("PENDING", result.get(0).getStatus());
    }

    @Test
    void getEmployeeLeaves_emptyWhenNoApplications() {
        assertTrue(service.getEmployeeLeaves(5L).isEmpty());
    }

    @Test
    void getEmployeeLeaveBalances_returnsExistingBalances() {
        LeaveBalance b = balance(14, 4);
        when(balanceRepo.findByUserIdAndYear(eq(5L), anyInt())).thenReturn(List.of(b));
        when(directory.mapByIds(anyCollection())).thenReturn(Map.of(5L, employee));

        List<LeaveBalanceDTO> result = service.getEmployeeLeaveBalances(5L);

        assertEquals(1, result.size());
        assertEquals("Alice Worker", result.get(0).getEmployeeName());
        assertEquals(5L, result.get(0).getEmployeeId());
        assertEquals("Annual Leave", result.get(0).getLeaveTypeName());
        verify(balanceRepo, never()).save(any());
    }

    @Test
    void getEmployeeLeaveBalances_initialisesFromActiveLeaveTypesWhenNoneExist() {
        LeaveBalance created = balance(14, 0);
        when(balanceRepo.findByUserIdAndYear(eq(5L), anyInt()))
                .thenReturn(List.of())
                .thenReturn(List.of(created));
        when(leaveTypeRepo.findByActive(true)).thenReturn(List.of(annual));

        List<LeaveBalanceDTO> result = service.getEmployeeLeaveBalances(5L);

        assertEquals(1, result.size());
        ArgumentCaptor<LeaveBalance> captor = ArgumentCaptor.forClass(LeaveBalance.class);
        verify(balanceRepo).save(captor.capture());
        assertEquals(14, captor.getValue().getTotalDays());
    }

    @Test
    void getEmployeeLeaveBalances_unknownEmployeeWithNoBalancesIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.getEmployeeLeaveBalances(404L));
    }
}
