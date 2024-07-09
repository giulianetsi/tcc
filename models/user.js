const bcrypt = require('bcrypt');
const db = require('../server');

function criarTabelaUsuarios() {
    const sql = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            sobrenome VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            telefone VARCHAR(20),
            dataNascimento DATE,
            login VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            cpf VARCHAR(11) UNIQUE NOT NULL,
            tipo ENUM('aluno', 'professor', 'responsavel', 'admin') NOT NULL
        )
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Erro ao criar tabela de usuários:', err);
        } else {
            console.log('Tabela de usuários criada com sucesso.');
        }
    });
}

function create(newUser, callback) {
    const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login } = newUser;
    const sql = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login];
    
    db.query(sql, values, (err, result) => {
        if (err) {
            return callback(err);
        }
        console.log(`Usuário criado com sucesso: ${result.insertId}`);
        return callback(null);
    });
}


function findByLogin(login, callback) {
    const query = 'SELECT * FROM usuarios WHERE login = ?';
    db.query(query, [login], (err, results) => {
        if (err) {
            return callback(err);
        }
        if (results.length === 0) {
            return callback(null, null); // usuario não encontrado
        }
        const user = results[0];
        return callback(null, user);
    });
}

module.exports = {
    criarTabelaUsuarios,
    create,
    findByLogin
};
