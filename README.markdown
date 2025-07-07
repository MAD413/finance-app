# Finance App

A simple finance management application built with Node.js, Express, SQLite, and Tailwind CSS.

## Features
- User registration and login with fields: `firstName`, `lastName`, `email`, `fax`, `password`.
- Sidebar navigation visible only after login, with toggle functionality.
- Budget management, transaction tracking, and summary with charts.
- Export transactions to CSV and backup data to SQL.
- Responsive design with Tailwind CSS.
- API documentation with Swagger.

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd finance-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build Tailwind CSS:
   ```bash
   npm run build:css
   ```
4. Update Browserslist database (if needed):
   ```bash
   npm run update-browserslist
   ```
5. Start the server:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000` in your browser.

### Deployment (Render)
1. Push the project to a GitHub repository.
2. Create a new Web Service in Render (https://render.com).
3. Configure:
   - Environment: Node
   - Build Command: `npm install && npm run build:css`
   - Start Command: `npm start`
4. Deploy and access the provided URL.

## Directory Structure
```
finance-app/
├── public/
│   ├── css/
│   │   ├── input.css
│   ├── index.html
├── server.js
├── tailwind.config.js
├── package.json
├── .gitignore
├── README.md
```

## Notes
- SQLite database (`finance.db`) is created automatically on first run.
- The free tier of Render may cause the server to sleep after inactivity, leading to a slight delay on first load.
- For persistent storage, consider using a managed database like PostgreSQL.