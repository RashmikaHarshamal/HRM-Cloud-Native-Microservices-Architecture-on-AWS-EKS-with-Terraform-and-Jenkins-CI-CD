package com.affin.hrm.Repo;

import com.affin.hrm.Model.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveTypeRepo extends JpaRepository<LeaveType, Long> {
    List<LeaveType> findByCompanyIdIsNullAndActive(Boolean active); // System-wide leave types
    List<LeaveType> findByCompanyIdAndActive(Long companyId, Boolean active);
    List<LeaveType> findByActive(Boolean active);
}
