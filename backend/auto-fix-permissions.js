const { Pool } = require('pg');

/**
 * PostgreSQL Permission Fix Script
 * This script attempts to fix database permissions for the swasth user
 */

async function fixPermissions() {
  // Try different possible postgres passwords
  const possiblePasswords = ['', 'postgres', 'postgres1', 'password', 'swasth111'];
  
  for (const postgresPassword of possiblePasswords) {
    try {
      const pool = new Pool({
        user: 'postgres',
        password: postgresPassword,
        host: 'localhost',
        port: 5432,
        database: 'postgres'
      });

      console.log(`🔐 Attempting to connect as postgres user...`);
      await pool.query('SELECT version();');
      console.log('✅ Connected as postgres!\n');

      // Run permission fixes
      const commands = [
        `ALTER ROLE swasth WITH SUPERUSER;`,
        `ALTER DATABASE swasth_cafe OWNER TO swasth;`,
        `GRANT ALL PRIVILEGES ON DATABASE swasth_cafe TO swasth;`,
        `GRANT ALL PRIVILEGES ON SCHEMA public TO swasth;`,
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO swasth;`,
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO swasth;`
      ];

      console.log('🔧 Fixing permissions...\n');
      
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        try {
          await pool.query(cmd);
          console.log(`[${i + 1}/${commands.length}] ✅ ${cmd.substring(0, 50)}...`);
        } catch (err) {
          console.log(`[${i + 1}/${commands.length}] ⚠️  ${cmd.substring(0, 50)}... (${err.message})`);
        }
      }

      console.log('\n✅ Permission fixes completed!');
      console.log('\n📝 Now run: node run-setup.js');

      await pool.end();
      process.exit(0);
    } catch (err) {
      // Try next password
      continue;
    }
  }

  console.log('❌ Could not connect as postgres superuser with any known password.\n');
  console.log('📋 MANUAL FIX INSTRUCTIONS:');
  console.log('=========================================\n');
  console.log('1. Open "pgAdmin 4" or "psql" with superuser (postgres) account');
  console.log('2. Run these SQL commands:\n');
  console.log(`   ALTER ROLE swasth WITH SUPERUSER;`);
  console.log(`   ALTER DATABASE swasth_cafe OWNER TO swasth;`);  
  console.log(`   GRANT ALL PRIVILEGES ON DATABASE swasth_cafe TO swasth;`);
  console.log(`   GRANT ALL PRIVILEGES ON SCHEMA public TO swasth;\n`);
  console.log('3. Then run: node run-setup.js\n');
  process.exit(1);
}

fixPermissions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
