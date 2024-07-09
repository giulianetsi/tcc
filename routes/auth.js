const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

app.get('/login', (req, res) => {
    res.render('login'); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        const user = results[0];
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    });
});


router.get('/register', (req, res) => {
    if (req.session.user.type !== 'admin') {
        return res.status(403).send('Forbidden');
    }
    res.sendFile(path.join(__dirname, '../views', 'register.html'));
});

router.post('/register', authController.register);

module.exports = router;
