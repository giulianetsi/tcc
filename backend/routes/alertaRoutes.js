const express = require('express');
const { addAlerta, getAlertas } = require('../controllers/alertaController');

const router = express.Router();

router.post('/add', addAlerta);
router.get('/', getAlertas);

module.exports = router;
