

const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');
const { Pool } = require('pg');
const fs = require('fs');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { createWriteStream } = require('fs');
const { format } = require('fast-csv');

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.BACKEND_URL || 'http://localhost:3001'
];

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========================
// COMPLETE MENU DATA
// ========================
const COMPLETE_MENU = {
  // Juice section
  1: { id: 1, name: 'Amla juice', price: 25, category: 'Juice' },
  2: { id: 2, name: 'Beetroot juice', price: 25, category: 'Juice' },
  3: { id: 3, name: 'Carrot juice', price: 25, category: 'Juice' },
  4: { id: 4, name: 'Karela juice', price: 25, category: 'Juice' },
  5: { id: 5, name: 'Palak juice', price: 25, category: 'Juice' },
  6: { id: 6, name: 'Ash gourd juice', price: 25, category: 'Juice' },
  7: { id: 7, name: 'ABC Juice', price: 25, category: 'Mix Juice' },
  8: { id: 8, name: 'Amla + Karela juice', price: 25, category: 'Mix Juice' },
  9: { id: 9, name: 'Beetroot + Carrot juice', price: 25, category: 'Mix Juice' },
  10: { id: 10, name: 'Amla + Palak', price: 25, category: 'Mix Juice' },
  // Detox waters
  11: { id: 11, name: 'Liver cleanser detox', price: 10, category: 'Detox waters' },
  12: { id: 12, name: 'Beauty boost detox', price: 15, category: 'Detox waters' },
  13: { id: 13, name: 'Digestive boost kanji water', price: 15, category: 'Detox waters' },
  // Salads
  14: { id: 14, name: 'Mix sprouts salad', price: 40, category: 'Salads' },
  15: { id: 15, name: 'Paneer + sprout salad', price: 85, category: 'Salads' }
};

const generateMenuMessage = (cart = null) => {
  // Build cart summary line if cart exists
  let cartLine = '';
  if (cart && cart.length > 0) {
    const total = cart.reduce((s, i) => s + i.lineTotal, 0);
    const names = cart.map(i => `${i.name.split(' ')[0]}×${i.quantity}`).join(', ');
    cartLine = `\n🛒 _Cart: ${names} — ₹${total}_\n`;
  }

  return `🌿 *SWASTH CAFE — Order Menu*${cartLine}
━━━━━━━━━━━━━━━━━━━━
🥤 *JUICES* · ₹25 each
┌──────────────────────
│ *1* Amla juice
│ *2* Beetroot juice
│ *3* Carrot juice
│ *4* Karela juice
│ *5* Palak juice
│ *6* Ash gourd juice
└──────────────────────
🥛 *MIX JUICES* · ₹25 each
┌──────────────────────
│ *7*  ABC Juice
│ *8*  Amla + Karela
│ *9*  Beet + Carrot
│ *10* Amla + Palak
└──────────────────────
💧 *DETOX WATERS*
┌──────────────────────
│ *11* Liver Cleanser · ₹10
│ *12* Beauty Boost · ₹15
│ *13* Kanji Water · ₹15
└──────────────────────
🥗 *SALADS*
┌──────────────────────
│ *14* Mix Sprouts Salad · ₹40
│ *15* Paneer+Sprout Salad · ₹85
└──────────────────────
*Just send the item number(s) to order:*
  ✏️  *3* → Carrot juice
  ✏️  *1,5,12* → pick multiple items
  ✏️  *CART* → view your cart
  ✏️  *REORDER* → 📋 repeat last order
  ✏️  *DONE* → confirm & place order
  ✏️  *CLEAR* → 🗑 start over`;
};

// ========================
// DATABASE SETUP (PostgreSQL)
// ========================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'swasth_cafe',
  user: process.env.DB_USER || 'swasth',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connection established');
});

