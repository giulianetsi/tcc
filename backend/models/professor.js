const db = require('../server');

class Professor {
    constructor(nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, cursos, login) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.email = email;
        this.telefone = telefone;
        this.dataNascimento = dataNascimento;
        this.senha = senha;
        this.cpf = cpf;
        this.tipo = tipo;
        this.cursos = cursos;
        this.login = login;
    }

    static criar(data, callback) {
        const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, cursos, login } = data;
        const query = 'INSERT INTO usuarios (nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [nome, sobrenome, email, telefone, dataNascimento, login, senha, cpf, tipo], (err, result) => {
            if (err) {
                return callback(err);
            }
            const userId = result.insertId;

            // Inserindo dados específicos de professor na tabela professores
            const professorQuery = 'INSERT INTO professores (professor_id, cursos) VALUES (?, ?)';
            db.query(professorQuery, [userId, cursos], (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, userId);
            });
        });
    }

    static criarTabelaProfessores() {
        const query = `
            CREATE TABLE IF NOT EXISTS professores (
                professor_id INT PRIMARY KEY,
                cursos VARCHAR(255) NOT NULL,
                FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `;
        
        db.query(query, (err, result) => {
            if (err) {
                console.error('Erro ao criar tabela de professores:', err);
            } else {
                console.log('Tabela de professores criada ou já existe.');
            }
        });
    }
}

module.exports = Professor;
