const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const pool = require('./db'); 
const userRoutes = require('./routes/userRoutes');
const eventoRoutes = require('./routes/eventoRoutes');

const app = express();
const port = 5000;

const cron = require('node-cron');

// Agendar a remoção de assinaturas inválidas para ser executada a cada hora
cron.schedule('0 * * * *', async () => {
  console.log('Running task to remove invalid subscriptions');
  await removeInvalidSubscriptions();
});


app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());

const webpush = require('web-push');

// Substitua essas chaves pelas suas chaves geradas pelo VAPID
const publicVapidKey = "BIDByJJTac6ThaHCPJVS1pszWZVVqvCyCfbL68BEogxfT9MO8Swu5ouZtambPZDgo-cEOMejCAvoViWn6zpX8ig";
const privateVapidKey = "EsSOzOUAX0JjKed_8hP7P43S7MmGa1Nv4TSA7YzO8YA";

webpush.setVapidDetails('mailto:giulianerodrigues.ch297@academico.ifsul.edu.br', publicVapidKey, privateVapidKey);

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, 
}));

app.use('/api/users', userRoutes);
app.use('/api/events', eventoRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