const initializeDatabase = async () => {
  try {
    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        whatsapp_jid VARCHAR(60),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add whatsapp_jid column to existing tables that predate this migration
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_jid VARCHAR(60)`);
    console.log('✅ Customers table ready');

    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        items JSONB NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table ready');

    // Create menu table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Menu table ready');

    // Create chat_logs table (stores every message sent/received per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        customer_name VARCHAR(255) DEFAULT 'Unknown',
        direction VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        session_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Chat logs table ready');

    // Create whatsapp_contacts view (clean name + phone, no encoding/lid)
    await pool.query(`
      CREATE OR REPLACE VIEW whatsapp_contacts AS
      SELECT
        id,
        name,
        phone,
        address,
        created_at
      FROM customers
      ORDER BY name ASC
    `);
    console.log('✅ WhatsApp contacts view ready');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_customers_jid ON customers(whatsapp_jid)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_logs_phone ON chat_logs(phone)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON chat_logs(created_at DESC)');
    console.log('✅ Database indexes created');

    // ── Dedup migration ──────────────────────────────────────────────────────
    // If the same person has two rows (one with real phone, one from LID auto-save)
    // keep the real-phone row and re-link any orders that pointed at the LID row.
    // A "LID row" is one where phone is 15 digits (WhatsApp internal ID, not a real number).
    try {
      const dupRes = await pool.query(`
        SELECT a.phone AS real_phone, b.phone AS lid_phone, a.name
        FROM customers a
        JOIN customers b
          ON a.name = b.name
          AND a.phone <> b.phone
          AND length(b.phone) = 15
          AND length(a.phone) <> 15
      `);
      for (const row of dupRes.rows) {
        // Re-point orders from LID phone → real phone
        await pool.query(
          `UPDATE orders SET phone = $1 WHERE phone = $2`,
          [row.real_phone, row.lid_phone]
        );
        // Store LID phone as whatsapp_jid on the real customer row
        await pool.query(
          `UPDATE customers SET whatsapp_jid = $1 WHERE phone = $2`,
          [row.lid_phone + '@lid', row.real_phone]
        );
        // Remove the duplicate LID row
        await pool.query(`DELETE FROM customers WHERE phone = $1`, [row.lid_phone]);
        console.log(`🔀 Merged duplicate: ${row.name} — LID ${row.lid_phone} → real ${row.real_phone}`);
      }
    } catch (e) {
      console.warn('⚠️ Dedup migration skipped:', e.message);
    }

    console.log('📊 PostgreSQL database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
};

// Initialize database on startup
initializeDatabase();

// ========================
// PHONE NORMALIZATION
// ========================
// ========================
// TIMESTAMP FORMATTING - IST (UTC+5:30)
// ========================
const getISTTimestamp = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) - (5.5 * 60 * 60 * 1000) + (5.5 * 60 * 60 * 1000));
  
  // Return ISO string for database
  const date = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) - now.getTimezoneOffset() * 60 * 1000);
  return date.toISOString();
};

// ========================
// PHONE NORMALIZATION
// ========================
const normalizePhone = (phone) => {
  // Remove WhatsApp JID suffixes and clean up phone number
  if (!phone) return '';
  
  // Remove all WhatsApp suffixes (@s.whatsapp.net, @lid, @g.us, etc)
  let cleaned = phone.replace(/@s\.whatsapp\.net$/, '')
                     .replace(/@lid$/, '')
                     .replace(/@g\.us$/, '')
                     .replace(/\s+/g, '')  // Remove any whitespace
                     .trim();
  
  // If somehow it still has @, remove everything after it
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0];
  }
  
  // Ensure it's only digits
  cleaned = cleaned.replace(/\D/g, '');
  
  // Only keep if it's 10 digits (without country code) or 12+ digits (with country code)
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  console.log(`⚠️ Invalid phone after normalization: ${phone} -> ${cleaned}`);
  return null;
};

// ========================
// FETCH CUSTOMER DETAILS FROM DATABASE
// ========================
const getCustomerDetails = async (phone) => {
  // Session cache hit — real phone already resolved
  const session = userOrderingSession.get(phone);
  if (session?.customerPhone) {
    return { name: session.customerName || 'Customer', phone: session.customerPhone, address: session.customerAddress || null };
  }

  const normalizedPhone = normalizePhone(phone);
  const rawJid = phone;

  try {
    // ── 1. Look up by whatsapp_jid ──
    if (rawJid && rawJid.includes('@')) {
      const jidRes = await pool.query(
        'SELECT name, phone, address FROM customers WHERE whatsapp_jid = $1',
        [rawJid]
      );
      if (jidRes.rows.length > 0) {
        const c = jidRes.rows[0];
        if (session) { session.customerName = c.name; session.customerPhone = c.phone; session.customerAddress = c.address; }
        return c;
      }
    }

    // ── 2. Fall back to normalized phone ──
    if (normalizedPhone) {
      const phoneRes = await pool.query(
        'SELECT name, phone, address FROM customers WHERE phone = $1',
        [normalizedPhone]
      );
      if (phoneRes.rows.length > 0) {
        const c = phoneRes.rows[0];
        if (session) { session.customerName = c.name; session.customerPhone = c.phone; session.customerAddress = c.address; }
        return c;
      }
    }
  } catch (error) {
    console.error('❌ Database error getting customer:', error.message);
  }

  // Not found — return fallback using real normalized phone
  return { name: 'Customer', phone: normalizedPhone || phone, address: null };
};

// ========================
// STATE MANAGEMENT
// ========================
const userCart = new Map();              // Maps phone -> [{id, name, price, qty}, ...]
const userOrderingSession = new Map();   // Maps phone -> { state: 'ordering' } + cached customerName/phone/address
const userSelectedItems = new Map();     // Maps phone -> [1,2,3,12] (item IDs)
const processedMessages = new Map();     // Maps messageId -> timestamp (prevents duplicate processing)
const userLastMessage = new Map();       // Maps phone -> { id, text, timestamp } (detects rapid duplicates)
let cronJobScheduled = false;            // Flag to prevent duplicate cron jobs

// ========================
// LID → JID RESOLUTION MAP
// ========================
// Baileys populates sock.contacts lazily. We build our own persistent map
// from contacts events so LIDs can be resolved even after initial sync.
const lidToJidMap = new Map(); // Maps '220331906232532@lid' → '919876543210@s.whatsapp.net'

const updateLidMap = (contacts) => {
  if (!Array.isArray(contacts)) contacts = Object.values(contacts);
  let count = 0;
  for (const c of contacts) {
    if (c && c.lid && c.id && !c.id.endsWith('@lid')) {
      lidToJidMap.set(c.lid, c.id);
      count++;
    }
  }
  if (count > 0) console.log(`🗂️  LID map updated: ${count} entries (total ${lidToJidMap.size})`);
};

// ========================
// MESSAGE DEDUPLICATION
// ========================
const isMessageDuplicate = (from, messageId, text) => {
  const DUPLICATE_THRESHOLD = 3000; // 3 seconds — covers Baileys retry/reconnect replay windows
  const now = Date.now();
  
  // IMMEDIATELY mark message as processed to prevent race conditions
  // Check if message ID already processed
  if (processedMessages.has(messageId)) {
    console.log(`⚠️ Duplicate message ID detected: ${messageId}`);
    return true;
  }
  
  // Mark as processed RIGHT AWAY to prevent duplicate processing
  processedMessages.set(messageId, now);
  
  // Check if user sent same message within threshold
  const lastMsg = userLastMessage.get(from);
  if (lastMsg && lastMsg.text === text && (now - lastMsg.timestamp) < DUPLICATE_THRESHOLD) {
    console.log(`⚠️ Duplicate message from ${from}: "${text.substring(0, 20)}..."`);
    return true;
  }
  
  // Clean up old entries (keep only last 500 messages)
  if (processedMessages.size > 500) {
    const oldestKey = processedMessages.keys().next().value;
    processedMessages.delete(oldestKey);
  }
  
  // Store user's last message
  userLastMessage.set(from, { id: messageId, text, timestamp: now });
  
  return false;
};

// ========================
// TIME MANAGEMENT
// ========================
const ORDERING_CONFIG = {
  startTime: 9,    // 9:00 AM  (production)
  endTime: 20,     // 8:00 PM  (production)
  timezone: 'IST'
};

const isOrderingAllowed = () => {
  const currentHour = new Date().getHours();
  return currentHour >= ORDERING_CONFIG.startTime && currentHour < ORDERING_CONFIG.endTime;
};

const getOrderingClosedMessage = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (currentHour >= ORDERING_CONFIG.endTime) {
    return `🌙 *Swasth Cafe is Closed*

Our kitchen has closed for today.

⏰ *Ordering Hours:* 9:00 AM – 8:00 PM
🕐 *Current Time:* ${timeStr} IST

See you tomorrow morning! 🌅
_— Swasth Cafe_ 🙏`;
  } else {
    return `🌅 *Good Morning!*

Ordering opens at *9:00 AM* daily.

⏰ *Ordering Hours:* 9:00 AM – 8:00 PM
🕐 *Current Time:* ${timeStr} IST

_Come back soon_ 🌿`;
  }
};

// WhatsApp variables
let sock;
let qrCodeUrl = null;
let connectionStatus = 'disconnected';

// ========================
// WHATSAPP CONNECTION
// ========================
const connectWhatsApp = async () => {
  try {
    const authPath = path.join(__dirname, 'auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    console.log('📱 Setting up WhatsApp connection...');
    
    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Chrome', 'Windows', '10'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      fireInitQueries: true,
      markOnlineOnConnect: true
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        try {
          console.log('\n════════════════════════════════════════');
          console.log('🔐 QR CODE GENERATED');
          console.log('════════════════════════════════════════');
          console.log('📱 Open WhatsApp on your phone');
          console.log('📸 Settings → Linked Devices → Link a Device');
          console.log('✨ Scan the QR code on the web dashboard');
          console.log('════════════════════════════════════════\n');
          
          qrCodeUrl = await QRCode.toDataURL(qr);
          io.emit('qrCode', qrCodeUrl);
          console.log('✅ QR code sent to frontend dashboard');
        } catch (error) {
          console.error('❌ QR Generation Error:', error.message);
        }
      }

      if (connection === 'open') {
        console.log('\n✅ ✅ ✅ WhatsApp Connected Successfully! ✅ ✅ ✅\n');
        connectionStatus = 'connected';
        qrCodeUrl = null;
        io.emit('connectionStatus', { status: 'connected' });
        console.log('📊 Dashboard is now fully functional');
        console.log('⏰ Menu will broadcast at 9 AM daily\n');
        // Initialize cron job only once
        initializeCronJob();
      }

      if (connection === 'close') {
        connectionStatus = 'disconnected';
        io.emit('connectionStatus', { status: 'disconnected' });
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut  = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          // Session expired / phone unlinked — wipe auth so a fresh QR is shown
          console.log('\n🔒 WhatsApp session expired (401). Clearing auth and showing new QR...');
          try {
            const authPath = path.join(__dirname, 'auth');
            const files = fs.readdirSync(authPath);
            for (const f of files) fs.unlinkSync(path.join(authPath, f));
            console.log(`🗑️ Auth cleared (${files.length} files removed)`);
          } catch (e) {
            console.warn('⚠️  Could not clear auth folder:', e.message);
          }
          console.log('🔄 Restarting WhatsApp in 3 seconds to show QR...\n');
          setTimeout(() => connectWhatsApp(), 3000);
        } else {
          console.log(`\n⚠️ Connection closed (code ${statusCode}).`);
          console.log('🔄 Reconnecting in 5 seconds...\n');
          setTimeout(() => connectWhatsApp(), 5000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // ──────────────────────────────────────────────────────
    // CONTACTS SYNC — builds our LID→JID map as WhatsApp
    // delivers contact records (happens right after connect).
    // This is the source-of-truth for resolving @lid JIDs.
    // ──────────────────────────────────────────────────────
    sock.ev.on('contacts.upsert', (contacts) => {
      updateLidMap(contacts);
    });

    sock.ev.on('contacts.update', (updates) => {
      updateLidMap(updates);
    });

    // Also seed the map from sock.contacts if it's already populated
    // (happens on reconnect when auth state is restored)
    setTimeout(() => {
      if (sock.contacts && Object.keys(sock.contacts).length > 0) {
        updateLidMap(sock.contacts);
      }
    }, 3000);

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;

      try {
        const message = m.messages[0];
        if (!message.message) return;
        if (message.key.fromMe) return; // Skip our own outgoing messages

        let from = message.key.remoteJid;
        const messageId = message.key.id;
        const pushName = message.pushName || null; // WhatsApp display name

        // 🔄 Resolve LID (Linked Device Identity) to real phone JID.
        // LIDs look like "220331906232532@lid".
        //
        // IMPORTANT: If we can't resolve the LID to a real JID, we KEEP
        // the original @lid address for sending — WhatsApp routes replies
        // to @lid just fine. Converting to a fake @s.whatsapp.net breaks
        // sending because the LID number is not a real phone number.
        //
        // normalizePhone() already strips @lid for DB storage, so DB phone
        // will be the numeric part (e.g. "220331906232532") regardless.
        if (from && from.endsWith('@lid')) {
          // --- attempt 1: our own persistent map (built from contacts events) ---
          const resolvedFromMap = lidToJidMap.get(from);
          if (resolvedFromMap) {
            console.log(`🔄 LID resolved (map): ${from} → ${resolvedFromMap}`);
            from = resolvedFromMap;
          } else {
            // --- attempt 2: sock.contacts (may be populated after initial sync) ---
            const contacts = sock.contacts || {};
            const resolvedFromContacts = Object.values(contacts).find(c =>
              (c.lid === from || c.id === from) && c.id && !c.id.endsWith('@lid')
            )?.id;

            if (resolvedFromContacts) {
              lidToJidMap.set(from, resolvedFromContacts);
              console.log(`🔄 LID resolved (contacts): ${from} → ${resolvedFromContacts}`);
              from = resolvedFromContacts;
            } else {
              // --- fallback: keep @lid as-is for routing, log it ---
              console.log(`📱 LID unresolved — routing to ${from} directly (pushName: ${pushName || 'unknown'})`);
              // 'from' stays as the original @lid JID — WhatsApp will route it
            }
          }
        }

        const text = message.message.conversation || message.message.extendedTextMessage?.text;
        if (!text) return;

        // Ignore whitespace-only messages
        if (text.trim().length === 0) return;

        // Deduplicate — prevents Baileys from firing the same event multiple times
        if (isMessageDuplicate(from, messageId, text)) {
          return;
        }

        // Resolve customer name — pass pushName to auto-save unknown customers
        const customerName = await getCustomerName(from, pushName);
        console.log(`📨 [${customerName}] ${from}: "${text}"`);

        // ✅ Log incoming
        await logChatMessage(from, 'incoming', text, customerName);

        // ✅ STEP 1: Check if ordering is allowed by time
        if (!isOrderingAllowed()) {
          await sendWAMessage(from, { text: getOrderingClosedMessage() }, customerName);
          return;
        }

        // ✅ STEP 2: Check if this is a NEW SESSION (first message from user)
        const isNewSession = !userOrderingSession.has(from);

        if (isNewSession) {
          userOrderingSession.set(from, { state: 'ordering', customerName });
          await sendWAMessage(from, { text: generateMenuMessage(null) }, customerName);
          return;
        }

        // Get existing session state
        let session = userOrderingSession.get(from);

        // ── STATE: qty_input ─────────────────────────────────────────────────
        // Bot asked "how many?" — user is replying with quantities
        if (session.state === 'qty_input') {
          const cmd = text.trim().toLowerCase();

          if (['back', 'menu'].includes(cmd)) {
            // Cancel qty step, go back to menu
            session.pendingItems = null;
            session.state = 'ordering';
            const currentCart = userCart.get(from) || [];
            await sendWAMessage(from, { text: generateMenuMessage(currentCart.length ? currentCart : null) }, customerName);

          } else if (['done', 'confirm', '✅', 'ok', 'yes'].includes(cmd)) {
            // DONE during qty step — use qty 1 for all pending, then confirm
            await applyQtyAndAddToCart(from, session, null);
            await confirmOrder(from, customerName);

          } else if (['clear', 'cancel', '❌'].includes(cmd)) {
            userCart.delete(from);
            session.pendingItems = null;
            session.state = 'ordering';
            userOrderingSession.set(from, session);
            await sendWAMessage(from, { text: `🗑 *Cart cleared!*\n\n${generateMenuMessage(null)}` }, customerName);

          } else {
            // Parse qty reply: "2", "2 1 3", "1"
            await applyQtyAndAddToCart(from, session, text);
          }
          return;
        }

        // ── STATE: ordering ──────────────────────────────────────────────────
        if (session.state === 'ordering') {
          const cmd = text.trim().toLowerCase();

          if (['done', 'confirm', '✅', 'ok', 'yes'].includes(cmd)) {
            await confirmOrder(from, customerName);

          } else if (['clear', 'cancel', 'reset', 'restart', '❌', 'no'].includes(cmd)) {
            userCart.delete(from);
            userOrderingSession.set(from, { ...session, state: 'ordering' });
            await sendWAMessage(from, { text: `🗑 *Cart cleared!*\n\n${generateMenuMessage(null)}` }, customerName);

          } else if (cmd === 'menu') {
            const currentCart = userCart.get(from) || [];
            await sendWAMessage(from, { text: generateMenuMessage(currentCart.length ? currentCart : null) }, customerName);

          } else if (cmd === 'cart') {
            const currentCart = userCart.get(from);
            if (!currentCart || currentCart.length === 0) {
              await sendWAMessage(from, { text: `🛒 Your cart is empty.\n\nSend item numbers to add items.` }, customerName);
            } else {
              await sendWAMessage(from, { text: buildCartMessage(currentCart) }, customerName);
            }

          } else if (cmd === 'reorder') {
            // ✅ NEW: Get last order and add to cart
            const lastOrder = await getLastCustomerOrder(from);
            if (!lastOrder) {
              await sendWAMessage(from, {
                text: `📋 *No previous orders found*\n\nStart by selecting items from the menu!`
              }, customerName);
              return;
            }

            try {
              // Parse items from last order
              const items = typeof lastOrder.items === 'string' 
                ? JSON.parse(lastOrder.items) 
                : lastOrder.items;

              // Clear cart and add previous order items
              userCart.delete(from);
              const cartItems = items.map(item => ({
                ...item,
                lineTotal: item.price * item.quantity
              }));
              userCart.set(from, cartItems);

              // Show cart from last order
              const lastOrderDate = new Date(lastOrder.timestamp).toLocaleDateString('en-IN');
              const reorderMsg = `✅ *Last Order - ${lastOrderDate}*\n\n${buildCartMessage(cartItems)}\n\n_Send *DONE* to confirm or *CLEAR* to cancel_`;
              await sendWAMessage(from, { text: reorderMsg }, customerName);
              console.log(`🔄 Reorder: ${customerName} reordered from last order`);
            } catch (error) {
              console.error('❌ Error restoring order items:', error.message);
              await sendWAMessage(from, {
                text: `❌ Error loading last order. Please try again or select items manually.`
              }, customerName);
            }
            return;

          } else {
            await handleItemSelection(from, text, customerName);
          }
        }

      } catch (error) {
        console.error('❌ Message handler error:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ WhatsApp connection error:', error.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectWhatsApp, 5000);
  }
};

// ========================
// MESSAGE HANDLERS
// ========================

// Parse order input.
// In ordering state only item numbers are accepted (no inline qty).
// Qty is collected conversationally in the qty_input state.
// Formats:
//   "3"       → select item 3
//   "1,3,12"  → select items 1, 3 and 12
//   "1 3"     → same with spaces
//   "remove 3" / "del 3" → remove item 3 from cart
// Returns { type: 'select'|'remove', items: [{itemId}] } or null
const parseOrderInput = (text) => {
  const clean = text.trim();

  // ── REMOVE: "remove N" or "del N" ─────────────────────────────────
  const removeMatch = clean.match(/^(?:remove|del|delete)\s+(\d{1,2})$/i);
  if (removeMatch) {
    const itemId = parseInt(removeMatch[1]);
    if (!COMPLETE_MENU[itemId]) return null;
    return { type: 'remove', items: [{ itemId }] };
  }

  // ── SELECT item numbers ───────────────────────────────────────
  const menuKeywords = ['juice', 'detox', 'salad', 'water', 'amla', 'beetroot', 'carrot',
                        'palak', 'kanji', 'sprout', 'paneer', 'swasth', 'cafe'];
  if (menuKeywords.some(k => clean.toLowerCase().includes(k))) return null;

  // Only digits, commas, spaces
  if (!/^[0-9,\s]+$/.test(clean)) return null;

  const entries = clean.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  if (entries.length === 0 || entries.length > 8) return null;

  const items = [];
  const seen  = new Set();
  for (const entry of entries) {
    const itemId = parseInt(entry);
    if (isNaN(itemId) || !COMPLETE_MENU[itemId]) return null;
    if (seen.has(itemId)) continue; // de-duplicate selections
    seen.add(itemId);
    items.push({ itemId });
  }
  if (items.length === 0) return null;

  return { type: 'select', items };
};

// Apply qty reply from user and add items to cart.
// qtyText: space-separated numbers e.g. "2 1 3", or null/"1" for qty 1 all.
const applyQtyAndAddToCart = async (from, session, qtyText) => {
  const pending = session.pendingItems || [];
  if (pending.length === 0) {
    session.state = 'ordering';
    return;
  }

  let qtys = [];
  if (qtyText) {
    qtys = qtyText.trim().split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= 20);
  }

  // If user gave a single number, apply it to all pending items
  // If user gave one number per item, apply in order
  // Otherwise default to 1
  const getQty = (i) => {
    if (qtys.length === 0)          return 1;
    if (qtys.length === 1)          return qtys[0];  // one number = same qty for all
    return qtys[i] !== undefined ? qtys[i] : 1;
  };

  const existingCart = userCart.get(from) || [];
  const newItems = pending.map((p, i) => ({
    ...COMPLETE_MENU[p.itemId],
    quantity:  getQty(i),
    lineTotal: COMPLETE_MENU[p.itemId].price * getQty(i)
  }));

  // Replace existing qty if item already in cart (re-order = update qty)
  const incoming = new Map(newItems.map(item => [item.id, item]));
  const kept = existingCart.filter(i => !incoming.has(i.id));
  const updatedCart = mergeCartItems([...kept, ...incoming.values()]);

  userCart.set(from, updatedCart);
  session.pendingItems = null;
  session.state = 'ordering';
  userOrderingSession.set(from, session);

  const customerName = session.customerName || 'Customer';
  await sendWAMessage(from, { text: buildCartMessage(updatedCart) }, customerName);
  const total = updatedCart.reduce((s, i) => s + i.lineTotal, 0);
  console.log(`🛒 Cart updated for ${from}: ₹${total}`);
};

// Merge cart — combines same itemId entries, sums quantities
const mergeCartItems = (cartItems) => {
  const merged = new Map();
  for (const item of cartItems) {
    const key = item.id;
    const menuItem = COMPLETE_MENU[key];
    if (!menuItem) continue; // skip unknown items
    if (merged.has(key)) {
      const ex = merged.get(key);
      ex.quantity  += item.quantity;
      ex.price     = menuItem.price; // always set from menu
      ex.lineTotal = ex.price * ex.quantity;
    } else {
      merged.set(key, {
        ...item,
        price: menuItem.price, // always set from menu
        lineTotal: menuItem.price * item.quantity
      });
    }
  }
  return Array.from(merged.values());
};

// Build WhatsApp cart display message
const buildCartMessage = (cart) => {
  const merged = mergeCartItems(cart);
  const total  = merged.reduce((sum, i) => sum + i.lineTotal, 0);

  const lines = merged.map(i => {
    const emoji = i.quantity >= 3 ? '🔥' : i.quantity >= 2 ? '✌️' : '✅';
    return `${emoji} *${i.name}* × ${i.quantity}  — ₹${i.lineTotal}`;
  }).join('\n');

  const itemList = merged.map(i => `*${i.id}*=${i.name.split(' ')[0]}`).join(', ');

  return `🛒 *Your Cart*
━━━━━━━━━━━━━━━━━━━━
${lines}
━━━━━━━━━━━━━━━━━━━━
💰 *Total: ₹${total}*

_To add more, send item number(s)_
_To remove: *remove ${merged[0].id}*_
✏️  *DONE* to confirm  ·  *CLEAR* to reset`;
};

// Handle item selection in 'ordering' state
const handleItemSelection = async (from, text, customerName) => {
  const parsed = parseOrderInput(text);

  if (!parsed) {
    // Unknown input
    const cart = userCart.get(from);
    if (cart?.length) {
      await sendWAMessage(from, {
        text: `❓ _Not recognised._\n\nSend item number(s), e.g. *3* or *1,5*\nOr *remove 3* to remove from cart\n*DONE* to confirm · *CLEAR* to restart`
      }, customerName);
    } else {
      // No cart yet — re-show menu silently (user probably typed random text)
      await sendWAMessage(from, { text: generateMenuMessage(null) }, customerName);
    }
    return;
  }

  if (parsed.type === 'remove') {
    const { itemId } = parsed.items[0];
    const existingCart = userCart.get(from) || [];
    const updatedCart = existingCart.filter(i => i.id !== itemId);
    if (updatedCart.length === existingCart.length) {
      await sendWAMessage(from, {
        text: `⚠️ *${COMPLETE_MENU[itemId].name}* is not in your cart.`
      }, customerName);
      return;
    }
    if (updatedCart.length === 0) {
      userCart.delete(from);
      await sendWAMessage(from, { text: `🛒 Cart is empty.\n\n${generateMenuMessage(null)}` }, customerName);
    } else {
      userCart.set(from, updatedCart);
      await sendWAMessage(from, { text: buildCartMessage(updatedCart) }, customerName);
    }
    return;
  }

  // parsed.type === 'select' — store pending items, ask for qtys
  const session = userOrderingSession.get(from);
  session.pendingItems = parsed.items;
  session.state = 'qty_input';
  userOrderingSession.set(from, session);

  if (parsed.items.length === 1) {
    // Single item — simple ask
    const item = COMPLETE_MENU[parsed.items[0].itemId];
    await sendWAMessage(from, {
      text: `✅ *${item.name}* — ₹${item.price}\n\nHow many? _(reply with a number, e.g. *2*)_`
    }, customerName);
  } else {
    // Multiple items — show list and ask for all qtys
    const lines = parsed.items.map((p, i) => {
      const item = COMPLETE_MENU[p.itemId];
      return `  ${i + 1}. *${item.name}* — ₹${item.price}`;
    }).join('\n');
    const example = parsed.items.map((_, i) => i === 0 ? '2' : '1').join(' ');
    await sendWAMessage(from, {
      text: `✅ *${parsed.items.length} items selected:*\n${lines}\n\nHow many of each?\n_Reply with qty for each (space-separated)_\n_e.g. *${example}* = ${parsed.items.map((p, i) => `${COMPLETE_MENU[p.itemId].name.split(' ')[0]}×${i === 0 ? '2' : '1'}`).join(', ')}_\n_Or just *1* for one of each_`
    }, customerName);
  }
};

// Confirm and place order — called when user sends DONE
const confirmOrder = async (from, customerName) => {
  const rawCart = userCart.get(from);
  if (!rawCart || rawCart.length === 0) {
    await sendWAMessage(from, {
      text: `🛒 Your cart is empty!\n\n${generateMenuMessage()}`
    }, customerName);
    return;
  }

  // Merge duplicates and re-apply correct prices before saving
  let cart = mergeCartItems(rawCart);
  // Ensure every item has correct price and lineTotal from COMPLETE_MENU
  cart = cart.map(item => {
    const menuItem = COMPLETE_MENU[item.id];
    const price = menuItem ? menuItem.price : item.price || 0;
    const quantity = item.quantity || 1;
    return {
      ...item,
      price,
      lineTotal: price * quantity,
      quantity
    };
  });
  userCart.set(from, cart);

  const totalPrice = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemsJSON  = JSON.stringify(cart);
  const timestamp  = getISTTimestamp();

  console.log(`⏰ Timestamp (IST): ${timestamp}`);
  console.log(`📝 Processing order for: ${normalizePhone(from)}`);
  console.log(`📦 Items: ${JSON.stringify(cart.map(c => c.name))}`);

  // Fetch customer details (session-cached)
  let customerDetails = await getCustomerDetails(from);
  console.log(`📦 Customer: name="${customerDetails.name}", phone="${customerDetails.phone}"`);

  try {
    // Upsert customer — preserve real phone, bind WhatsApp JID
    await pool.query(
      `INSERT INTO customers (phone, name, whatsapp_jid, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (phone) DO UPDATE
         SET name = $2,
             whatsapp_jid = COALESCE(EXCLUDED.whatsapp_jid, customers.whatsapp_jid),
             updated_at = CURRENT_TIMESTAMP`,
      [customerDetails.phone, customerDetails.name, from.includes('@') ? from : null]
    );
    console.log(`✅ Customer saved: ${customerDetails.name} (${customerDetails.phone})`);

    // Insert order — uses real phone from customers table
    const result = await pool.query(
      'INSERT INTO orders (timestamp, name, phone, items, total_price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [timestamp, customerDetails.name, customerDetails.phone, itemsJSON, totalPrice, 'pending']
    );
    console.log(`✅ Order saved: ID=${result.rows[0].id}, Amount=₹${totalPrice}`);
  } catch (error) {
    console.error(`❌ Database error:`, error.message);
    await sendWAMessage(from, { text: '❌ Error processing order. Please try again.' }, customerName);
    return;
  }

  // Save to CSV
  const cartSummary = cart.map(item => `${item.name}(×${item.quantity})`).join(', ');
  saveOrderToCSV(timestamp, customerDetails.name, customerDetails.phone, cartSummary, totalPrice);
  console.log(`✅ CSV saved`);

  // Send confirmation
  const cartDetails = cart.map(item =>
    `  • ${item.name} ×${item.quantity}  —  ₹${item.lineTotal}`
  ).join('\n');

  const confirmationMessage =
    `🎉 *Order Confirmed!* ✅\n\n${cartDetails}\n\n💰 *Total: ₹${totalPrice}*\n\n💳 *Pay via UPI:*\n📲 *9373332785*\n\n_Please share screenshot once paid 🙏_\n_Thank you! Stay healthy 🌿_\n_— Swasth Cafe_`;

  await sendWAMessage(from, { text: confirmationMessage }, customerDetails.name);
  console.log(`📤 Confirmation sent`);

  // Notify frontend
  io.emit('newOrder', {
    timestamp,
    name: customerDetails.name,
    phone: customerDetails.phone,
    items: cartSummary,
    total_price: totalPrice
  });
  console.log(`📡 Frontend notified`);

  // Clear session
  userCart.delete(from);
  userSelectedItems.delete(from);
  userOrderingSession.delete(from);

  console.log(`🎉 Complete: ${customerDetails.name} - ${cartSummary} = ₹${totalPrice}`);
};

// ========================
// HELPER FUNCTIONS
// ========================

// ========================
// FETCH CUSTOMER'S LAST ORDER
// ========================
const getLastCustomerOrder = async (phone) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  try {
    const result = await pool.query(
      `SELECT id, timestamp, items, total_price 
       FROM orders 
       WHERE phone = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [normalizedPhone]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Error fetching last order:', error.message);
    return null;
  }
};

const getCustomerName = async (phone, pushName = null) => {
  // Session cache — avoids repeat DB calls during an active ordering session
  const session = userOrderingSession.get(phone);
  if (session?.customerName) return session.customerName;

  const normalizedPhone = normalizePhone(phone);
  const rawJid = phone; // keep the original JID (@lid or @s.whatsapp.net) for JID-column lookup

  try {
    // ── 1. Look up by whatsapp_jid (handles LID users linked to a real-phone row) ──
    let row = null;
    if (rawJid && rawJid.includes('@')) {
      const jidRes = await pool.query(
        'SELECT name, phone, address FROM customers WHERE whatsapp_jid = $1',
        [rawJid]
      );
      if (jidRes.rows.length > 0) row = jidRes.rows[0];
    }

    // ── 2. Fall back to normalized phone lookup ──
    if (!row && normalizedPhone) {
      const phoneRes = await pool.query(
        'SELECT name, phone, address FROM customers WHERE phone = $1',
        [normalizedPhone]
      );
      if (phoneRes.rows.length > 0) {
        row = phoneRes.rows[0];
        // Bind this JID to the customer so future messages resolve via JID
        if (rawJid && rawJid.includes('@')) {
          await pool.query(
            'UPDATE customers SET whatsapp_jid = $1 WHERE phone = $2 AND (whatsapp_jid IS NULL OR whatsapp_jid = \'\')',
            [rawJid, row.phone]
          );
        }
      }
    }

    if (row) {
      // Cache full details in session
      if (session) {
        session.customerName    = row.name;
        session.customerPhone   = row.phone;  // ← always the real DB phone
        session.customerAddress = row.address;
      }
      return row.name;
    }

    // ── 3. New customer — auto-save with WhatsApp display name ──
    if (pushName && normalizedPhone) {
      // Always store only the normalized real phone (never LID/JID)
      await pool.query(
        'INSERT INTO customers (phone, name, whatsapp_jid) VALUES ($1, $2, $3) ON CONFLICT (phone) DO UPDATE SET name = $2, whatsapp_jid = COALESCE(customers.whatsapp_jid, $3)',
        [normalizedPhone, pushName, rawJid && rawJid.includes('@') ? rawJid : null]
      );
      console.log(`✅ Auto-saved new customer: ${pushName} (${normalizedPhone})`);
      if (session) {
        session.customerName  = pushName;
        session.customerPhone = normalizedPhone;
      }
      return pushName;
    }

    if (session) session.customerName = 'Customer';
    return 'Customer';
  } catch (error) {
    console.error('❌ Error getting customer name:', error.message);
    return pushName || 'Customer';
  }
};

// ========================
// CHAT LOGGING
// ========================
const logChatMessage = async (phone, direction, message, customerName = null) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return;

  let name = customerName;
  if (!name) {
    name = await getCustomerName(phone);
  }

  try {
    await pool.query(
      `INSERT INTO chat_logs (phone, customer_name, direction, message)
       VALUES ($1, $2, $3, $4)`,
      [normalizedPhone, name || 'Unknown', direction, message]
    );
  } catch (error) {
    console.error('❌ Chat log error:', error.message);
  }
};

