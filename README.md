# TCC - Sistema de Eventos IFSUL

Resumo rápido
- Backend: Node.js + Express + MySQL (mysql2/promise)
- Frontend: React (Create React App)
- Push: Web Push (VAPID, web-push)

Arquivos principais
- `backend/` - servidor Express, controladores, rotas e configuração do banco.
- `frontend/` - aplicação React.
- `database.sql` - script com o esquema (usar para criar as tabelas).
- `docs/SYSTEM_DOCUMENTATION.md` - documentação completa do sistema (instalação, arquitetura, troubleshooting).

Variáveis de ambiente 
- `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` 
- `JWT_SECRET` - segredo JWT para assinaturas
- `SESSION_SECRET` - secret usado por express-session
- `PUBLIC_VAPID_KEY` e `PRIVATE_VAPID_KEY` - chaves VAPID para Web Push
- `FRONTEND_ORIGIN` - origem do frontend para CORS 
