const db = require('../server');

class Admin {
    constructor(nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.email = email;
        this.telefone = telefone;
        this.dataNascimento = dataNascimento;
        this.senha = senha;
        this.cpf = cpf;
        this.tipo = tipo;
        this.login = login;
    }

    static criarAdmin(data, callback) {
        const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login } = data;
        const query = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo], (err, result) => {
            if (err) {
                return callback(err);
            }
            const adminId = result.insertId;
            return callback(null, adminId);
        });
    }

    static criarTabelaAdmin() {
        const sql = `
            CREATE TABLE IF NOT EXISTS admin (
                admin_id INT PRIMARY KEY AUTO_INCREMENT,
                FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `;
        
        db.query(sql, (err, result) => {
            if (err) {
                console.error('Erro ao criar tabela de administradores:', err);
            } else {
                console.log('Tabela de administradores criada com sucesso.');
            }
        });
    }
}

module.exports = Admin;
