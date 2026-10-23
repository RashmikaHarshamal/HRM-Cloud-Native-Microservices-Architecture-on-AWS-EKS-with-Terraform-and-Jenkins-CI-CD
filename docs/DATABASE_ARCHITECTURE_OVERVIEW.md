# 🌐 HRM System Architecture & Company Approval Process Guide

This document outlines the **4 Microservices Architecture** for the HRM platform, specifying database ownership, the complete company registration review workflow, HR Manager account provisioning, automated email notifications, and forced password change security.

---

## 🏛️ System Overview & Microservice Responsibilities

```mermaid
flowchart TB
    subgraph Frontend["💻 HRM React Frontend (Port 5173)"]
        UI_Public["Public Landing & Request Form (/login, /createaccount)"]
        UI_Admin["Admin Portal (/admin/*)"]
        UI_HR["HR Manager Portal (/hr/*)"]
        UI_Emp["Employee Portal (/employee/*)"]
    end

    subgraph Service_Admin["1️⃣ Admin Service (Port 5007) — Authority for Companies & Approvals"]
        AdminBackend["Admin_Backend\n(Company Requests, Approvals, Email, Audits)"]
        DB_Admin[("hrm_db_admin\nPostgreSQL\n(companies, audit_logs, system_config)")]
        AdminBackend --- DB_Admin
    end

    subgraph Service_User["2️⃣ User Service (Port 5002) — Authority for Auth & Credentials"]
        UserBackend["User_Backend\n(Authentication, Security, Passwords)"]
        DB_User[("hrm_db_user\nPostgreSQL\n(employees/users, session_logs)")]
        UserBackend --- DB_User
    end

    subgraph Service_HR["3️⃣ HR Service (Port 5005) — Authority for HR Operations"]
        HRBackend["HR_Backend\n(Departments, Payroll Policy, Salaries)"]
        DB_HR[("hrm_db_hr\nPostgreSQL\n(departments, basic_payments, leave_types)")]
        HRBackend --- DB_HR
    end

    subgraph Service_Emp["4️⃣ Employee Service (Port 5006) — Authority for Daily Activities"]
        EmployeeBackend["Employee_Backend\n(Attendance, Leaves, Allowances)"]
        DB_Emp[("hrm_db_employee\nPostgreSQL\n(attendance, leave_applications, allowances)")]
        EmployeeBackend --- DB_Emp
    end

    %% Routing
    UI_Public -->|1. Submit Company Request| AdminBackend
    UI_Admin -->|2. Review & Approve / Reject| AdminBackend
    AdminBackend -->|3. Provision HR Account| UserBackend
    AdminBackend -->|4. Send Approval Credentials Email| UI_Public
    UI_Public -->|5. Login & Force Password Change| UserBackend
    UI_HR -->|HR Operations| HRBackend
    UI_Emp -->|Clock In & Leaves| EmployeeBackend

    %% Inter-service Sync
    AdminBackend -->|Sync Approved Companies| HRBackend
    AdminBackend -->|Sync Approved Companies| EmployeeBackend
    UserBackend -->|Sync HR/Employee Profiles| HRBackend
    UserBackend -->|Sync HR/Employee Profiles| EmployeeBackend
```

---

