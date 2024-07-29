const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');

router.get('/dashboard', alertaController.getAlertas);

router.post('/add-alerta', alertaController.addAlerta);

module.exports = router;
