package com.affin.hrm.Repo;

import com.affin.hrm.Model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SalaryRepo extends JpaRepository<Salary, Long> {
    Optional<Salary> findByEmployeeId(Long employeeId);
    void deleteByEmployeeId(Long employeeId);
}
