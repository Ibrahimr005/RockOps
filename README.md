# 🏗️ Mining Site Management System

A full-stack web application designed to streamline and digitize operations across mining sites. Built with **Spring Boot** (backend) and **React + SCSS** (frontend), the system offers modular and scalable functionality tailored for large-scale mining operations.

---

## 🚀 Features

- **Site Management** – Oversee multiple mining sites and personnel distribution.
- **HR Module** – Manage employee data, job roles, contract types, and attendance.
- **Warehouse Management** – Track inventory, stock levels, and storage across locations.
- **Equipment Tracking** – Monitor machinery, maintenance, and site allocation.
- **Partner Integration** – Collaborate with external vendors and contractors.
- **Procurement Workflow** – Handle requisition requests, approvals, and supplier records.
- **Finance Module** – Budget tracking and financial reporting across operations.

---

## 🛠️ Tech Stack

**Backend**:
- Java 23
- Spring Boot
- Spring Data JPA
- PostgreSQL
- MinIO (for file storage)

**Frontend**:
- React (Vite)
- JSX + SCSS
- REST API integration

---

## 🧩 Project Structure
```
OreTech/
├── backend/ → Spring Boot Application
├── frontend/ → React App (JSX + SCSS)
└── README.md
```

## 🧪 Setup Instructions

### Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### 📦Build for Production

```bash
cd frontend
npm run build
```
