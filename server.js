const express = require('express');
const path = require('path');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const app = express();
const db = new sqlite3.Database('./finance.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// הגשת קבצים סטטיים מתיקיית public (כולל index.html, styles.css, וכו')
app.use(express.static(path.join(__dirname, 'public')));

// תוספת קריטית: אם מישהו מגיע ל־/ – נחזיר את index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// Swagger config
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Finance App API',
    version: '1.0.0',
    description: 'API documentation for the Finance App'
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./server.js'], // או איפה שאתה שם תיעוד API
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// כאן ממשיך הקוד שלך: הרשמות, התחברות, DB וכו'
/* ... כל הראוטים שלך ... */

// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
