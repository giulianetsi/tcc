const express = require('express');
const { registerUser, loginUser, getDashboard } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/dashboard', getDashboard);

module.exports = router;
