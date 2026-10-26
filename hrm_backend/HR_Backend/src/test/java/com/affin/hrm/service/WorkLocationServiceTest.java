package com.affin.hrm.service;

import com.affin.hrm.dto.WorkLocationDTO;
import com.affin.hrm.exception.BusinessException;
import com.affin.hrm.exception.ResourceNotFoundException;
import com.affin.hrm.model.Company;
import com.affin.hrm.model.Employee;
import com.affin.hrm.model.WorkLocation;
import com.affin.hrm.repository.WorkLocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkLocationServiceTest {

    private WorkLocationRepository repo;
    private AuditService auditService;
    private WorkLocationService service;

    private Company company;
    private Company otherCompany;
    private Employee hr;

    @BeforeEach
    void setUp() {
        repo = mock(WorkLocationRepository.class);
        auditService = mock(AuditService.class);
        service = new WorkLocationService(repo, auditService);

        company = new Company();
        company.setId(1L);
        otherCompany = new Company();
        otherCompany.setId(2L);

        hr = new Employee();
        hr.setId(99L);
        hr.setFullName("HR Person");
        hr.setEmail("hr@acme.test");
        hr.setCompany(company);

        when(repo.save(any(WorkLocation.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private WorkLocation location(Long id, String name, Company owner) {
        WorkLocation l = new WorkLocation();
        l.setId(id);
        l.setName(name);
        l.setCompany(owner);
        return l;
    }

    @Test
    void getWorkLocations_sortedById() {
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(
                List.of(location(3L, "Remote", company), location(1L, "Head Office", company)));

        List<WorkLocationDTO> result = service.getWorkLocations(1L);

        assertEquals(List.of(1L, 3L), result.stream().map(WorkLocationDTO::getId).toList());
        assertEquals("Head Office", result.get(0).getName());
    }

    @Test
    void createWorkLocations_trimsCollapsesAndSavesOwnerDetails() {
        List<WorkLocationDTO> result = service.createWorkLocations(List.of("  Head   Office ", "Remote"), hr);

        assertEquals(List.of("Head Office", "Remote"), result.stream().map(WorkLocationDTO::getName).toList());
        ArgumentCaptor<WorkLocation> captor = ArgumentCaptor.forClass(WorkLocation.class);
        verify(repo, times(2)).save(captor.capture());
        WorkLocation first = captor.getAllValues().get(0);
        assertSame(company, first.getCompany());
        assertTrue(first.getActive());
        assertEquals(99L, first.getCreatedById());
        assertEquals("HR Person", first.getCreatedByName());
    }

    @Test
    void createWorkLocations_blankNamesRejected() {
        List<String> names = new ArrayList<>();
        names.add("");
        names.add("   ");
        names.add(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.createWorkLocations(names, hr));
        assertEquals("Enter at least one work location", ex.getMessage());
        assertThrows(BusinessException.class, () -> service.createWorkLocations(null, hr));
        assertThrows(BusinessException.class, () -> service.createWorkLocations(List.of(), hr));
        verify(repo, never()).save(any());
    }

    @Test
    void createWorkLocations_duplicateOfExistingRejectedAndNothingSaved() {
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(location(1L, "Head Office", company)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.createWorkLocations(List.of("Remote", "HEAD  office"), hr));

        assertEquals("Already added: HEAD office", ex.getMessage());
        verify(repo, never()).save(any());
    }

    @Test
    void createWorkLocations_repeatsInRequestAreMerged() {
        List<WorkLocationDTO> result = service.createWorkLocations(List.of("Remote", "REMOTE", " remote "), hr);

        assertEquals(1, result.size());
        assertEquals("Remote", result.get(0).getName());
        verify(repo, times(1)).save(any(WorkLocation.class));
    }

    @Test
    void createWorkLocations_auditFailureDoesNotBlockCreation() {
        doThrow(new RuntimeException("audit down")).when(auditService)
                .logAction(anyString(), anyString(), any(), anyString(), any());

        assertEquals(1, service.createWorkLocations(List.of("Remote"), hr).size());
    }

    @Test
    void updateWorkLocation_renames() {
        WorkLocation head = location(1L, "Head Office", company);
        when(repo.findById(1L)).thenReturn(Optional.of(head));
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(head));

        WorkLocationDTO dto = service.updateWorkLocation(1L, "  HQ   Building ", hr);

        assertEquals("HQ Building", dto.getName());
        assertEquals("HQ Building", head.getName());
        verify(auditService).logAction(eq("UPDATE"), eq("WorkLocation"), eq(1L), anyString(), eq(1L));
    }

    @Test
    void updateWorkLocation_keepingOwnNameWithDifferentCaseIsAllowed() {
        WorkLocation head = location(1L, "head office", company);
        when(repo.findById(1L)).thenReturn(Optional.of(head));
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(head));

        assertEquals("Head Office", service.updateWorkLocation(1L, "Head Office", hr).getName());
    }

    @Test
    void updateWorkLocation_nameTakenByAnotherLocationRejected() {
        WorkLocation head = location(1L, "Head Office", company);
        WorkLocation remote = location(2L, "Remote", company);
        when(repo.findById(2L)).thenReturn(Optional.of(remote));
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(head, remote));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.updateWorkLocation(2L, "head office", hr));

        assertEquals("A work location named 'head office' already exists", ex.getMessage());
        assertEquals("Remote", remote.getName());
        verify(repo, never()).save(any());
    }

    @Test
    void updateWorkLocation_blankNameRejected() {
        when(repo.findById(1L)).thenReturn(Optional.of(location(1L, "Head Office", company)));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.updateWorkLocation(1L, "  ", hr));
        assertEquals("Work location name is required", ex.getMessage());
        assertThrows(BusinessException.class, () -> service.updateWorkLocation(1L, null, hr));
    }

    @Test
    void updateWorkLocation_lengthBoundary() {
        WorkLocation head = location(1L, "Head Office", company);
        when(repo.findById(1L)).thenReturn(Optional.of(head));
        when(repo.findByCompanyIdAndActive(1L, true)).thenReturn(List.of(head));

        String exactly100 = "x".repeat(100);
        assertEquals(exactly100, service.updateWorkLocation(1L, exactly100, hr).getName());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.updateWorkLocation(1L, "x".repeat(101), hr));
        assertEquals("Work location name must be at most 100 characters", ex.getMessage());
    }

    @Test
    void updateWorkLocation_missingOrOtherCompanyIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.updateWorkLocation(5L, "Anything", hr));

        when(repo.findById(6L)).thenReturn(Optional.of(location(6L, "Foreign", otherCompany)));
        assertThrows(ResourceNotFoundException.class, () -> service.updateWorkLocation(6L, "Anything", hr));
        verify(repo, never()).save(any());
    }

    @Test
    void deleteWorkLocation_deletesFlushesAndAudits() {
        WorkLocation head = location(1L, "Head Office", company);
        when(repo.findById(1L)).thenReturn(Optional.of(head));

        service.deleteWorkLocation(1L, hr);

        verify(repo).delete(head);
        verify(repo).flush();
        verify(auditService).logAction("DELETE", "WorkLocation", 1L, "Deleted work location: Head Office", 1L);
    }

    @Test
    void deleteWorkLocation_otherCompanyIsNotFoundAndNotDeleted() {
        when(repo.findById(6L)).thenReturn(Optional.of(location(6L, "Foreign", otherCompany)));

        assertThrows(ResourceNotFoundException.class, () -> service.deleteWorkLocation(6L, hr));
        verify(repo, never()).delete(any());
    }
}
