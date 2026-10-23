# HRM — API Documentation

All endpoints return the standard `ApiResponse` wrapper:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Authentication

### POST `/api/auth/login`
**Service**: User_Backend (Port 5002) or Employee_Backend (Port 5003)

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | ✓        |
| `password` | string | ✓        |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "EMPLOYEE",
    "companyId": 1,
    "id": 5
  }
}
```

### POST `/api/auth/register`

| Field        | Type   | Required |
|--------------|--------|----------|
| `fullName`   | string | ✓        |
| `email`      | string | ✓        |
| `password`   | string | ✓ (min 6 chars) |
| `phone`      | string |          |
| `nic`        | string |          |
| `gender`     | string |          |
| `designation`| string |          |
| `department` | string |          |
| `joiningDate`| date   |          |

### GET `/api/auth/check-user/{email}`
Check if a user exists by email.

### GET `/api/auth/me`
Get the currently authenticated user's info. Requires `Authorization: Bearer <token>`.

---

## Public Company Onboarding

### POST `/api/public/companies/request`
Public endpoint for prospective client companies to submit an application request.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyName` | string | ✓ | Name of company |
| `registrationNumber` | string | ✓ | Official registration ID |
| `email` | string | ✓ | Official business email |
| `phone` | string | ✓ | Contact phone number |
| `address` | string | ✓ | Physical address |
| `website` | string | | Company website URL |
| `industry` | string | ✓ | Industry sector |
| `employeeCount` | integer | ✓ | Estimated workforce count |
| `contactPersonName` | string | ✓ | Full name of applicant |
| `contactPersonRole` | string | | Applicant designation |
| `notes` | string | | Optional notes to Admin |

**Response** (201):
```json
{
  "success": true,
  "message": "Company application request submitted successfully",
  "data": {
    "id": 12,
    "companyName": "Acme Corp",
    "status": "PENDING"
  }
}
```

---

## Employee Self-Service

All endpoints require `Authorization: Bearer <token>` header.

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/employee/attendance/clock-in` | Clock in |
| POST | `/api/employee/attendance/clock-out` | Clock out |
| POST | `/api/employee/attendance/clock-in-gps?latitude=&longitude=` | Clock in with GPS |
| POST | `/api/employee/attendance/clock-out-gps?latitude=&longitude=` | Clock out with GPS |
| GET  | `/api/employee/attendance/today` | Today's record |
| GET  | `/api/employee/attendance/history?startDate=&endDate=` | History |
| POST | `/api/employee/attendance/adjustment-request?attendanceId=&reason=` | Request adjustment |

### Leave

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/employee/leave/apply` | Apply for leave |
| GET  | `/api/employee/leave` | My leave applications |
| POST | `/api/employee/leave/{id}/cancel` | Cancel pending leave |
| GET  | `/api/employee/leave/balance` | My leave balances |

**Apply Leave Body**:
```json
{
  "leaveTypeId": 1,
  "startDate": "2026-07-01",
  "endDate": "2026-07-05",
  "reason": "Family vacation"
}
```

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/employee/profile` | Get my profile |
| PUT  | `/api/employee/profile` | Update my profile |

---

## HR Manager Endpoints

Requires role: `ADMIN` or `HR_MANAGER`.

### Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/hr/employees` | List all employees |
| GET    | `/api/hr/employees/{id}` | Get employee by ID |
| POST   | `/api/hr/employees` | Create employee |
| PUT    | `/api/hr/employees/{id}` | Update employee |
| POST   | `/api/hr/employees/{id}/deactivate` | Deactivate |
| POST   | `/api/hr/employees/{id}/terminate?terminationDate=` | Terminate |

### Attendance Oversight

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/hr/attendance/daily?date=` | Daily attendance report |
| GET  | `/api/hr/attendance/adjustments` | Pending adjustments |
| POST | `/api/hr/attendance/adjustments/{id}/approve` | Approve adjustment |
| POST | `/api/hr/attendance/adjustments/{id}/reject` | Reject adjustment |

### Leave Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/hr/leave/pending` | Pending leave requests |
| POST | `/api/hr/leave/{id}/approve` | Approve leave |
| POST | `/api/hr/leave/{id}/reject?reason=` | Reject leave |

---

## Admin Endpoints

**Service**: Admin_Backend (Port 5001). Requires role: `ADMIN`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin-only login |
| GET  | `/api/auth/me` | Current admin info |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/stats` | System-wide dashboard statistics |
| GET  | `/api/admin/stats/company/{companyId}` | Stats for a specific company |

### Company Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/admin/companies` | List all companies |
| GET    | `/api/admin/companies/{id}` | Get company by ID |
| POST   | `/api/admin/companies` | Create company |
| PUT    | `/api/admin/companies/{id}` | Update company |
| POST   | `/api/admin/companies/{id}/approve` | Approve company |
| POST   | `/api/admin/companies/{id}/reject?reason=` | Reject company |
| POST   | `/api/admin/companies/{id}/suspend?reason=` | Suspend company |

### System Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/users` | List all system users |
| GET  | `/api/admin/users/company/{companyId}` | Users by company |
| GET  | `/api/admin/users/admins` | Admin & HR_MANAGER users |
| PUT  | `/api/admin/users/{id}/role?role=` | Update user role |
| PUT  | `/api/admin/users/{id}/status?status=` | Update user status |
| POST | `/api/admin/users/{id}/reset-password` | Reset user password |

**Reset Password Body**:
```json
{ "password": "newSecurePassword123" }
```

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/audit-logs` | All audit logs (optionally filter by `?companyId=`) |
| GET  | `/api/admin/audit-logs/range?startDate=&endDate=` | Logs by date range (ISO 8601) |

### System Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/config` | All system configurations |
| GET  | `/api/admin/config/{key}` | Get config by key |
| PUT  | `/api/admin/config/{key}` | Update config value |

**Update Config Body**:
```json
{ "value": "newConfigValue" }
```


---

## Sync (Inter-Service)

### POST `/api/sync/employee`
Receives employee data from User_Backend. No authentication required (inter-service).

```json
{
  "email": "new@example.com",
  "fullName": "New Employee",
  "password": "$2a$10$...",
  "employeeId": "EMP-001",
  "role": "EMPLOYEE",
  "status": "ACTIVE"
}
```

---

## Roles & Permissions

| Role         | Access                                          |
|-------------|-------------------------------------------------|
| `ADMIN`      | All endpoints                                   |
| `HR_MANAGER` | Employee, HR, and Attendance endpoints          |
| `EMPLOYEE`   | Self-service endpoints only (profile, attendance, leave) |

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request / Validation Error |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient role) |
| 404  | Resource Not Found |
| 500  | Internal Server Error |
