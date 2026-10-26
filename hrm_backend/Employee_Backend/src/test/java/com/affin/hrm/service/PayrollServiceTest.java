package com.affin.hrm.service;

import com.affin.hrm.dto.PaySheetDTO;
import com.affin.hrm.dto.PayslipDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.Attendance;
import com.affin.hrm.model.Employee;
import com.affin.hrm.model.Notification;
import com.affin.hrm.model.Payslip;
import com.affin.hrm.model.Salary;
import com.affin.hrm.repository.AttendanceRepository;
import com.affin.hrm.repository.NotificationRepository;
import com.affin.hrm.repository.PayslipRepository;
import com.affin.hrm.repository.SalaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PayrollServiceTest {

    private EmployeeDirectory employeeDirectory;
    private PayslipRepository payslipRepository;
    private SalaryRepository salaryRepository;
    private AttendanceRepository attendanceRepository;
    private HrServiceClient hrServiceClient;
    private NotificationRepository notificationRepository;
    private PayrollService service;
    private Employee employee;

    @BeforeEach
    void setUp() {
        employeeDirectory = mock(EmployeeDirectory.class);
        payslipRepository = mock(PayslipRepository.class);
        salaryRepository = mock(SalaryRepository.class);
        attendanceRepository = mock(AttendanceRepository.class);
        hrServiceClient = mock(HrServiceClient.class);
        notificationRepository = mock(NotificationRepository.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());

        service = new PayrollService(employeeDirectory, payslipRepository, salaryRepository,
                attendanceRepository, hrServiceClient, notificationRepository, txManager);

        employee = new Employee();
        employee.setId(7L);
        employee.setEmail("ann@acme.test");
        employee.setFullName("Ann Perera");
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);

        when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));
        when(salaryRepository.save(any(Salary.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private PaySheetDTO configuredSheet() {
        PaySheetDTO sheet = new PaySheetDTO();
        sheet.setConfigured(true);
        sheet.setBasicSalary(new BigDecimal("50000.00"));
        sheet.setTotalAllowance(new BigDecimal("5000.00"));
        sheet.setTotalDeduction(new BigDecimal("2000.00"));
        sheet.setNetTotal(new BigDecimal("53000.00"));
        return sheet;
    }

    private List<Attendance> attendances(int count, Attendance.AttendanceStatus status) {
        List<Attendance> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Attendance a = new Attendance();
            a.setStatus(status);
            list.add(a);
        }
        return list;
    }

    private Payslip payslip(Long id, int month, int year) {
        Payslip p = new Payslip();
        p.setId(id);
        p.setUserId(7L);
        p.setMonth(month);
        p.setYear(year);
        p.setBasicSalary(new BigDecimal("1000.00"));
        p.setGrossSalary(new BigDecimal("1000.00"));
        p.setNetSalary(new BigDecimal("1000.00"));
        return p;
    }

    @Test
    void generatePayslip_employeeNotFound_throwsResourceNotFound() {
        when(employeeDirectory.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.generatePayslip(99L, 3, 2025));
        verify(payslipRepository, never()).save(any());
    }

    @Test
    void generatePayslip_usesHrPaySheetAmountsAndCountsPresentDays() {
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(configuredSheet()));
        List<Attendance> present = attendances(3, Attendance.AttendanceStatus.PRESENT);
        present.addAll(attendances(2, Attendance.AttendanceStatus.ABSENT));
        when(attendanceRepository.findByUserIdAndDateBetween(eq(7L), any(), any())).thenReturn(present);

        Payslip result = service.generatePayslip(7L, 3, 2025);

        assertEquals(7L, result.getUserId());
        assertEquals(3, result.getMonth());
        assertEquals(2025, result.getYear());
        assertEquals(0, new BigDecimal("50000").compareTo(result.getBasicSalary()));
        assertEquals(0, new BigDecimal("55000").compareTo(result.getGrossSalary()));
        assertEquals(0, new BigDecimal("53000").compareTo(result.getNetSalary()));
        assertEquals(22, result.getWorkingDays());
        assertEquals(3, result.getPresentDays());
        assertEquals(19, result.getAbsentDays());
        assertEquals(Payslip.PayslipStatus.PAID, result.getStatus());
        verify(salaryRepository, never()).findByUserId(anyLong());
    }

    @Test
    void generatePayslip_unconfiguredPaySheetFallsBackToDefaultSalary() {
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(new PaySheetDTO()));
        when(salaryRepository.findByUserId(7L)).thenReturn(Optional.empty());

        Payslip result = service.generatePayslip(7L, 3, 2025);

        // default salary: basic 50000, allowances 10000, deductions 3000; no attendance => full month
        assertEquals(0, new BigDecimal("50000").compareTo(result.getBasicSalary()));
        assertEquals(0, new BigDecimal("10000").compareTo(result.getTotalAllowances()));
        assertEquals(0, new BigDecimal("3000").compareTo(result.getTotalDeductions()));
        assertEquals(0, new BigDecimal("60000").compareTo(result.getGrossSalary()));
        assertEquals(0, new BigDecimal("57000").compareTo(result.getNetSalary()));
        assertEquals(22, result.getPresentDays());
        assertEquals(0, result.getAbsentDays());
        verify(salaryRepository).save(any(Salary.class));
    }

    @Test
    void generatePayslip_existingSalary_deductsForAbsentDays() {
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        Salary salary = new Salary();
        salary.setBasicSalary(new BigDecimal("22000.00"));
        salary.setTax(new BigDecimal("100.00"));
        salary.setProvidentFund(new BigDecimal("200.00"));
        when(salaryRepository.findByUserId(7L)).thenReturn(Optional.of(salary));
        List<Attendance> list = attendances(20, Attendance.AttendanceStatus.PRESENT);
        list.addAll(attendances(1, Attendance.AttendanceStatus.LATE));
        when(attendanceRepository.findByUserIdAndDateBetween(eq(7L), any(), any())).thenReturn(list);

        Payslip result = service.generatePayslip(7L, 3, 2025);

        // 20 PRESENT of 22 working days => 2 absent at 22000/22 = 1000 each
        assertEquals(20, result.getPresentDays());
        assertEquals(2, result.getAbsentDays());
        assertEquals(0, new BigDecimal("2300").compareTo(result.getTotalDeductions()));
        assertEquals(0, new BigDecimal("22000").compareTo(result.getGrossSalary()));
        assertEquals(0, new BigDecimal("19700").compareTo(result.getNetSalary()));
        verify(salaryRepository, never()).save(any());
    }

    @Test
    void getOrCreatePayslip_existingPayslipIsReturnedWithoutGenerating() {
        Payslip existing = payslip(1L, 3, 2025);
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.of(existing));

        Payslip result = service.getOrCreatePayslip(7L, 3, 2025);

        assertSame(existing, result);
        verify(payslipRepository, never()).save(any());
        verifyNoInteractions(employeeDirectory);
    }

    @Test
    void getOrCreatePayslip_missingPayslipIsGenerated() {
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.empty());
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(configuredSheet()));

        Payslip result = service.getOrCreatePayslip(7L, 3, 2025);

        assertEquals(0, new BigDecimal("53000").compareTo(result.getNetSalary()));
        verify(payslipRepository).save(any(Payslip.class));
    }

    @Test
    void getEmployeePayslipDTOs_sortedNewestFirst() {
        when(payslipRepository.findByUserId(7L)).thenReturn(List.of(
                payslip(1L, 3, 2025), payslip(2L, 1, 2026), payslip(3L, 12, 2025)));

        List<PayslipDTO> result = service.getEmployeePayslipDTOs(7L);

        assertEquals(3, result.size());
        assertEquals(2L, result.get(0).getId());
        assertEquals(3L, result.get(1).getId());
        assertEquals(1L, result.get(2).getId());
    }

    @Test
    void toDTO_mapsFieldsAndHandlesNullStatus() {
        Payslip p = payslip(5L, 4, 2025);
        p.setStatus(null);
        p.setPresentDays(20);

        PayslipDTO dto = PayrollService.toDTO(p);

        assertEquals(5L, dto.getId());
        assertEquals(7L, dto.getEmployeeId());
        assertEquals(4, dto.getMonth());
        assertEquals(2025, dto.getYear());
        assertEquals(20, dto.getPresentDays());
        assertNull(dto.getStatus());

        p.setStatus(Payslip.PayslipStatus.PAID);
        assertEquals("PAID", PayrollService.toDTO(p).getStatus());
    }

    @Test
    void sendPayslipByEmail_unknownEmail_throwsResourceNotFound() {
        when(employeeDirectory.findByEmailIgnoreCase("nobody@acme.test")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.sendPayslipByEmail("nobody@acme.test", 3, 2025));
    }

    @Test
    void sendPayslipByEmail_noSalaryConfigured_throwsBusinessException() {
        when(employeeDirectory.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(employee));
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.empty());
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(new PaySheetDTO()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.sendPayslipByEmail("ann@acme.test", 3, 2025));

        assertTrue(ex.getMessage().contains("Ann Perera"));
        verify(payslipRepository, never()).save(any());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void sendPayslipByEmail_newPayslip_isPaidAndEmployeeNotified() {
        when(employeeDirectory.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(employee));
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.empty());
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(configuredSheet()));

        PayslipDTO dto = service.sendPayslipByEmail("ann@acme.test", 3, 2025);

        assertEquals("PAID", dto.getStatus());
        assertEquals(0, new BigDecimal("53000").compareTo(dto.getNetSalary()));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertEquals(7L, n.getUserId());
        assertEquals("Payslip available", n.getTitle());
        assertEquals(Notification.NotificationType.PAYROLL, n.getType());
        assertEquals(NotificationService.PAYSLIP, n.getCategory());
        assertTrue(n.getMessage().contains("March 2025"));
        assertTrue(n.getMessage().contains("53000.00"));
    }

    @Test
    void sendPayslipByEmail_existingPayslip_isRefreshedFromPaySheetAndMarkedPaid() {
        Payslip existing = payslip(1L, 3, 2025);
        existing.setStatus(Payslip.PayslipStatus.GENERATED);
        when(employeeDirectory.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(employee));
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.of(existing));
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(configuredSheet()));

        PayslipDTO dto = service.sendPayslipByEmail("ann@acme.test", 3, 2025);

        assertEquals(1L, dto.getId());
        assertEquals("PAID", dto.getStatus());
        assertEquals(0, new BigDecimal("50000").compareTo(existing.getBasicSalary()));
        assertEquals(0, new BigDecimal("53000").compareTo(existing.getNetSalary()));
        // an explicit send always notifies, even for an existing payslip
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void generateBulkPayrollForEmails_skipsUnknownInactiveBlankAndDuplicates() {
        Employee inactive = new Employee();
        inactive.setId(8L);
        inactive.setEmail("bob@acme.test");
        inactive.setStatus(Employee.EmployeeStatus.INACTIVE);
        when(employeeDirectory.findByEmailIgnoreCase("ghost@acme.test")).thenReturn(Optional.empty());
        when(employeeDirectory.findByEmailIgnoreCase("bob@acme.test")).thenReturn(Optional.of(inactive));

        List<String> emails = new ArrayList<>();
        emails.add("ghost@acme.test");
        emails.add("GHOST@acme.test");
        emails.add(" ");
        emails.add(null);
        emails.add("bob@acme.test");
        PayrollService.BulkResult result = service.generateBulkPayrollForEmails(emails, 3, 2025);

        assertTrue(result.getGenerated().isEmpty());
        assertEquals(2, result.getSkipped().size());
        assertEquals("ghost@acme.test", result.getSkipped().get(0).get("employee"));
        assertEquals("Not found in the user service", result.getSkipped().get(0).get("reason"));
        assertEquals("bob@acme.test", result.getSkipped().get(1).get("employee"));
        assertEquals("Employee is not active", result.getSkipped().get(1).get("reason"));
    }

    @Test
    void generateBulkPayrollForEmails_missingSalaryIsSkippedAndConfiguredIsGenerated() {
        Employee noSalary = new Employee();
        noSalary.setId(8L);
        noSalary.setEmail("bob@acme.test");
        noSalary.setFullName("Bob");
        noSalary.setStatus(Employee.EmployeeStatus.ACTIVE);
        when(employeeDirectory.findByEmailIgnoreCase("ann@acme.test")).thenReturn(Optional.of(employee));
        when(employeeDirectory.findByEmailIgnoreCase("bob@acme.test")).thenReturn(Optional.of(noSalary));
        when(employeeDirectory.findById(7L)).thenReturn(Optional.of(employee));
        when(payslipRepository.findByUserIdAndMonthAndYear(anyLong(), eq(3), eq(2025))).thenReturn(Optional.empty());
        when(hrServiceClient.findPaySheet("ann@acme.test")).thenReturn(Optional.of(configuredSheet()));
        when(hrServiceClient.findPaySheet("bob@acme.test")).thenReturn(Optional.empty());

        PayrollService.BulkResult result = service.generateBulkPayrollForEmails(
                List.of("ann@acme.test", "bob@acme.test"), 3, 2025);

        assertEquals(1, result.getGenerated().size());
        assertEquals(7L, result.getGenerated().get(0).getEmployeeId());
        assertEquals(1, result.getSkipped().size());
        assertEquals("bob@acme.test", result.getSkipped().get(0).get("employee"));
        assertTrue(result.getSkipped().get(0).get("reason").contains("No salary is set up"));
    }

    @Test
    void generateBulkPayroll_onlyActiveEmployeesGetPayslips() {
        Employee inactive = new Employee();
        inactive.setId(8L);
        inactive.setStatus(Employee.EmployeeStatus.TERMINATED);
        when(employeeDirectory.findByCompanyId(1L)).thenReturn(List.of(employee, inactive));
        Payslip existing = payslip(1L, 3, 2025);
        when(payslipRepository.findByUserIdAndMonthAndYear(7L, 3, 2025)).thenReturn(Optional.of(existing));

        List<Payslip> result = service.generateBulkPayroll(1L, 3, 2025);

        assertEquals(1, result.size());
        assertSame(existing, result.get(0));
        verify(payslipRepository, never()).findByUserIdAndMonthAndYear(eq(8L), any(), any());
    }
}