## 🔄 Sequence Diagram: Company Application to HR Login

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Representative
    participant PublicUI as Frontend / Public Form
    participant AdminApp as Admin_Backend (5007)
    participant DBAdmin as hrm_db_admin
    participant UserApp as User_Backend (5002)
    participant DBUser as hrm_db_user
    participant EmailEng as Admin EmailService

    Client->>PublicUI: Fill Company Registration Request Form
    PublicUI->>AdminApp: POST /api/admin/company-requests (Status: PENDING)
    AdminApp->>DBAdmin: Save Company Record (Status: PENDING)
    
    Note over AdminApp,DBAdmin: System Admin Reviews Request in Admin Portal
    
    alt Admin APPROVES Company
        AdminApp->>DBAdmin: Update Company Status to APPROVED
        AdminApp->>UserApp: POST /api/sync/provision-hr (Email, TempPassword, CompanyId)
        UserApp->>DBUser: Create HR Manager Account (role=HR_MANAGER, mustChangePassword=true)
        AdminApp->>EmailEng: Trigger Approval Welcome Email
        EmailEng-->>Client: 📧 Email with Login URL, HR Email, Temp Password, Change Password Warning
        
        Client->>PublicUI: Sign in at /login using Temp Credentials
        PublicUI->>UserApp: POST /api/auth/login
        UserApp-->>PublicUI: Auth Response (mustChangePassword = true)
        PublicUI->>Client: Prompt Force Password Change Screen
        Client->>PublicUI: Submit New Password
        PublicUI->>UserApp: POST /api/auth/change-password
        UserApp->>DBUser: Update Password & set mustChangePassword = false
        UserApp-->>PublicUI: Password Updated -> Redirect to HR Dashboard
    else Admin REJECTS Company
        AdminApp->>DBAdmin: Update Company Status to REJECTED + Rejection Reason
        AdminApp->>EmailEng: Trigger Rejection Email with Reason
        EmailEng-->>Client: 📧 Email with Rejection Reason & Support Contact
    end
```

---

## 💾 Database Ownership & Table Schema Matrix

| Database Name | Owning Microservice | Tables Managed | Description & Primary Use Case |
| :--- | :--- | :--- | :--- |
| **`hrm_db_admin`** | **`Admin_Backend`** (Port 5007) | `companies`<br>`audit_logs`<br>`system_configurations` | **Authority for Client Companies**: Stores all company registration requests (PENDING, APPROVED, REJECTED), rejection reasons, system audit logs, and configuration parameters. |
| **`hrm_db_user`** | **`User_Backend`** (Port 5002) | `employees` / `users`<br>`session_logs` | **Authority for Credentials & Auth**: Manages user accounts (`EMPLOYEE`, `HR_MANAGER`, `ADMIN`), hashed BCrypt passwords, `must_change_password` flag, and active login sessions. |
| **`hrm_db_hr`** | **`HR_Backend`** (Port 5005) | `departments`<br>`basic_payments`<br>`additional_payments`<br>`leave_types`<br>`work_locations` | **Authority for HR Operations**: Manages company departments, job role pay structures, leave allocations, work locations, and employment types. |
| **`hrm_db_employee`** | **`Employee_Backend`** (Port 5006) | `attendance`<br>`leave_applications`<br>`allowance_requests`<br>`notifications` | **Authority for Daily Activities**: Stores employee clock-in/out timestamps, leave requests, allowance submissions, and employee notifications. |

---

## 📋 Implementation Checklist for Restructuring

Below is the structured task breakdown to be executed upon finalization:

1. **`Admin_Backend` (`hrm_db_admin`)**:
   - Move/Ensure `Company` entity and repository exist inside `Admin_Backend`.
   - Store all public registration submissions directly into `hrm_db_admin.companies` as `PENDING`.
   - Handle Admin Dashboard company tabs: **Pending Applications**, **Approved Companies**, **Rejected Applications** (with reasons), and **Company Members**.

2. **`User_Backend` (`hrm_db_user`)**:
   - Implement `/api/sync/provision-hr` endpoint to receive HR Manager account provisioning details from `Admin_Backend`.
   - Save HR Manager user with `mustChangePassword = true`.
   - Maintain `changePassword` endpoint to clear `mustChangePassword = false` upon first password update.

3. **Email Delivery (`Admin_Backend`)**:
   - `EmailService` in `Admin_Backend` formats and sends approval welcome email containing login link, HR email, generated temporary password, and force password change instructions.

4. **Inter-Service Sync**:
   - Sync approved company details from `Admin_Backend` to `HR_Backend` (`hrm_db_hr`) and `Employee_Backend` (`hrm_db_employee`).
