const express = require('express');
const { addEvento, getEventos, updateEvento, deleteEvento } = require('../controllers/eventoController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.post('/add-evento', authenticateToken, checkPermission('canCreateEvent'), addEvento);
router.get('/', authenticateToken, getEventos);
router.put('/:id', authenticateToken, updateEvento);
router.delete('/:id', authenticateToken, deleteEvento);

module.exports = router;
