const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();
const PORT = process.env.PORT || 3000; // Use environment port for Render

// Middleware
app.use(express.json());
app.use(session({
  secret: 'fixed-secret-key-123', // Hardcoded secret (not recommended for production)
  resave: false,
  saveUninitialized: false
}));
app.use(express.static('public')); // Serve static files from public folder

// Database setup
const db = new sqlite3.Database('finance.db', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Create tables
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT,
  lastName TEXT,
  email TEXT UNIQUE,
  fax TEXT,
  password TEXT,
  language TEXT DEFAULT 'he'
)`);

db.run(`CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  description TEXT,
  amount REAL,
  type TEXT,
  category TEXT,
  account TEXT,
  currency TEXT,
  notes TEXT,
  recurring BOOLEAN,
  date TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Finance App API', version: '1.0.0' },
  },
  apis: ['./server.js']
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               fax: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, fax, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.json({ success: false, message: 'שם פרטי, שם משפחה, דואל וסיסמה הם שדות חובה' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (firstName, lastName, email, fax, password) VALUES (?, ?, ?, ?, ?)`, 
    [firstName, lastName, email, fax, hashedPassword], function(err) {
      if (err) return res.json({ success: false, message: 'שגיאה בהרשמה: דואל כבר קיים' });
      res.json({ success: true });
    });
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Login a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) return res.json({ success: false, message: 'משתמש לא נמצא' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'סיסמה שגויה' });
    req.session.userId = user.id;
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Logout a user
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/profile', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  db.get(`SELECT firstName, lastName, email, fax, language FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
    if (err || !user) return res.json({ success: false, message: 'משתמש לא נמצא' });
    res.json(user);
  });
});

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
app.put('/api/profile', async (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, req.session.userId], function(err) {
    if (err) return res.json({ success: false, message: 'שגיאה בעדכון סיסמה' });
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/language:
 *   post:
 *     summary: Update user language
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/language', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const { language } = req.body;
  db.run(`UPDATE users SET language = ? WHERE id = ?`, [language, req.session.userId], function(err) {
    if (err) return res.json({ success: false, message: 'שגיאה בעדכון שפה' });
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Add a transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 *               amount: { type: number }
 *               type: { type: string }
 *               category: { type: string }
 *               account: { type: string }
 *               currency: { type: string }
 *               notes: { type: string }
 *               recurring: { type: boolean }
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/transactions', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const { description, amount, type, category, account, currency, notes, recurring } = req.body;
  db.run(`INSERT INTO transactions (user_id, description, amount, type, category, account, currency, notes, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.session.userId, description, amount, type, category, account, currency, notes, recurring], function(err) {
      if (err) return res.json({ success: false, message: 'שגיאה בהוספת עסקה' });
      res.json({ success: true });
    });
});

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get transactions
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/transactions', (req, res) => {
  if (!req.session.userId) return res.json([]);
  const { search = '', type = '', category = '' } = req.query;
  let query = `SELECT * FROM transactions WHERE user_id = ?`;
  const params = [req.session.userId];
  if (search) {
    query += ` AND description LIKE ?`;
    params.push(`%${search}%`);
  }
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  db.all(query, params, (err, transactions) => {
    if (err) return res.json([]);
    res.json(transactions);
  });
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 *               amount: { type: number }
 *               type: { type: string }
 *               category: { type: string }
 *               account: { type: string }
 *               currency: { type: string }
 *               notes: { type: string }
 *               recurring: { type: boolean }
 *     responses:
 *       200:
 *         description: Success
 */
app.put('/api/transactions/:id', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const { description, amount, type, category, account, currency, notes, recurring } = req.body;
  db.run(`UPDATE transactions SET description = ?, amount = ?, type = ?, category = ?, account = ?, currency = ?, notes = ?, recurring = ? WHERE id = ? AND user_id = ?`,
    [description, amount, type, category, account, currency, notes, recurring, req.params.id, req.session.userId], function(err) {
      if (err) return res.json({ success: false, message: 'שגיאה בעדכון עסקה' });
      res.json({ success: true });
    });
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
app.delete('/api/transactions/:id', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], function(err) {
    if (err) return res.json({ success: false, message: 'שגיאה במחיקת עסקה' });
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/budget:
 *   post:
 *     summary: Set budget
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *     responses:
 *       200:
 *         description: Success
 */
app.post('/api/budget', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const { amount } = req.body;
  db.run(`INSERT INTO budgets (user_id, amount) VALUES (?, ?)`, [req.session.userId, amount], function(err) {
    if (err) return res.json({ success: false, message: 'שגיאה בהגדרת תקציב' });
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/summary:
 *   get:
 *     summary: Get summary
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/summary', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'לא מורשה' });
  const period = req.query.period || 'monthly';
  const timeFrame = period === 'yearly' ? `strftime('%Y', date)` : `strftime('%Y-%m', date)`;
  const currentPeriod = period === 'yearly' ? `strftime('%Y', 'now')` : `strftime('%Y-%m', 'now')`;

  db.get(`SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                 COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
          FROM transactions WHERE user_id = ? AND ${timeFrame} = ${currentPeriod}`,
    [req.session.userId], (err, summary) => {
      if (err) return res.json({ success: false, message: 'שגיאה בטעינת סיכום' });
      db.get(`SELECT amount FROM budgets WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.session.userId], (err, budget) => {
        res.json({
          income: summary.income || 0,
          expense: summary.expense || 0,
          balance: (summary.income || 0) - (summary.expense || 0),
          budget: budget ? budget.amount : null
        });
      });
    });
});

/**
 * @swagger
 * /api/export-csv:
 *   get:
 *     summary: Export transactions to CSV
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/export-csv', (req, res) => {
  if (!req.session.userId) return res.status(401).send('לא מורשה');
  db.all(`SELECT * FROM transactions WHERE user_id = ?`, [req.session.userId], (err, transactions) => {
    if (err) return res.status(500).send('שגיאה בייצוא');
    let csv = 'ID,תיאור,סכום,סוג,קטגוריה,חשבון,מטבע,הערות,חוזר,תאריך\n';
    transactions.forEach(t => {
      csv += `${t.id},"${t.description}",${t.amount},${t.type},${t.category || ''},${t.account || ''},${t.currency},${t.notes || ''},${t.recurring},${t.date}\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  });
});

/**
 * @swagger
 * /api/backup:
 *   get:
 *     summary: Backup database
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/backup', (req, res) => {
  if (!req.session.userId) return res.status(401).send('לא מורשה');
  db.all(`SELECT * FROM transactions WHERE user_id = ?`, [req.session.userId], (err, transactions) => {
    if (err) return res.status(500).send('שגיאה בגיבוי');
    let sql = '';
    transactions.forEach(t => {
      sql += `INSERT INTO transactions (id, user_id, description, amount, type, category, account, currency, notes, recurring, date) VALUES (${t.id}, ${t.user_id}, "${t.description}", ${t.amount}, "${t.type}", "${t.category || ''}", "${t.account || ''}", "${t.currency}", "${t.notes || ''}", ${t.recurring}, "${t.date}");\n`;
    });
    res.header('Content-Type', 'application/sql');
    res.attachment('backup.sql');
    res.send(sql);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});