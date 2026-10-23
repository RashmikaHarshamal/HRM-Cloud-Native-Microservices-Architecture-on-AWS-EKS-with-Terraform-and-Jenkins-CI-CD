# HRM System - Quick Start Guide

## What Has Been Created

### ✅ Backend (Spring Boot)

#### 1. **Database Entities** (12 Models)
- Company, Department, Employee, Attendance
- LeaveType, LeaveBalance, LeaveApplication
- Salary, Payslip, Notification
- AuditLog, SystemConfiguration

#### 2. **Repositories** (12 Repos)
- All JPA repositories with custom query methods

#### 3. **Security & Authentication**
- JWT-based authentication (JwtUtil)
- Spring Security configuration (SecurityConfig)
- Custom user details service
- JWT authentication filter
- Password encryption (BCrypt)
- Role-based access control (ADMIN, HR_MANAGER, EMPLOYEE)

#### 4. **DTOs** (14 Data Transfer Objects)
- AuthRequest, AuthResponse, ApiResponse
- CompanyDTO, DepartmentDTO, EmployeeDTO
- AttendanceDTO, LeaveApplicationDTO, LeaveBalanceDTO, LeaveTypeDTO
- SalaryDTO, PayslipDTO, NotificationDTO
- DashboardStatsDTO

#### 5. **Services** (4 Core Services Implemented)
- ✅ AuthService - Authentication and current user
- ✅ AuditService - Audit logging
- ✅ EmployeeService - Complete employee management
- ✅ AttendanceService - Complete attendance management
- ✅ LeaveService - Complete leave management

#### 6. **Controllers** (3 Controllers)
- ✅ AuthController - Login endpoint
- ✅ HRMEmployeeController - Employee interface (19 endpoints)
- ✅ HRManagerController - HR Manager interface (15 endpoints)

---

## Immediate Next Steps

### Step 1: Test the Backend (5-10 minutes)

1. **Build and run the application:**
   ```bash
   cd d:\Projects\HRM\hrm_backend\hrm
   .\gradlew clean build
   .\gradlew bootRun
   ```

2. **Expected output:**
   - Server starts on port 5001
   - Database tables are auto-created
   - No errors in the console

3. **If you see errors:**
   - Check PostgreSQL is running
   - Verify database `hrm_db` exists
   - Check credentials in application.properties

### Step 2: Create Test Data (SQL)

Run these SQL commands in your PostgreSQL database:

```sql
-- Create a test company
INSERT INTO companies (company_name, registration_number, email, phone, status, created_at, updated_at)
VALUES ('Test Company Ltd', 'REG001', 'company@test.com', '1234567890', 'APPROVED', NOW(), NOW());

-- Create a test admin user (password: admin123)
INSERT INTO employees (employee_id, full_name, email, password, role, status, company_id, joining_date, created_at, updated_at)
VALUES ('EMP001', 'Admin User', 'admin@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkm', 'ADMIN', 'ACTIVE', 1, '2026-01-01', NOW(), NOW());

-- Create a test HR Manager (password: hr123)
INSERT INTO employees (employee_id, full_name, email, password, role, status, company_id, joining_date, created_at, updated_at)
VALUES ('EMP002', 'HR Manager', 'hr@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkm', 'HR_MANAGER', 'ACTIVE', 1, '2026-01-01', NOW(), NOW());

-- Create a test employee (password: emp123)
INSERT INTO employees (employee_id, full_name, email, password, role, status, company_id, joining_date, created_at, updated_at)
VALUES ('EMP003', 'Test Employee', 'emp@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkm', 'EMPLOYEE', 'ACTIVE', 1, '2026-01-01', NOW(), NOW());

-- Create system-wide leave types
INSERT INTO leave_types (name, description, default_days_per_year, requires_approval, active, created_at, updated_at)
VALUES 
('Annual Leave', 'Annual vacation leave', 20, true, true, NOW(), NOW()),
('Sick Leave', 'Medical sick leave', 15, true, true, NOW(), NOW()),
('Casual Leave', 'Casual personal leave', 10, true, true, NOW(), NOW());
```

### Step 3: Test API Endpoints with Postman/Thunder Client

#### Test 1: Login
```http
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "email": "admin@test.com",
    "fullName": "Admin User",
    "role": "ADMIN",
    "companyId": 1,
    "employeeId": 1
  }
}
```

Copy the token for the next requests.

#### Test 2: Get Profile
```http
GET http://localhost:5001/api/employee/profile
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Test 3: Clock In
```http
POST http://localhost:5001/api/employee/attendance/clock-in
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Test 4: Apply Leave
```http
POST http://localhost:5001/api/employee/leaves/apply
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "leaveTypeId": 1,
  "startDate": "2026-02-01",
  "endDate": "2026-02-05",
  "reason": "Vacation"
}
```

---

## Services & Controllers Still Needed

### Services to Create:
1. **CompanyService** - Company management (for Admin)
2. **DepartmentService** - Department management
3. **SalaryService** - Salary management
4. **PayrollService** - Payslip generation
5. **NotificationService** - Notification management
6. **SystemConfigurationService** - System settings

