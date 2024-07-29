const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// configuração do bd
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'tcc1'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.stack);
        return;
    }
    console.log('Conectado ao banco de dados MySQL.');
});

module.exports = db;

const User = require('./models/user');
const Aluno = require('./models/aluno');
const Professor = require('./models/professor');
const Responsavel = require('./models/responsavel');
const Admin = require('./models/admin');


const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); // permite acesso se o usuário estiver autenticado
    } else {
        res.redirect('/login'); // redireciona para o login se não estiver autenticado
    }
};

// Criar tabelas
User.criarTabelaUsuarios();
Aluno.criarTabelaAlunos(); 
Professor.criarTabelaProfessores(); 
Responsavel.criarTabelaResponsaveis();
Admin.criarTabelaAdmin(); 

// Configurações do middleware e view engine
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de autenticação deve ser declarado antes das rotas que exigem autenticação
app.use((req, res, next) => {
    console.log(`Middleware global executado em ${new Date()}`);
    next();
});

// Rota de login
app.get('/login', (req, res) => {
    res.render('login'); 
});

app.post('/login', (req, res) => {
    const { login, senha } = req.body;
    console.log(`Tentativa de login para o usuário: ${login}`);

    db.query('SELECT * FROM usuarios WHERE login = ?', [login], (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário no banco de dados:', err);
            res.redirect('/login');
            return;
        }

        const user = results[0];
        if (user) {
            const passwordMatch = bcrypt.compareSync(senha, user.senha);
            console.log(`Senha correta? ${passwordMatch}`);
            
            if (passwordMatch) {
                console.log(`Login bem sucedido para o usuário: ${login}`);
                req.session.user = user;
                res.redirect('/dashboard');
            } else {
                console.log(`Login falhou para o usuário: ${login}`);
                res.redirect('/login');
            }
        } else {
            console.log(`Usuário não encontrado: ${login}`);
            res.redirect('/login');
        }
    });
});


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// rota para renderizar a pagina de inicio
app.get('/dashboard', isAuthenticated, (req, res) => {
    // verificar tipo do usuario autenticado
    const isAdmin = req.session.user.tipo === 'admin';

    // buscar alertas no banco
    const alertas = [
        { message: 'alerta 1' },
        { message: 'alerta 2' },
        { message: 'alerta 3' }
    ];

    res.render('dashboard', { username: req.session.user.nome, alertas: alertas, isAdmin: isAdmin });
});

// exibir o formulário de registro de usuario
app.get('/register-user', (req, res) => {
    res.render('register-user'); 
});

//processar o formulário de registro de usuário
app.post('/register-user', (req, res) => {
    const { nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo } = req.body;
    let login;

    // gerar login
    if (tipo === 'aluno') {
        const matricula = req.body.matricula;
        const lastDigits = matricula.slice(-3);
        login = `${nome}${sobrenome}.ch${lastDigits}`;
    } else {
        login = `${nome}${sobrenome}.ch1`; // login padrao inicial para tipos diferentes de aluno
    }

    // gerar outro login se já existir
    User.findByLogin(login, (err, existingUser) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            res.redirect('/register-user');
            return;
        }

        if (existingUser) {
            let count = 1;
            do {
                count++;
                login = `${nome}${sobrenome}.ch${count}`;
            } while (User.findByLoginSync(login)); 
        }

        // salvar o usuário no banco de acordo com o tipo selecionado
        switch (tipo) {
            case 'aluno':
                const { turma, matricula } = req.body;
                Aluno.criar({ nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, turma, matricula, login }, (err) => {
                    if (err) {
                        console.error('Erro ao registrar aluno:', err);
                        res.redirect('/register-user');
                        return;
                    }
                    console.log(`Aluno registrado com sucesso: ${nome} ${sobrenome}`);
                    res.redirect('/login'); // vai para o login após o registro
                });
                break;
            case 'professor':
                const { cursos } = req.body;
                Professor.criar({ nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, cursos, login }, (err) => {
                    if (err) {
                        console.error('Erro ao registrar professor:', err);
                        res.redirect('/register-user');
                        return;
                    }
                    console.log(`Professor registrado com sucesso: ${nome} ${sobrenome}`);
                    res.redirect('/login');
                });
                break;
            case 'responsavel':
                const { parentesco, cpfAluno } = req.body;
                Responsavel.criar({ nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, parentesco, cpfAluno, login }, (err) => {
                    if (err) {
                        console.error('Erro ao registrar responsável:', err);
                        res.redirect('/register-user');
                        return;
                    }
                    console.log(`Responsável registrado com sucesso: ${nome} ${sobrenome}`);
                    res.redirect('/login'); 
                });
                break;
            case 'admin':
                Admin.criarAdmin({ nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login }, (err) => {
                    if (err) {
                        console.error('Erro ao registrar administrador:', err);
                        res.redirect('/register-user');
                        return;
                    }
                    console.log(`Administrador registrado com sucesso: ${nome} ${sobrenome}`);
                    res.redirect('/login'); 
                });
                break;
            default:
                User.create({ nome, sobrenome, email, telefone, dataNascimento, senha, cpf, tipo, login }, (err) => {
                    if (err) {
                        console.error('Erro ao registrar usuário:', err);
                        res.redirect('/register-user');
                        return;
                    }
                    console.log(`Usuário registrado com sucesso: ${nome} ${sobrenome}`);
                    res.redirect('/login'); 
                });
                break;
        }
    });
});

const alertaRoutes = require('./routes/alertaRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/', alertaRoutes);
app.use('/', userRoutes);

// iniciar servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
