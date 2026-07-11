# ⚡ Smart EV Charging Management System

An end-to-end Smart Electric Vehicle (EV) Charging Management System featuring real-time hardware telemetry integration, interactive user dashboards, historical analytics, billing forecasting, and automatic fault-detection mechanisms. 

The system bridges a physical **STM32 microcontroller** (measuring battery voltage, current, and SOC) with an **ESP32 microcontroller** acting as a Wi-Fi/UART web server. The ESP32 handles commands and streams live data to a robust **Node.js/Express backend**, which persists data to **MongoDB** and feeds an interactive **React frontend** built with Vite and Tailwind CSS.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[React Web Frontend] <-->|HTTP REST APIs| B[Express.js Backend Server]
    B <-->|MongoDB Connection| C[(MongoDB Database)]
    B <-->|HTTP Requests| D[ESP32 Wi-Fi & UART Bridge]
    D <-->|GPIO Signal Pin 15| E[Economizer Contactor Relay]
    D <-->|UART / Serial2| F[STM32 Controller]
    F <-->|CAN Bus| G[EV Battery Management System (BMS)]
```

---

## 🌟 Key Features

### 🔌 Hardware & Firmware (ESP32 + STM32)
*   **Contactor Relay Control:** Exposes endpoints to energize/drop the charging contactor via a dedicated hardware GPIO pin (`GPIO 15`).
*   **Dual UART Serial Bridge:** Continuous non-blocking UART communication with the STM32 controller at `115200` baud rate to parse real-time battery voltage, charging current, and State of Charge (SOC).
*   **Telemetry Integration:** Continuously runs Riemann Sum Integration in firmware to calculate total grid energy consumed in kilowatt-hours (kWh) with a configurable efficiency factor ($92\%$).
*   **Emergency Hardware Interlocks:** Monitors STM32 status; detects CAN communication faults or contactor failures, automatically cutting power to the contactor relay and reporting a `HARDWARE_CAN_ERROR` fault state to the backend.

### ⚙️ Backend (Node.js, Express & MongoDB)
*   **Role-Based Access Control:** Secure JWT authentication supporting `User` dashboards and `Admin` management panels.
*   **Live Session Monitoring:** Interfaces with the ESP32 to query live charging telemetry and persist active state updates.
*   **Automated Billing engine:** Charges users based on precise metered energy consumption at a rate of **₹13 per kWh** (updated from time-based metrics).
*   **Predictive Analytics & Forecasting:** Uses historical usage profiles to generate a 7-day predicted energy usage forecast and estimates the upcoming 30-day bill.
*   **Resiliency Handling:** Implements automatic MongoDB SRV DNS override workarounds and graceful database recovery checks to prevent backend crashes during network instability.

### 💻 Frontend (React, Vite & Tailwind CSS)
*   **Interactive Charging Console:** Live monitoring of active charge metrics (Voltage, Current, Power in kW, SOC percentage, Elapsed time, and Live cost accumulators).
*   **User Dashboard:** Overview of current monthly bill, billing forecasts, and charging history with pagination and month/year filters.
*   **Admin Dashboard:** Overview of total users, registration details, role assignments, and active charging terminals.
*   **Safety Alarm Panel:** Immediate notification system for hardware alerts and fault codes (`fault_stopped` sessions).

---

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), Tailwind CSS, Axios, Lucide Icons, ChartJS / Recharts.
*   **Backend:** Node.js, Express.js, MongoDB (Mongoose), JSON Web Tokens (JWT), Bcrypt.js.
*   **Firmware:** C++ (Arduino IDE for ESP32), STM32 HAL/UART communication interface.

---

## 🔌 Hardware Wiring & Pin Configuration (ESP32)

| Component / Pin | ESP32 GPIO | Description |
| :--- | :--- | :--- |
| **TXD2** | `GPIO 17` | Hardware Serial 2 TX (connects to STM32 RX) |
| **RXD2** | `GPIO 16` | Hardware Serial 2 RX (connects to STM32 TX) |
| **SIGNAL_PIN** | `GPIO 15` | Digital Out to relay control circuit (Contactor Active = HIGH) |
| **GND** | `GND` | Common ground reference with STM32 |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [MongoDB](https://www.mongodb.com/) (Local server or MongoDB Atlas cluster)
*   [Arduino IDE](https://www.arduino.cc/en/software) (for ESP32 programming)

---

### 2. Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend` root and configure the environment variables:
    ```env
    PORT=5000
    MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ev-charging
    JWT_SECRET=your_jwt_secret_key_here
    ESP32_URL=http://<ESP32_IP_ADDRESS>
    ```
4.  Start the server:
    ```bash
    npm start
    ```
    *The server runs by default on `http://localhost:5000`.*

---

### 3. Frontend Setup
1.  Navigate to the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your backend URL API connections inside `/src/services` or matching configurations.
4.  Launch the development server:
    ```bash
    npm run dev
    ```
    *The dashboard opens on `http://localhost:5173` (or the terminal-supplied local address).*

---

### 4. Firmware Installation
1.  Open `/Hardware/ESP32_UART_Bridge/ESP32_UART_Bridge.ino` in the Arduino IDE.
2.  Configure your WiFi SSID and Password:
    ```cpp
    const char* ssid = "YOUR_WIFI_SSID";
    const char* password = "YOUR_WIFI_PASSWORD";
    ```
3.  Install ESP32 Board Support package via the Arduino Boards Manager.
4.  Connect your ESP32 board and upload the code.
5.  Open the Serial Monitor at `115200` baud rate to check the IP address assigned by the router. Update the `ESP32_URL` variable in your backend `.env` file accordingly.

---

## 📡 API Reference Summary

### Authentication (`/api/auth`)
*   `POST /api/auth/signup` - Register a new flat owner / user.
*   `POST /api/auth/login` - Authenticate users and receive JWT.

### Charging Control (`/api/charging`)
*   `POST /api/charging/start` - Commences charging, fires hardware signal, and initiates database session.
*   `POST /api/charging/stop` - Terminates charging, opens the contactor, registers energy consumption, and tallies the final billing details.
*   `GET /api/charging/active/:userId` - Resolves any active charging session for a user.
*   `GET /api/charging/status/:userId` - Fetches live current/voltage telemetry from the ESP32 and tests for safety fault codes.
*   `GET /api/charging/:userId/bill` - Aggregates month-specific usage bills for flat owners.
*   `GET /api/charging/:userId/forecast` - Returns calculated daily average energy consumption and predicts usage for upcoming days.
*   `GET /api/charging/:userId/history` - Fetches a list of completed sessions filtered by month and year.

### Administration (`/api/admin`)
*   `GET /api/admin/users` - Fetches lists of all registered users (Admins only).

---

## 🔒 Safety & Alarm Protocols
The software implements an active state observer loop. If the STM32 signals a CAN bus fault or contactor failure:
1.  The ESP32 drops the `SIGNAL_PIN` (closes relay).
2.  The ESP32 writes an `Error` response over UART.
3.  The Node.js backend flags the session as `fault_stopped`.
4.  The user's dashboard presents a warning and requests manual inspection before allowing any new session starts.
