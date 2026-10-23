package com.affin.hrm.repository;

import com.affin.hrm.model.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {
    List<LeaveType> findByActive(Boolean active);
    List<LeaveType> findByCompanyIdIsNullAndActive(Boolean active);
    List<LeaveType> findByCompanyIdAndActive(Long companyId, Boolean active);
}
