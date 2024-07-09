const db = require('../server');

class Aluno {
    constructor(nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, turma, matricula, login) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.email = email;
        this.telefone = telefone;
        this.dataNascimento = dataNascimento;
        this.senha = senha;
        this.cpf = cpf;
        this.tipo = tipo;
        this.turma = turma;
        this.matricula = matricula;
        this.login = login;
    }

    static criar(data, callback) {
        const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, turma, matricula, login } = data;
        const query = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo], (err, result) => {
            if (err) {
                return callback(err);
            }
            const userId = result.insertId;

            // Inserindo dados específicos de aluno na tabela alunos
            const alunoQuery = 'INSERT INTO alunos (aluno_id, turma, matricula) VALUES (?, ?, ?)';
            db.query(alunoQuery, [userId, turma, matricula], (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, userId);
            });
        });
    }

    static criarTabelaAlunos() {
        const query = `
            CREATE TABLE IF NOT EXISTS alunos (
                aluno_id INT PRIMARY KEY,
                turma VARCHAR(255) NOT NULL,
                matricula VARCHAR(255) UNIQUE NOT NULL,
                FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `;
        
        db.query(query, (err, result) => {
            if (err) {
                console.error('Erro ao criar tabela de alunos:', err);
            } else {
                console.log('Tabela de alunos criada ou já existe.');
            }
        });
    }
}

module.exports = Aluno;
