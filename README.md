# Escape Builder

An application to create, edit, and present interactive, room-based games. Features a presenter mode with a separate control window for managing dynamic elements like puzzles, object inventory, and layered maps.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Running in Production](#running-in-production)

## Features

-   Interactive game creation with rooms, objects, puzzles, and actions.
-   Dual-window presenter and presentation views for live gameplay.
-   Asset management for images, audio, and custom fonts.
-   Layered and room-specific map displays.
-   Customizable inventory (single or dual), appearance, and object behavior.
-   Secure user authentication with Auth0.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS
-   **Backend**: Node.js, Express
-   **Database**: MySQL
-   **Authentication**: Auth0

## Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (v18 or later recommended)
-   npm (comes with Node.js)
-   MySQL Server

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/escape-builder.git
    cd escape-builder
    ```

2.  **Install dependencies:**
    This project uses a single `package.json` for both server and client dependencies.
    ```bash
    npm install
    ```

## Configuration

### 1. Database Setup

1.  Connect to your MySQL server.
2.  Create a new database for the application. For example:
    ```sql
    CREATE DATABASE escape_builder_db;
    ```
3.  Use the new database:
    ```sql
    USE escape_builder_db;
    ```
4.  Execute the SQL commands from `database-setup.txt` to create the required tables (`presentations` and `assets`).

### 2. Auth0 Setup

This application uses Auth0 for user authentication. You will need to create a "Regular Web Application" in your Auth0 dashboard.

1.  **Create an Application**:
    -   Go to your Auth0 Dashboard > Applications > Applications and click "Create Application".
    -   Choose "Regular Web Application" and give it a name (e.g., "Escape Builder").

2.  **Configure Application URIs**:
    -   In your new application's "Settings" tab, configure the following URLs. Replace `http://localhost:8080` with your actual base URL if it's different.
        -   **Allowed Callback URLs**: `http://localhost:8080/game/callback`
        -   **Allowed Logout URLs**: `http://localhost:8080/game`

3.  **Note your credentials**:
    -   You will need the **Domain**, **Client ID**, and **Client Secret** for the environment variables below.

### 3. Environment Variables

1.  Create a `.env` file in the root directory of the project.
2.  Copy the following variables into the file and replace the placeholder values with your own configuration.

    ```env
    # Server Configuration
    PORT=8080

    # Database Configuration
    DB_HOST=localhost
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=escape_builder_db
    DB_PORT=3306

    # Auth0 Configuration
    # Replace with your Auth0 application's settings
    AUTH0_BASE_URL=http://localhost:8080
    AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
    AUTH0_CLIENT_ID=your_client_id
    AUTH0_CLIENT_SECRET=your_client_secret
    AUTH0_SECRET=a_long_random_string_for_session_encryption
    ```
    **Note**: `AUTH0_SECRET` should be a long, random, and secret string used to encrypt the session cookie.

## Running the Application

### Development Mode

In development, the Vite server will handle hot-reloading for the frontend and proxy API requests to the Node.js backend.

1.  **Start the backend server:**
    ```bash
    npm start
    ```
    This will start the Express server on the port defined in your `.env` file (e.g., 8080).

2.  **Start the frontend development server:**
    In a separate terminal, run:
    ```bash
    npm run dev
    ```
    This will start the Vite dev server, typically on port 5173. You can access the application at `http://localhost:5173/game/`.

## Building for Production

Before deploying, you must create an optimized production build of the frontend.

```bash
npm run build
```
This command compiles the React application into a `build` directory, which will be served by the Express server.

## Running in Production

After building the application, you can run it in production mode.

### Option 1: Using `npm start`

The simplest way to run the production server is with the `start` script. The Express server will serve both the API and the static frontend files from the `build` directory.

```bash
npm start
```
The server will now serve the complete application from the URL defined in your `AUTH0_BASE_URL` (e.g., `http://localhost:8080/game/`).

### Option 2: Using PM2 (Recommended)

For more robust production deployments, it's recommended to use a process manager like [PM2](https://pm2.keymetrics.io/) to keep your application alive, manage logs, and enable clustering.

1.  **Install PM2 globally:**
    ```bash
    npm install pm2 -g
    ```

2.  **Start the server with PM2:**
    ```bash
    pm2 start server.js --name "escape-builder"
    ```

3.  **Useful PM2 Commands:**
    -   `pm2 list`: List all running applications.
    -   `pm2 logs escape-builder`: View real-time logs for the app.
    -   `pm2 restart escape-builder`: Restart the app.
    -   `pm2 stop escape-builder`: Stop the app.
    -   `pm2 delete escape-builder`: Stop and remove the app from PM2's list.

4.  **Enable Startup on Reboot:**
    To ensure your app restarts automatically after a server reboot, run `pm2 startup`. PM2 will provide a command you need to copy and execute. After that, save the current process list:
    ```bash
    pm2 save
    ```
