const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5002;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

// Database configuration
const dbConfig = {
    user: 'xl_user', 
    password: 'xl_4u',
    server: 'STM-FCT0101',
    database: 'SCRATCH',
    options: {
      trustServerCertificate: true, // Trust self-signed certificate if needed
      enableArithAbort: true,
    },
  };

// API to get Ticker and Company Name
app.get('/api/companies', async (req, res) => {
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool.request().query(
        'SELECT Ticker, CompanyName FROM icr.dbo.vwboardmembercompanylist ORDER BY CompanyName'
      );
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });
  
  // API to get Board Member Matrix Data
  app.get('/api/board-member-matrix', async (req, res) => {
    const { ticker, includeExecs } = req.query;
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .input('ticker', sql.VarChar, ticker)
        .input('includeExecs', sql.Bit, includeExecs === '1')
        .execute('icr.dbo.spGetBoardMemberMatrixData');
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });

  // API to get Company Data
  app.get('/api/company-data', async (req, res) => {
    const { ticker, mostRecent } = req.query;
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .input('ticker', sql.VarChar, ticker)
        .input('MostRecent', sql.Bit, mostRecent === '1')
        .query(`SELECT Name, Ticker, Title, Age, Sex, Compensation, Sector 
          FROM ICR_BIGD.dbo.vwBoardMembers 
          WHERE Ticker = @ticker AND MostRecent = @mostRecent`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });

  app.get('/api/get-old-board-members', async (req, res) => {
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .execute('icr_bigd.dbo.spGetOldBoardMembers');
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });

  app.get('/api/get-new-client-boards', async (req, res) => {
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .execute('icr_bigd.dbo.spGetClientNewBoards');
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });

  app.get('/api/get-long-term-board-members', async (req, res) => {
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .execute('icr_bigd.dbo.spGetLongTermBoardMembers');
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });

  app.get('/api/get-board-high-turnover', async (req, res) => {
    try {
      let pool = await sql.connect(dbConfig);
      let result = await pool
        .request()
        .execute('icr_bigd.dbo.spGetBoardHighTurnover');
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
  });


  app.listen(port, () => {
    console.log('Server is running on port', port);
  });
  