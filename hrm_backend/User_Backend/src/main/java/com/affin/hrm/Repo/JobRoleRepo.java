package com.affin.hrm.Repo;

import com.affin.hrm.Model.JobRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRoleRepo extends JpaRepository<JobRole, Long> {
    List<JobRole> findByDepartmentId(Long departmentId);
}