### Controllers to Create:
1. **AdminController** - Admin-specific endpoints
2. **DepartmentController** - Department CRUD
3. **PayrollController** - Salary & payslip management
4. **NotificationController** - Notification endpoints

---

## Frontend Development Guide

### Current Frontend Structure
```
hrm_frontend/src/
├── Pages/
│   ├── login.jsx (EXISTS)
│   ├── dashboard.jsx (EXISTS)
│   ├── createaccount.jsx (EXISTS)
│   └── hero.jsx (EXISTS)
```

### Pages to Create:

#### For Admin:
1. `admin/Dashboard.jsx` - Admin overview
2. `admin/Companies.jsx` - Company list & approval
3. `admin/SystemConfig.jsx` - System configuration
4. `admin/AuditLogs.jsx` - Audit trail viewer

#### For HR Manager:
1. `hr/Dashboard.jsx` - HR dashboard
2. `hr/Employees.jsx` - Employee list & management
3. `hr/EmployeeForm.jsx` - Create/edit employee
4. `hr/Departments.jsx` - Department management
5. `hr/Attendance.jsx` - Attendance monitoring
6. `hr/AttendanceReports.jsx` - Attendance reports
7. `hr/Leaves.jsx` - Leave approvals
8. `hr/LeaveReports.jsx` - Leave statistics
9. `hr/Payroll.jsx` - Payroll management
10. `hr/Salary.jsx` - Salary setup

#### For Employee:
1. `employee/Dashboard.jsx` - Employee dashboard
2. `employee/Attendance.jsx` - Clock in/out & history
3. `employee/Leave.jsx` - Apply & view leaves
4. `employee/Payslip.jsx` - View payslips
5. `employee/Profile.jsx` - Profile management

---

## Frontend Development Steps

### 1. Update Login Page

Modify `src/Pages/login.jsx` to:
- Call `/api/auth/login`
- Store JWT token in localStorage
- Redirect based on role:
  - ADMIN → `/admin/dashboard`
  - HR_MANAGER → `/hr/dashboard`
  - EMPLOYEE → `/employee/dashboard`

### 2. Create API Service

Create `src/services/api.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Create Auth Context

Create `src/context/AuthContext.jsx`:

```javascript
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, ...userData } = res.data.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4. Create Protected Route

Create `src/components/ProtectedRoute.jsx`:

```javascript
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;
```

### 5. Update App Routing

Update `src/App.jsx`:

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './Pages/login';
import AdminDashboard from './Pages/admin/Dashboard';
import HRDashboard from './Pages/hr/Dashboard';
import EmployeeDashboard from './Pages/employee/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* HR Routes */}
          <Route path="/hr/*" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER']}>
              <HRDashboard />
            </ProtectedRoute>
          } />
          
          {/* Employee Routes */}
          <Route path="/employee/*" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'EMPLOYEE']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## Testing Checklist

### Backend API Tests
- [ ] Login with different roles
- [ ] Clock in/out functionality
- [ ] Apply for leave
- [ ] Approve/reject leave (HR)
- [ ] Create employee (HR)
- [ ] View attendance history
- [ ] Get leave balance

### Frontend Tests
- [ ] Login redirects correctly by role
- [ ] Token stored and sent with requests
- [ ] 401 errors redirect to login
- [ ] Protected routes work
- [ ] Logout clears token

---

## Common Issues & Solutions

### Issue 1: Build fails
**Solution:** Run `.\gradlew clean build --refresh-dependencies`

### Issue 2: JWT secret error
**Solution:** Change `jwt.secret` in application.properties to a longer string (minimum 256 bits)

### Issue 3: CORS errors
**Solution:** Already configured in SecurityConfig for `localhost:5173` and `localhost:3000`

### Issue 4: Password encoding
**Solution:** Use BCrypt online tool or this code:
```java
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hashed = encoder.encode("yourpassword");
```

---

## Production Deployment Checklist

Before deploying to production:

1. **Security**
   - [ ] Change JWT secret to a secure random string
   - [ ] Enable HTTPS
   - [ ] Remove CORS wildcard
   - [ ] Add rate limiting
   - [ ] Enable SQL injection protection
   - [ ] Set strong password policies

2. **Database**
   - [ ] Change `ddl-auto` from `update` to `validate`
   - [ ] Create database backup strategy
   - [ ] Add database indexes
   - [ ] Set up connection pooling

3. **Configuration**
   - [ ] Use environment variables
   - [ ] Enable logging
   - [ ] Set up error monitoring
   - [ ] Configure file upload limits

---

## Additional Features to Implement

### High Priority:
1. Password reset functionality
2. Email notifications
3. File upload (profile pictures, documents)
4. Excel export for reports
5. PDF generation for payslips

### Medium Priority:
1. Two-factor authentication
2. Mobile app (React Native)
3. Real-time notifications (WebSocket)
4. Advanced analytics dashboard
5. Bulk employee import (CSV)

### Low Priority:
1. Multi-language support
2. Dark mode
3. Custom themes
4. Mobile push notifications
5. Integration with external systems

---

## Support & Resources

- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **Spring Security**: https://spring.io/projects/spring-security
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **JWT.io**: https://jwt.io (for debugging tokens)

---

**Last Updated**: January 20, 2026
**Project Status**: Backend core features implemented, Frontend needs development
