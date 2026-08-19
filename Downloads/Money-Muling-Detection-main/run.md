# 🏁 Running OZARK Sentinel

This guide provides step-by-step instructions to set up and run the **OZARK Sentinel** platform (FastAPI Backend, React Frontend, and Algorand Smart Contracts) locally on your machine.

---

## 📋 System Prerequisites

Ensure you have the following installed on your machine before starting:
* **Node.js** (v18.0 or higher) & **npm** (v9.0 or higher)
* **Python** (v3.11 or v3.12 recommended. Newer versions like v3.13+ may lack pre-built wheels for libraries like `pandas` and require complex build tools to compile from source)
* **AlgoKit CLI** (for local/testnet Algorand contract interaction and LocalNet sandbox)
* **Docker** (Required only if running Algorand LocalNet)
* **IPFS Kubo CLI** (Optional, for decentralized KYC storage and mapping)

---

## 📂 Project Structure Overview

* **/backend**: FastAPI API server which processes transaction CSV data using NetworkX.
* **/Frontend-main**: Vite + React + TypeScript web application for the UI dashboard.
* **/projects/aml-registry-contracts**: AlgoPy smart contracts for on-chain Soul Bound token flagging.

---

## 🛠️ Step-by-Step Run Instructions

Follow these steps in separate terminal windows to get the entire stack running.

### Step 1: Start Algorand LocalNet (Optional)
If you want to run a local sandbox instead of using the Algorand TestNet:
1. Ensure Docker is running.
2. Open a terminal and start the AlgoKit LocalNet sandbox:
   ```bash
   algokit localnet start
   ```

---

### Step 2: Start IPFS Daemon (Optional)
IPFS is used for storing KYC information and transaction evidence dossiers.
1. Start your local IPFS node daemon:
   ```bash
   ipfs daemon
   ```
   *(If you don't have IPFS installed, the backend will display a warning and fall back to local mocks without crashing).*

---

### Step 3: Run the FastAPI Backend
Open a new terminal window and navigate to the backend directory to set up Python and run the API server.

**For Windows (PowerShell/CMD):**
```powershell
# Navigate to backend
cd backend

# Create virtual environment (v3.11 or v3.12 recommended)
# Note: If multiple Python versions are installed, you can force v3.11 using:
# py -3.11 -m venv venv
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env

# Configure UTF-8 encoding (prevents UnicodeEncodeError when printing emojis in Windows terminals)
# For PowerShell:
$env:PYTHONIOENCODING="utf-8"
# For CMD:
# set PYTHONIOENCODING=utf-8

# Run FastAPI server
python main.py
```

**For macOS / Linux:**
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run FastAPI server
python main.py
```

> 💡 **Port Verification:** The backend API starts by default at **`http://localhost:8000`**. You can verify it is running by visiting **`http://localhost:8000/docs`** in your browser to view the interactive Swagger API documentation.

---

### Step 4: Run the React Frontend
Open a new terminal window and navigate to the frontend directory to run the UI application.

```bash
# Navigate to frontend folder
cd Frontend-main

# Install dependencies
npm install

# Start the Vite local development server
npm run dev
```

> 💡 **UI Verification:** Once started, open **`http://localhost:5173`** in your web browser to access the OZARK Sentinel dashboard interface.

---

### Step 5: Build & Deploy Smart Contracts (Optional)
If you want to compile and deploy custom changes to the Algorand smart contracts on your LocalNet or TestNet:

```bash
# Navigate to contracts folder
cd projects/aml-registry-contracts

# Install dependencies via poetry
poetry install

# Compile the contract to TEAL and generate ARC-56 ABI
python -m smart_contracts build

# Deploy contract to Algorand LocalNet / TestNet
python -m smart_contracts deploy
```

---

## 🔌 Port Mapping & Endpoints Reference

Once everything is up and running, you can access the following services:

| Component | Service URL / Port | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Main React Client UI Dashboard |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI Base Endpoint |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger API UI |
| **IPFS Gateway** | [http://localhost:5001/webui](http://localhost:5001/webui) | IPFS local Node admin & explorer UI |
| **Algorand LocalNet** | `http://localhost:4001` (Algod) | Local sandbox Algod client |

---

## 🧪 Testing the Detection flow

1. Open the UI at **`http://localhost:5173`**.
2. Click on the file upload zone and upload a test transaction CSV. You can use the pre-built sample file located in the backend folder:
   * **[`sample_transactions.csv`](file:///c:/Users/dhanv/Downloads/Money-Muling-Detection-main/backend/sample_transactions.csv)**
3. The platform will analyze the graph, highlight mule chains in red, and attempt to register the flagged accounts to the Algorand sandbox/TestNet ledger automatically!
