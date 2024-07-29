const User = require('../models/user');
const bcrypt = require('bcryptjs');
const path = require('path');

const getRegisterUser = (req, res) => {
    if (req.session.user && req.session.user.tipo === 'admin') {
        res.sendFile(path.join(__dirname, '../views', 'register-user.html'));
    } else {
        res.status(403).send('Forbidden');
    }
};

const registerUser = (req, res) => {
    if (req.session.user && req.session.user.tipo === 'admin') {
        const { nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo } = req.body;
        const hashedPassword = bcrypt.hashSync(senha, 10);
        const newUser = { nome, sobrenome, email, telefone, dataNascimento, login, senha: hashedPassword, cpf, tipo };
        User.insertUser(newUser, (userId) => {
            res.redirect('/dashboard');
        });
    } else {
        res.status(403).send('Forbidden');
    }
};

module.exports = {
    getRegisterUser,
    registerUser,
};
