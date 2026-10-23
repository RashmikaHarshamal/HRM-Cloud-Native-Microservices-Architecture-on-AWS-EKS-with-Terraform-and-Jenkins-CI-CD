package com.affin.hrm.repository;

import com.affin.hrm.model.AllowanceRequestDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AllowanceRequestDocumentRepository extends JpaRepository<AllowanceRequestDocument, Long> {
    Optional<AllowanceRequestDocument> findByAllowanceRequestId(Long allowanceRequestId);
}
