# HRM Tasks — 10 Step Commits Implementation Plan

## 10-Commit Execution Plan for Company Registration Request Feature

- [x] **Commit 1**: Backend Model Updates (`Company.java`, `CompanyDTO.java`, `CompanyRequestDTO.java` across backend services)
- [x] **Commit 2**: Public Company Request Controller & Repository in Backend (`PublicCompanyController.java` & save to DB as `PENDING`)
- [x] **Commit 3**: Admin In-App Notification System for New Applications (`NotificationService` trigger for system admins)
- [x] **Commit 4**: Email Service Implementation (`EmailService.java` for sending HTML/Text emails with SMTP & fallback logger)
- [x] **Commit 5**: Admin Approval Logic & HR Account Auto-Provisioning (`AdminService.approveCompany` generating `HR_MANAGER` account)
- [x] **Commit 6**: User Database (`hrm_db_user`) Synchronization with `companyId` & `companyName` (`SyncService` inter-service sync)
- [x] **Commit 7**: Admin Rejection Logic with Rejection Reason Email (`AdminService.rejectCompany`)
- [x] **Commit 8**: Frontend Hero Section "Request for Your Company" CTA Button (`hero.jsx`)
- [x] **Commit 9**: Frontend Public Company Registration Request Modal (`CompanyRequestModal.jsx`)
- [x] **Commit 10**: Frontend Admin Dashboard Integration & Real-time Approval/Rejection (`Companies.jsx` & header notification bell)
