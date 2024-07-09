const db = require('../server');

class Responsavel {
    constructor(nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, parentesco, cpfAluno, login) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.email = email;
        this.telefone = telefone;
        this.dataNascimento = dataNascimento;
        this.senha = senha;
        this.cpf = cpf;
        this.tipo = tipo;
        this.parentesco = parentesco;
        this.cpfAluno = cpfAluno;
        this.login = login;
    }

    static criar(data, callback) {
        const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, parentesco, cpfAluno, login } = data;
        const query = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo], (err, result) => {
            if (err) {
                return callback(err);
            }
            const userId = result.insertId;

            // Inserindo dados específicos de responsável na tabela responsaveis
            const responsavelQuery = 'INSERT INTO responsaveis (responsavel_id, parentesco, aluno_resp_id) VALUES (?, ?, ?)';
            db.query(responsavelQuery, [userId, parentesco, cpfAluno], (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, userId);
            });
        });
    }

    static criarTabelaResponsaveis() {
        const query = `
            CREATE TABLE IF NOT EXISTS responsaveis (
                responsavel_id INT PRIMARY KEY,
                parentesco VARCHAR(255) NOT NULL,
                aluno_resp_id INT NOT NULL,
                FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (aluno_resp_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `;
        
        db.query(query, (err, result) => {
            if (err) {
                console.error('Erro ao criar tabela de responsáveis:', err);
            } else {
                console.log('Tabela de responsáveis criada ou já existe.');
            }
        });
    }
}

module.exports = Responsavel;
