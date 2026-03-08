# Multi-Tenant POS & Inventory Management System

A production-ready SaaS (Software as a Service) Point of Sale and Inventory Management System designed to handle multiple tenants (businesses) on a single platform. Every business has its own isolated data, branding, and feature set.

---

## 🏗️ Project Architecture

This project follows a **Standard Multi-Tenant Architecture** using a **Shared Database and Shared Schema** model. Tenant isolation is achieved through a `tenant_id` column on almost every table.

### Multi-Tenancy Logic
1.  **Isolation**: Every database query includes a `WHERE tenant_id = ?` clause to ensure data is never leaked between businesses.
2.  **Authentication**: Users belong to a specific tenant. Upon login, a JWT is generated containing the `tenantId`.
3.  **Context**: The backend uses an `authMiddleware` to extract the `tenantId` from the token and attach it to the request (`req.tenantId`), making it available for all controllers.

---

## 📂 Directory Structure

### 💻 Backend (`/backend`)
The backend is built with **Node.js** and **Express**, using **MySQL** for the database.

-   **`server.js`**: The entry point. Configures middleware (CORS, Helmet, Rate Limiting) and mounts routes.
-   **`/modules`**: The "Heart" of the system. Each folder is a feature (Sales, Products, Tenants).
    -   `controller.js`: Business logic and database interactions.
    -   `routes.js`: Endpoint definitions.
-   **`/middleware`**: Security and utility layers.
    -   `authMiddleware.js`: Validates JWT and extracts tenant info.
    -   `auditLogger.js`: Records every action (who, what, when) for the Audit Log feature.
-   **`/database`**: Database connection pool and initial schema files.

### 🎨 Frontend (`/frontend`)
The frontend is a modern SPA built with **React** and **Vite**.

-   **`/src/pages`**: Full-page components (Dashboard, POS, Products).
-   **`/src/components`**: Reusable UI elements (Modals, Tables, Layouts).
-   **`/src/services/api.js`**: Centralized Axios instance for backend communication.
-   **`/src/context`**: React Context (e.g., AuthContext) to manage global state like user login status.

---

## 📊 Data Visualization (Charts)

The system uses **[Recharts](https://recharts.org/)**, a composable charting library for React.

-   **Why Recharts?**: It's responsive, customizable, and handles complex data (like Revenue Trends and Product Distribution) gracefully.
-   **Charts Used**:
    -   `AreaChart`: Visualizes "Revenue Trends" over time (last 30 days).
    -   `BarChart`: Used for "Top Selling Products" and "Weekly Sales".
    -   `PieChart` / `DonutChart`: Displays "Subscription Plan Distribution" in the Super Admin dashboard.

---

## 🛠️ Key Libraries ("The Wing Tools")

The project leverages several high-performance libraries to provide a premium user experience:

1.  **[Tailwind CSS](https://tailwindcss.com/)**: Used for all styling. It allows for rapid UI development using utility-first classes (e.g., `flex`, `p-4`, `bg-brand-500`).
2.  **[Lucide React](https://lucide.dev/)**: provides the beautiful, consistent icons throughout the app (Icons like `Store`, `ShoppingCart`, `TrendingUp`).
3.  **[Axios](https://axios-http.com/)**: Handles all API requests with built-in support for interceptors (to attach the JWT token automatically).
4.  **[BCrypt.js](https://www.npmjs.com/package/bcryptjs)**: Securely hashes passwords before storing them in the database.

---

## 🚀 How to Run

### Backend
1.  Navigate to `/backend`.
2.  Configure `.env` with your DB credentials.
3.  Run `npm install`.
4.  Run `npm run dev` to start the server with hot-reload.

### Frontend
1.  Navigate to `/frontend`.
2.  Run `npm install`.
3.  Run `npm run dev` to launch the Vite development server.

---

## ⚙️ Core Modules Breakdown
-   **POS**: Real-time sales interface with tax, discount, and inventory sync.
-   **Inventory**: Track stock levels with "Low Stock" alerts.
-   **Staff**: Role-based access control (Admin, Manager, Cashier).
-   **Super Admin**: Global portal to manage tenants, subscriptions, and platform-wide logs.