// ========================
// SEND WHATSAPP + LOG OUTGOING
// ========================
const sendWAMessage = async (to, messageObj, customerName = null) => {
  if (!sock) {
    console.error('❌ sendWAMessage: WhatsApp socket not ready');
    return;
  }
  try {
    await sock.sendMessage(to, messageObj);
    const text = messageObj.text || '[media/other]';
    console.log(`📤 Sent to ${to}: "${String(text).substring(0, 60)}"`);
    await logChatMessage(to, 'outgoing', text, customerName);
  } catch (err) {
    console.error(`❌ sendWAMessage failed (to: ${to}):`, err.message);
  }
};

const saveOrderToCSV = (timestamp, name, phone, items, total) => {
  const csvPath = path.join(__dirname, 'orders.csv');
  const fileExists = fs.existsSync(csvPath);
  
  try {
    let csvContent = '';
    
    // Add header if file doesn't exist
    if (!fileExists) {
      csvContent = 'Timestamp,Name,Phone,Items,Total,Status\n';
    }
    
    // Escape CSV content properly
    const escapedItems = `"${items.replace(/"/g, '""')}"`;
    
    csvContent += `${timestamp},${name},${phone},${escapedItems},${total},confirmed\n`;
    
    // Append to file
    fs.appendFileSync(csvPath, csvContent);
    console.log(`✅ Order saved to CSV`);
  } catch (error) {
    console.error('❌ CSV write error:', error.message);
  }
};

