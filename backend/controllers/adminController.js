// controllers/adminController.js

const Admin = require('../models/admin');

// Função para criar um novo administrador
exports.createAdmin = (req, res) => {
    const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login } = req.body;

    const adminData = {
        nome,
        sobrenome,
        email,
        telefone,
        dataNascimento,
        senha, 
        cpf,
        tipo,
        login
    };

    Admin.criarAdmin(adminData, (err, result) => {
        if (err) {
            console.error('Erro ao criar administrador:', err);
            res.status(500).json({ message: 'Erro interno ao criar administrador.' });
        } else {
            res.status(201).json({ message: 'Administrador criado com sucesso.' });
        }
    });
};
