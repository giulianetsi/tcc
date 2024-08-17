const express = require('express');
const { addEvento, getEventos } = require('../controllers/eventoController');

const router = express.Router();

router.post('/add-evento', addEvento);
router.get('/', getEventos);

module.exports = router;
