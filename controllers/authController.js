const bcrypt = require('bcryptjs');
const User = require('../models/user');

const login = (req, res) => {
    const { username, password } = req.body;
    User.findUserByUsername(username, (user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    });
};

const register = (req, res) => {
    if (req.session.user.type !== 'admin') {
        return res.status(403).send('Forbidden');
    }
    const { username, type, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    User.insertUser(username, type, hashedPassword, () => {
        res.redirect('/dashboard');
    });
};

module.exports = {
    login,
    register,
};
