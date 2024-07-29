# TCC1

## Configuração do Banco de Dados
1. Instale o MySQL.
2. Crie um banco de dados com o nome `tcc1`.
3. Crie um usuário com permissões adequadas para acessar o banco de dados.
4. Configure as credenciais do MySQL na sua aplicação Node.js.

## Inserir usuário admin
1. Execute o comando abaixo:
    'INSERT INTO `tcc1`.`usuarios` (`id`, `nome`, `sobrenome`, `email`, `telefone`, `dataNascimento`, `login`, `senha`, `cpf`, `tipo`) VALUES ('1', 'admin', 'admin', 'admin.admin@gmail.com', '123', '2000-03-27', 'admin', '$2a$12$GywqcbSfai.MudlR0nJrRetAP7x48TArbFX7msY0wznaQCpLoESQ.', '12345678909', 'admin');'

2. Acesse localhost:3000/login e acesse a aplicaçcão com login `admin` e senha `123`.

## Instalação
1. Clone o repositório:
   git clone https://github.com/giulianetsi/tcc-pt1