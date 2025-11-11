const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const pool = require('./db'); 
const userRoutes = require('./routes/userRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const groupRoutes = require('./routes/groupRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { removeInvalidSubscriptions } = require('./controllers/userController');
const { startScheduledNotificationsWorker } = require('./cron/scheduledNotificationsWorker');

const app = express();
// Load .env in development for convenience
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (e) { /* ignore if dotenv not installed */ }
}

const port = process.env.PORT || 5000;

const cron = require('node-cron');

// Parse cookies (used by auth middleware)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Agendar a remoção de assinaturas inválidas para ser executada a cada hora
// Executar este job de manutenção apenas em produção para evitar o envio de
// notificações 'health-check' durante o desenvolvimento local.
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 * * * *', async () => {
    console.log('Executando tarefa para remover subscriptions inválidas');
    await removeInvalidSubscriptions();
  });
} else {
  console.log('Skipping removeInvalidSubscriptions cron job in non-production NODE_ENV');
}

// Iniciar worker responsável por notificações agendadas (apenas em produção)
startScheduledNotificationsWorker();


// CORS: permitir origem configurável e enviar credenciais (cookies)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision']
};
app.use(cors(corsOptions));
// Habilitar resposta a preflight CORS para todas as rotas
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

const webpush = require('web-push');

// VAPID keys must be provided via environment variables in production.
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;
const vapidContact = process.env.VAPID_CONTACT || 'mailto:giulianerodrigues.ch297@academico.ifsul.edu.br';

// Fail-fast in production when critical secrets are missing
if (process.env.NODE_ENV === 'production') {
  if (!privateVapidKey) {
    console.error('ERROR: PRIVATE_VAPID_KEY is not set. Set PRIVATE_VAPID_KEY in the environment before starting in production.');
    process.exit(1);
  }
  if (!process.env.SESSION_SECRET) {
    console.error('ERROR: SESSION_SECRET is not set. Set SESSION_SECRET in the environment before starting in production.');
    process.exit(1);
  }
}

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidContact, publicVapidKey, privateVapidKey);
} else {
  console.warn('VAPID keys not configured. Push notifications will not work until PUBLIC_VAPID_KEY and PRIVATE_VAPID_KEY are set.');
}

app.use(session({
  // Em desenvolvimento usamos um fallback para conveniência; em produção o
  // servidor abortará se SESSION_SECRET não estiver definido (veja as checagens acima).
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use('/api/users', userRoutes);
app.use('/api/events', eventoRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Log pending scheduled notifications once at startup for debugging convenience
  (async () => {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM scheduled_notifications WHERE sent = 0');
      const cnt = rows && rows[0] ? rows[0].cnt : 0;
      console.log(`Startup: pending scheduled_notifications = ${cnt}`);
    } catch (e) {
      console.warn('Startup: could not query scheduled_notifications count', e && e.message);
    }
  })();
});
