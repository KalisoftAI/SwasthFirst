const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: 'swasth',
  password: 'swasth111',
  host: 'localhost',
  port: 5432,
  database: 'swasth_cafe'
});

// Read the DATABASE_SETUP.sql file
const sqlFilePath = path.join(__dirname, 'DATABASE_SETUP.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf-8');

// Parse SQL statements properly
function parseSqlStatements(sqlText) {
  const statements = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1];
    
    // Handle single and double quotes
    if ((char === "'" || char === '"') && (i === 0 || sqlText[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    // Handle statement terminator
    if (char === ';' && !inString) {
      currentStatement += char;
      const stmt = currentStatement.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  // Add any remaining statement
  const stmt = currentStatement.trim();
  if (stmt.length > 0) {
    statements.push(stmt);
  }
  
  return statements;
}

// Execute the SQL script
async function runSetup() {
  try {
    console.log('Connecting to PostgreSQL...');
    
    const statements = parseSqlStatements(sql);
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    let executed = 0;
    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i];
      
      // Remove single-line comments
      statement = statement
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      
      if (statement.length === 0) continue;
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
        await pool.query(statement);
        console.log(`✓ Statement ${i + 1} executed successfully\n`);
        executed++;
      } catch (err) {
        console.error(`✗ Error executing statement ${i + 1}:`);
        console.error(`   Statement: ${statement.substring(0, 80)}...`);
        console.error(`   Error: ${err.message}\n`);
      }
    }
    
    console.log(`\n✓ Database setup completed! (${executed}/${statements.length} statements executed)`);
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSetup();