// ========================
// CRON JOB - 9 AM MENU BROADCAST (Called once at startup)
// ========================
const initializeCronJob = () => {
  if (cronJobScheduled) return; // Already scheduled
  
  cronJobScheduled = true;
  
  cron.schedule('0 9 * * *', async () => {
    console.log('📢 Broadcasting menu at 9 AM...');

    try {
      // Use DB whatsapp_contacts view — plain phone digits, real name, no @lid or encoding
      const result = await pool.query('SELECT name, phone FROM whatsapp_contacts');
      const customers = result.rows;

      if (customers.length === 0) {
        console.log('⚠️ No customers in database for broadcast');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const customer of customers) {
        try {
          // Phone stored as plain digits — append @s.whatsapp.net for WhatsApp JID
          const jid = `${customer.phone}@s.whatsapp.net`;
          const menuText = generateMenuMessage();
          await sock.sendMessage(jid, { text: menuText });
          // Log broadcast as outgoing chat
          await logChatMessage(customer.phone, 'outgoing', menuText, customer.name);
          console.log(`✅ Menu sent to ${customer.name} (${customer.phone})`);
          successCount++;
          // Small delay to avoid WhatsApp rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Failed to send to ${customer.phone}: ${error.message}`);
          failCount++;
        }
      }
      console.log(`✅ Daily menu broadcast completed! Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error('❌ Broadcast error:', error.message);
    }
  });
};

// ========================
// SOCKET.IO
// ========================
io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`);
  
  socket.emit('connectionStatus', { status: connectionStatus });
  if (qrCodeUrl) {
    socket.emit('qrCode', qrCodeUrl);
  }
  
  socket.on('disconnect', () => {
    console.log(`👤 Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error.message);
  });
});

// ========================
// API ROUTES
// ========================

app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qrCode: qrCodeUrl
  });
});

app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone, name, address, created_at FROM customers ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:phone', async (req, res) => {
  let { phone } = req.params;
  phone = decodeURIComponent(phone);
  
  // ✅ NEW: Normalize phone number
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM customers WHERE phone = $1',
      [normalizedPhone]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log(`✅ Customer deleted: ${normalizedPhone}`);
    res.json({ success: true, message: 'Customer deleted', changes: result.rowCount });
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// ADD CUSTOMER (POST)
// ========================
app.post('/api/customers', async (req, res) => {
  const { phone, name, address } = req.body;

  // Validate required fields
  if (!phone || !name) {
    return res.status(400).json({ 
      error: 'Phone and name are required',
      format: {
        phone: '919876543210 (digits only, 10+ digits)',
        name: 'Customer Name',
        address: 'Optional address'
      }
    });
  }

  // Normalize phone number
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ 
      error: 'Invalid phone number format',
      example: '919876543210 or 9876543210'
    });
  }

  try {
    // Insert or update customer
    const result = await pool.query(
      `INSERT INTO customers (phone, name, address, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (phone) DO UPDATE
         SET name = EXCLUDED.name,
             address = COALESCE(EXCLUDED.address, customers.address),
             updated_at = CURRENT_TIMESTAMP
       RETURNING id, phone, name, address`,
      [normalizedPhone, name.trim(), address?.trim() || null]
    );

    console.log(`✅ Customer ${result.rows[0].name} added/updated: ${normalizedPhone}`);
    res.status(201).json({
      success: true,
      customer: result.rows[0],
      message: 'Customer added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding customer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/export', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, timestamp, name, phone, items, total_price, status FROM orders ORDER BY timestamp DESC'
    );
    const csv = generateCSV(result.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM for Excel — preserves Indian names correctly
  } catch (error) {
    console.error('❌ Error exporting CSV:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: parse JSONB items into human-readable string
const formatItemsReadable = (rawItems) => {
  try {
    const arr = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
    if (!Array.isArray(arr)) return String(rawItems);
    // Merge duplicate items before display
    const map = new Map();
    for (const i of arr) {
      const key = i.id != null ? i.id : i.name;
      if (map.has(key)) {
        const ex = map.get(key);
        ex.quantity = (ex.quantity || 1) + (i.quantity || 1);
      } else {
        map.set(key, { ...i });
      }
    }
    return Array.from(map.values()).map(i => `${i.name}×${i.quantity}`).join(', ');
  } catch { return String(rawItems); }
};

const generateCSV = (orders) => {
  let csv = 'Order ID,Date & Time,Customer Name,Phone,Items,Total Price,Status\n';
  orders.forEach(order => {
    const readable = formatItemsReadable(order.items).replace(/"/g, '""');
    const ts = new Date(order.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    csv += `${order.id},"${ts}","${order.name}","${order.phone}","${readable}",${order.total_price},"${order.status}"\n`;
  });
  return csv;
};

// ========================
// CSV HELPERS — Customers & Chats
// ========================

const generateCustomersCSV = (customers) => {
  // Phone stored as plain digits (e.g. 919876543210) — output as-is, no encoding
  let csv = 'ID,Name,WhatsApp Phone,Address,Created At\n';
  customers.forEach(c => {
    const name    = (c.name    || '').replace(/"/g, '""');
    const address = (c.address || '').replace(/"/g, '""');
    csv += `${c.id},"${name}","${c.phone}","${address}","${c.created_at}"\n`;
  });
  return csv;
};

const generateChatsCSV = (chats) => {
  let csv = 'Phone,Customer Name,Direction,Message,Timestamp\n';
  chats.forEach(chat => {
    const name    = (chat.customer_name || '').replace(/"/g, '""');
    const message = (chat.message       || '').replace(/"/g, '""');
    csv += `"${chat.phone}","${name}","${chat.direction}","${message}","${chat.created_at}"\n`;
  });
  return csv;
};

// ========================
// CUSTOMERS CSV EXPORT — plain WhatsApp name + number, no encoding
// ========================
app.get('/api/customers/export', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, address, created_at FROM whatsapp_contacts'
    );
    const csv = generateCustomersCSV(result.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp_contacts.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM for Excel
  } catch (error) {
    console.error('❌ Error exporting customers CSV:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// CHAT LOGS API
// ========================
app.get('/api/chats', async (req, res) => {
  try {
    const { phone, limit = 200, offset = 0 } = req.query;
    let query;
    let params;

    if (phone) {
      const normalizedPhone = normalizePhone(decodeURIComponent(phone));
      query  = `SELECT id, phone, customer_name, direction, message, created_at
                FROM chat_logs WHERE phone = $1
                ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params = [normalizedPhone, parseInt(limit), parseInt(offset)];
    } else {
      query  = `SELECT id, phone, customer_name, direction, message, created_at
                FROM chat_logs
                ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params = [parseInt(limit), parseInt(offset)];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching chats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/export', async (req, res) => {
  try {
    const { phone } = req.query;
    let query;
    let params = [];

    if (phone) {
      const normalizedPhone = normalizePhone(decodeURIComponent(phone));
      query  = `SELECT phone, customer_name, direction, message, created_at
                FROM chat_logs WHERE phone = $1 ORDER BY created_at ASC`;
      params = [normalizedPhone];
    } else {
      query = `SELECT phone, customer_name, direction, message, created_at
               FROM chat_logs ORDER BY created_at DESC`;
    }

    const result = await pool.query(query, params);
    const csv    = generateChatsCSV(result.rows);
    const fname  = phone ? `chat_${normalizePhone(phone)}.csv` : 'chat_logs.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('❌ Error exporting chats CSV:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// COMBINED CONTACTS + CHAT ACTIVITY EXPORT
// ========================
// Helper: merge duplicate items in a JSONB array and return readable string
const mergeAndFormatItems = (rawItems) => {
  try {
    const arr = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    // Merge duplicates
    const map = new Map();
    for (const item of arr) {
      const key = item.id || item.name;
      if (map.has(key)) {
        const ex = map.get(key);
        ex.quantity = (ex.quantity || 1) + (item.quantity || 1);
        ex.lineTotal = (ex.price || 0) * ex.quantity;
      } else {
        map.set(key, { ...item });
      }
    }
    return Array.from(map.values()).map(i => `${i.name} ×${i.quantity}`).join(', ');
  } catch { return String(rawItems || ''); }
};

app.get('/api/combined/export', async (req, res) => {
  try {
    // Combined query: contacts + chat stats + order stats
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.address,
        c.created_at                                               AS joined,
        COUNT(DISTINCT cl.id)                                      AS total_chats,
        SUM(CASE WHEN cl.direction = 'incoming' THEN 1 ELSE 0 END) AS msgs_received,
        SUM(CASE WHEN cl.direction = 'outgoing' THEN 1 ELSE 0 END) AS msgs_sent,
        MAX(cl.created_at)                                         AS last_chat,
        COUNT(DISTINCT o.id)                                       AS total_orders,
        COALESCE(SUM(o.total_price), 0)                            AS total_spent,
        MAX(o.timestamp)                                           AS last_order
      FROM whatsapp_contacts c
      LEFT JOIN chat_logs cl ON cl.phone = c.phone
      LEFT JOIN orders     o  ON o.phone  = c.phone
      GROUP BY c.id, c.name, c.phone, c.address, c.created_at
      ORDER BY c.name ASC
    `);

    let csv = 'Customer Name,WhatsApp Phone,Address,Added On,Total Chats,Msgs Received,Msgs Sent,Last Chat,Total Orders,Total Spent (₹),Last Order\n';
    result.rows.forEach(r => {
      const name     = (r.name    || '').replace(/"/g, '""');
      const address  = (r.address || '').replace(/"/g, '""');
      const joined   = r.joined     ? new Date(r.joined).toLocaleString('en-IN',     { timeZone: 'Asia/Kolkata' }) : '';
      const lastChat = r.last_chat  ? new Date(r.last_chat).toLocaleString('en-IN',  { timeZone: 'Asia/Kolkata' }) : 'No chats';
      const lastOrd  = r.last_order ? new Date(r.last_order).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'No orders';
      csv += `"${name}","${r.phone}","${address}","${joined}",${r.total_chats || 0},${r.msgs_received || 0},${r.msgs_sent || 0},"${lastChat}",${r.total_orders || 0},${parseFloat(r.total_spent || 0).toFixed(2)},"${lastOrd}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="swasth_contacts_orders_activity.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('❌ Error exporting combined CSV:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// ORDERS WITH CUSTOMER DETAILS EXPORT (merged items, correct phone)
// ========================
app.get('/api/orders/full-export', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, timestamp, name, phone, items, total_price, status FROM orders ORDER BY timestamp DESC'
    );
    let csv = 'Order ID,Date & Time (IST),Customer Name,WhatsApp Phone,Items,Total (₹),Status\n';
    result.rows.forEach(order => {
      const readable = mergeAndFormatItems(order.items).replace(/"/g, '""');
      const ts       = new Date(order.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const name     = (order.name || '').replace(/"/g, '""');
      csv += `${order.id},"${ts}","${name}","${order.phone}","${readable}",${parseFloat(order.total_price || 0).toFixed(2)},"${order.status || 'pending'}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders_full.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('❌ Error exporting full orders CSV:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3001;

// Prevent Node.js from exiting when WhatsApp disconnects.
// The HTTP server keeps the event loop alive, but an explicit interval
// guarantees it even during a reconnect gap.
const _keepAlive = setInterval(() => {}, 60_000);
_keepAlive.unref(); // Don't block intentional shutdown

server.listen(PORT, async () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log('🍽️  SWASTH ORDER AGENT - Server Started');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
  console.log('\n🔄 Initializing WhatsApp Connection...');
  console.log('─────────────────────────────────────────────');
  
  await connectWhatsApp();
});

process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down gracefully...');
  clearInterval(_keepAlive);
  pool.end(() => {
    console.log('✅ PostgreSQL connection pool closed');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});
