const express = require('express');
const { registerUser, loginUser, logoutUser, subscribe } = require('../controllers/userController');

const router = express.Router();

router.post('/register-user', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/subscribe', subscribe);

module.exports = router;
