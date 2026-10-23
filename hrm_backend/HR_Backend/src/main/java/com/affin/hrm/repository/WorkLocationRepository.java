package com.affin.hrm.repository;

import com.affin.hrm.model.WorkLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkLocationRepository extends JpaRepository<WorkLocation, Long> {
    List<WorkLocation> findByCompanyIdAndActive(Long companyId, Boolean active);
}
