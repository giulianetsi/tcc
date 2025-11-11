# TCC - Sistema de Eventos (tcc-pt1)

Este repositório contém um sistema web para gerenciamento de eventos, usuários e grupos, com suporte a notificações push.

Resumo rápido
- Backend: Node.js + Express + MySQL (mysql2/promise)
- Frontend: React (Create React App)
- Push: Web Push (VAPID, web-push)

Arquivos principais
- `backend/` - servidor Express, controladores, rotas e configuração do banco.
- `frontend/` - aplicação React.
- `database.sql` - script com o esquema (usar para criar as tabelas).
- `docs/SYSTEM_DOCUMENTATION.md` - documentação completa do sistema (instalação, arquitetura, troubleshooting).

Variáveis de ambiente recomendadas
- `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` (substituir valores em `backend/db.js` em desenvolvimento)
- `JWT_SECRET` - segredo JWT para assinaturas
- `SESSION_SECRET` - secret usado por express-session
- `PUBLIC_VAPID_KEY` e `PRIVATE_VAPID_KEY` - chaves VAPID para Web Push
- `FRONTEND_ORIGIN` - origem do frontend para CORS (ex.: http://localhost:3000)

Como rodar localmente (powershell)
1. Backend

```powershell
cd backend
npm install
# configure as variáveis de ambiente (ex.: via .env ou export)
node server.js
```

2. Frontend

```powershell
cd frontend
npm install
npm start
```

Observações importantes
- Em desenvolvimento o servidor seta cookie `token` httpOnly ao realizar login; o frontend armazena metadados do usuário em `localStorage`.
- Certifique-se de usar HTTPS em produção para que Service Workers e Push funcionem corretamente.
- Mova credenciais e chaves para variáveis de ambiente em produção.

Documentação adicional e diagrama ER estão em `docs/`.

Se quiser, posso adicionar scripts de inicialização (docker-compose), criar um `README` separado para o `frontend/` e `backend/` ou gerar um Postman/ OpenAPI para a API.

Mais documentação detalhada foi adicionada em `docs/SYSTEM_DOCUMENTATION.md`.

Arquivo .env e chaves VAPID (rápido)
---------------------------------

Este projeto espera que variáveis sensíveis sejam fornecidas via variáveis de ambiente em produção. Para desenvolvimento você pode usar um arquivo `.env` local (não comitar!).

- Crie um `.env` local na raiz (ou configure suas variáveis no seu host):

	DATABASE_HOST=localhost
	DATABASE_USER=root
	DATABASE_PASSWORD=changeme
	DATABASE_NAME=tccdb
	SESSION_SECRET=uma_senha_forte
	JWT_SECRET=uma_senha_forte_para_jwt
	PUBLIC_VAPID_KEY=seu_public_vapid_key_aqui
	PRIVATE_VAPID_KEY=seu_private_vapid_key_aqui

- Para o frontend (Create React App) a chave pública VAPID precisa estar disponível em build time através da variável `REACT_APP_PUBLIC_VAPID_KEY`. Em CI você deve injetar essa variável no job de build (ex.: GitHub Actions). Não comite chaves privadas.

- Como gerar um par VAPID (local):

	npm install web-push -g
	node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(keys);"

	Copie `publicKey` para `PUBLIC_VAPID_KEY` / `REACT_APP_PUBLIC_VAPID_KEY` e `privateKey` para `PRIVATE_VAPID_KEY`.

Segurança e push
----------------
- Nunca comite `PRIVATE_VAPID_KEY`, `SESSION_SECRET`, `JWT_SECRET` ou senhas do banco.
- Se encontrar segredos expostos no histórico, gere novas chaves e rotacione credenciais imediatamente. Para remover histórico use `git filter-repo` ou `BFG Repo-Cleaner`.

