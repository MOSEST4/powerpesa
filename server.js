const express = require('express');
const axios   = require('axios');
require('dotenv').config();
const app     = express();

app.use(express.json());

// ── Config ─────────────────────────────────────────────────────────────────
const MARZPAY_BASE  = 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH  = 'bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';
const PROXY_KEY     = 'powerpesa_2025_proxy_key';
const GROQ_KEY     = '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';

// ── CORS ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Proxy-Key, Cache-Control, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Auth middleware ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const open = ['/', '/health'];
  if (open.includes(req.path)) return next();
  if (req.headers['x-proxy-key'] !== PROXY_KEY) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }
  next();
});

// ── Shared MarzPay headers ─────────────────────────────────────────────────
const marzHeaders = {
  'Authorization': `Basic ${MARZPAY_AUTH}`,
  'Content-Type':  'application/json',
  'Accept':        'application/json',
  'Cache-Control': 'no-cache',
};

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.json({
  status:  'ok',
  service: 'PowerPesa Proxy v1.0.0',
  routes:  ['/health', '/bill-payment/verify', '/bill-payment', '/bill-payment/:reference', '/balance', '/collect', '/status/:uuid', '/ai/chat'],
}));

app.get('/health', async (_, res) => {
  try {
    const r = await axios.get('https://api.ipify.org?format=json');
    res.json({ status: 'ok', service: 'PowerPesa Proxy v1.0.0', ip: r.data.ip });
  } catch {
    res.json({ status: 'ok', service: 'PowerPesa Proxy v1.0.0' });
  }
});

// ── Bill Payment: Verify Meter ─────────────────────────────────────────────
// POST /bill-payment/verify  { utility_code: "LIGHT", meter_number: "123456789" }
app.post('/bill-payment/verify', async (req, res) => {
  try {
    console.log('[VERIFY] ->', JSON.stringify(req.body));
    const r = await axios.post(
      `${MARZPAY_BASE}/bill-payment/verify`,
      req.body,
      { headers: marzHeaders }
    );
    console.log('[VERIFY] <-', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[VERIFY] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── Bill Payment: Initiate Payment ─────────────────────────────────────────
// POST /bill-payment  { reference, utility_code, meter_number, phone_number, amount, customer_name, email }
app.post('/bill-payment', async (req, res) => {
  try {
    console.log('[BILL-PAYMENT] ->', JSON.stringify(req.body));
    const r = await axios.post(
      `${MARZPAY_BASE}/bill-payment`,
      req.body,
      { headers: marzHeaders }
    );
    console.log('[BILL-PAYMENT] <-', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BILL-PAYMENT] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── Bill Payment: Get Transaction Details ──────────────────────────────────
// GET /bill-payment/:reference
app.get('/bill-payment/:reference', async (req, res) => {
  try {
    const r = await axios.get(
      `${MARZPAY_BASE}/bill-payment/${req.params.reference}`,
      { headers: marzHeaders }
    );
    console.log('[BILL-DETAIL]', req.params.reference, '->', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BILL-DETAIL] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── Bill Payment: List Transactions ────────────────────────────────────────
// GET /bill-payments?status=&utility_code=&page=&per_page=
app.get('/bill-payments', async (req, res) => {
  try {
    const r = await axios.get(
      `${MARZPAY_BASE}/bill-payment`,
      { headers: marzHeaders, params: req.query }
    );
    res.json(r.data);
  } catch (e) {
    console.error('[BILL-LIST] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── Bill Payment: Get Available Services ───────────────────────────────────
app.get('/bill-payment/services', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── MarzPay: Collect (STK push for mobile money) ───────────────────────────
// POST /collect  { phone_number, amount, narrative, reference, country }
app.post('/collect', async (req, res) => {
  try {
    console.log('[COLLECT] ->', JSON.stringify(req.body));
    const r = await axios.post(
      `${MARZPAY_BASE}/collect-money`,
      req.body,
      { headers: marzHeaders }
    );
    console.log('[COLLECT] <-', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[COLLECT] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── MarzPay: Status check ──────────────────────────────────────────────────
// GET /status/:uuid
app.get('/status/:uuid', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const url = `${MARZPAY_BASE}/collect-money/${req.params.uuid}?_t=${Date.now()}`;
    const r   = await axios.get(url, {
      headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' },
    });
    console.log('[STATUS]', req.params.uuid, '->', r.data?.status);
    res.json(r.data);
  } catch (e) {
    console.error('[STATUS] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── MarzPay: Account Balance ───────────────────────────────────────────────
app.get('/balance', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/balance`, { headers: marzHeaders });
    console.log('[BALANCE] <-', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BALANCE] ERROR', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ── Groq AI: Chat completion ───────────────────────────────────────────────
// POST /ai/chat  { messages: [{role, content}], model?, temperature? }
app.post('/ai/chat', async (req, res) => {
  try {
    const { messages, model = 'llama-3.3-70b-versatile', temperature = 0.7 } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ status: 'error', message: 'messages array required' });
    }

    const r = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model, temperature, messages },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type':  'application/json',
        },
        timeout: 30000,
      }
    );

    const text = r.data?.choices?.[0]?.message?.content ?? '';
    res.json({ status: 'ok', content: text });
  } catch (e) {
    console.error('[AI]', e.message, e.response?.data);
    res.status(500).json({ status: 'error', message: e.response?.data?.error?.message ?? e.message });
  }
});

// ── EGO SMS: Send SMS ──────────────────────────────────────────────────────
// POST /sms  { phone, message }
app.post('/sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ status: 'error', message: 'phone and message required' });
    }

    const number = phone.replace(/[\s\-\(\)\+]/g, '').replace(/^0/, '256');
    const url = `https://www.egosms.co/api/v1/plain/?number=${number}&message=${encodeURIComponent(message)}&username=INFINITECH&password=${encodeURIComponent('Moses,123##')}&sender=PowerPesa`;

    const r = await axios.get(url, { timeout: 15000 });
    console.log('[SMS]', number, '->', r.status);
    res.json({ status: 'ok', message: 'SMS sent' });
  } catch (e) {
    console.error('[SMS] ERROR', e.message);
    res.json({ status: 'error', message: e.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PowerPesa Proxy v1.0.0 running on port ${PORT}`));
