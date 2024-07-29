const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/register-user', userController.getRegisterUser);
router.post('/register-user', userController.registerUser);

module.exports = router;
