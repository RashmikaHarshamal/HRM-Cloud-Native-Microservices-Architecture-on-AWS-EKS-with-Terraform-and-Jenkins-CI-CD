package com.affin.hrm.repository;

import com.affin.hrm.model.EmploymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmploymentTypeRepository extends JpaRepository<EmploymentType, Long> {
    List<EmploymentType> findByCompanyIdAndActive(Long companyId, Boolean active);
}
