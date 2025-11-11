# FAQ — Notificações e decisões de implementação

Este documento é a versão refinada do FAQ de notificações para este projeto. Ele reúne perguntas e respostas do nível básico ao avançado, exemplos práticos (comandos), trechos SQL de migração e um checklist de deploy. Arquivos de referência no repositório: `backend/server.js`, `backend/cron/scheduledNotificationsWorker.js`, `backend/controllers/userController.js`, `backend/tools/test_push.js`, `frontend/src/components/Login.js`, `frontend/public/service-worker.js`, e `.env.example`.

## Sumário rápido
- Objetivo: explicar o fluxo de Web Push, agendamento e decisões arquiteturais.
- Conteúdo: Conceitos, Fluxos, Comparações (por que X vs Y), Comandos úteis, SQL de migração e Checklist de deploy.

---

## 1 — Conceitos e localização do código (básico)

Q: O que o sistema de notificações faz?
A: Permite que o cliente (navegador) se inscreva para Web Push, que o backend armazene subscriptions e envie mensagens via VAPID. O sistema suporta envio imediato e agendamento (fila em tabela `scheduled_notifications`) processada por um worker.

Q: Onde estão as partes-chave no projeto?
A: Veja estes arquivos:
- Frontend: `frontend/src/components/Login.js` (registro e subscribe), `frontend/public/service-worker.js` (recebe `push` e `notificationclick`).
- Backend: `backend/server.js` (inicialização e VAPID), `backend/controllers/userController.js` (rota `POST /api/users/subscribe`), `backend/cron/scheduledNotificationsWorker.js` (worker/cron que processa `scheduled_notifications`).
- Ferramentas: `backend/tools/test_push.js` (envio manual para debug).

---

## 2 — Fluxos e validações (intermediário)

Q: Como o envio imediato difere do agendado?
A: Envio imediato chama `web-push.sendNotification()` durante o request de criação/edição do evento. Agendado grava um registro em `scheduled_notifications` com payload e `scheduled_at`; um worker executado periodicamente consulta registros pendentes e tenta enviar.

Q: Onde validar os dados de agendamento?
A: Valide no frontend (UX) e, criticamente, novamente no backend antes de inserir no banco: data não pode ser menor que `NOW()` (ou permitir com correção), payload deve ser JSON serializável, e o usuário deve ter permissão para disparar notificações.

Exemplo rápido de validação no backend (pseudo-code):

```js
// validar scheduled_at
const scheduledAt = new Date(req.body.scheduledNotificationDatetime);
if (isNaN(scheduledAt) || scheduledAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Data de agendamento inválida' });
}
```

---

## 3 — Comparações e decisões (avançado — por que X em vez de Y)

1) SQL como fila (`scheduled_notifications`) vs Redis + Bull
- Por que SQL: simples, sem dependências extras, fácil inspeção e backup com ferramentas já em uso.
- Por que Redis/Bull: melhor performance e features (retries, backoff, prioridade, UI). Ideal quando o throughput cresce.

Recomendação: começar com SQL para MVP; migrar para Redis/Bull quando perceber gargalos operacionais.

2) Chave pública VAPID embutida no bundle (build-time) vs fetch runtime `/vapidPublicKey`
- Build-time (atual): simples e rápido; `pushManager.subscribe()` não precisa de fetch adicional.
- Runtime: permite trocar a chave sem rebuild, mais flexível para migrações.

Recomendação: usar build-time se chaves mudam raramente; usar endpoint se precisar rotacionar com frequência.

3) Armazenar payload JSON (TEXT/JSON) vs normalizar em colunas
- JSON: flexível, rápido para implementar e adaptável a diferentes tipos de notificação.
- Normalizado: permite consultas analíticas e integridade na camada de dados.

Escolha: JSON para agilidade; normalização se previsibilidade e análises forem necessárias.

4) `web-push` self-hosted vs serviço externo (SaaS)
- Self-hosted: controle total, sem custos por mensagem; exige operação e escalonamento pelo time.
- SaaS: reduz esforço operacional, fornece retries/monitoramento, mas tem custo e lock-in.

---

## 4 — Comandos úteis e exemplos práticos

1) Gerar VAPID keys (Node.js, una vez):

```js
// node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Irá imprimir um objeto com `publicKey` e `privateKey` que você deve copiar.

2) Exemplo PowerShell — exportar variáveis de ambiente temporariamente (dev)

```powershell
$env:PUBLIC_VAPID_KEY = 'PUBLIC_KEY_HERE'
$env:PRIVATE_VAPID_KEY = 'PRIVATE_KEY_HERE'
$env:REACT_APP_PUBLIC_VAPID_KEY = 'PUBLIC_KEY_HERE' # para build do frontend
npm run start
```

3) Usar `backend/tools/test_push.js` (exemplo de uso)

```powershell
node backend/tools/test_push.js --endpoint "https://fcm.googleapis.com/...?" --p256dh "..." --auth "..." --payload '{"title":"Teste"}'
```

4) Exemplo de health-check simples no backend (Express):

# FAQ técnico — do básico ao avançado (versão completa)

Abaixo está a lista completa de perguntas e respostas — organizada por níveis — cobrindo definição de regras, arquitetura, implementação técnica, operações e decisões arquiteturais (por que X em vez de Y). Use isso como FAQ para documentação interna ou material de defesa do TCC.

------------------------------------------------------------

SEÇÃO A — Básico

1) O que é este projeto?
- Resposta: Uma aplicação web (frontend React + backend Node/Express) com suporte a notificações push via Web Push (VAPID) e um mecanismo de agendamento de notificações (`scheduled_notifications`). Usa MySQL para persistência.

2) Quais são os componentes principais do sistema?
- Resposta: Frontend React em `frontend/`, backend Node/Express em `backend/`, banco de dados MySQL, service worker em `frontend/public/service-worker.js`, e um worker/cron em `backend/cron/scheduledNotificationsWorker.js`.

3) Como o usuário ativa notificações push no navegador?
- Resposta: No login a aplicação registra o service worker, solicita permissão e, se concedido, chama `registration.pushManager.subscribe()` com a public VAPID key. A subscription (endpoint + chaves) é enviada ao backend via `POST /api/users/subscribe`.

4) Onde são armazenadas as subscriptions?
- Resposta: Em uma tabela `subscriptions` no banco (ver `database.sql`). Contém endpoint e chaves (p256dh, auth) vinculadas ao `user_id`.

5) O que é VAPID e por que é necessário?
- Resposta: VAPID (Voluntary Application Server Identification) é um par de chaves (público/privado) usado para autenticar mensagens Web Push com os provedores de push. O servidor mantém a private key; o cliente usa a public key para criar subscriptions.

------------------------------------------------------------

SEÇÃO B — Intermediário

6) Como funciona o envio imediato vs agendado de notificações?
- Resposta: Ao criar/editar um evento, o frontend pode solicitar envio imediato (envio direto via `web-push`) ou agendar uma notificação (armazenar em `scheduled_notifications`). O worker processa agendamentos e envia quando `scheduled_at` for atingido.

7) Onde está o worker que processa filas de notificações agendadas?
- Resposta: Em `backend/cron/scheduledNotificationsWorker.js`.

8) Como garantir que notificações agendadas não sejam programadas para o passado?
- Resposta: Validar no frontend e no backend: recusar datas no passado ou normalizar para `NOW()`/proporção aceitável. O worker também deve checar `scheduled_at` antes de enviar.

9) Como as credenciais sensíveis são fornecidas?
- Resposta: Através de variáveis de ambiente (documentadas em `.env.example`). Em dev pode-se usar `dotenv`. Em produção use secrets managers ou variáveis do ambiente do host.

10) O que faz `backend/tools/test_push.js`?
- Resposta: Um utilitário CLI para enviar uma notificação manual a uma subscription para testes e diagnóstico.

11) Como o frontend obtém a chave pública VAPID?
- Resposta: Via `process.env.REACT_APP_PUBLIC_VAPID_KEY` (build-time) ou, alternativamente, via endpoint do backend que retorna a chave pública.

12) Onde está a lógica de autorização/permissões?
- Resposta: Em `backend/middleware/auth.js` e na tabela `permissions` no DB; as rotas verificam permissões conforme necessário.

------------------------------------------------------------

SEÇÃO C — Avançado / Arquitetura e DB

13) Quais trade-offs existem entre enviar notificações diretamente e enfileirá-las?
- Resposta: Envio direto é simples e de baixa latência, mas pode bloquear requests e falhar sob carga. Enfileirar (DB/queue) desacopla envio, permite retries e observabilidade, mas adiciona complexidade operacional.

14) Como o worker trata falhas ao enviar notificações?
- Resposta: O worker tenta enviar, atualiza `attempts`/`last_error`, e deve implementar backoff; após exceder `max_attempts` mover para dead-letter.

15) Como evitar duplicação (envios múltiplos) para a mesma notificação?
- Resposta: Implementar locking transacional (ex.: `locked_at`), ou usar filas que suportam jobs únicos; atualizar status atômico antes do envio.

16) Como melhorar escalabilidade do envio de push?
- Resposta: Paralelizar por batches limitados, usar filas externas (Redis/Bull), distribuir workers com locking, monitorar métricas e usar serviços gerenciados se necessário.

17) É seguro manter VAPID private key no servidor?
- Resposta: Sim — deve ficar em secrets managers/variáveis de ambiente seguras. Nunca comitar no repo.

18) Estratégia para atualizar chave VAPID em produção?
- Resposta: Atualizar envs no servidor e re-build do frontend (ou retornar a public key via endpoint para evitar rebuild). Planejar re-subscribe dos clientes pois subscriptions podem depender da key usada no momento do subscribe.

19) Como o service worker lida com payloads de push?
- Resposta: Trata evento `push` e chama `self.registration.showNotification()`; deve lidar com payloads faltantes/malformados e executar `notificationclick` para navegação.

20) Como testar localmente notificações push?
- Resposta: `localhost` é exceção ao HTTPS; rode frontend/backend localmente, defina `REACT_APP_PUBLIC_VAPID_KEY`, e use `backend/tools/test_push.js`.

21) Como lidar com users que desinstalam o app ou revogam subscription?
- Resposta: Ao receber erros 404/410 do push, remover a subscription do DB automaticamente.

22) Como registrar métricas e logs úteis?
- Resposta: Logar attempts, erros, tempos; expor métricas (Prometheus) e criar alertas para taxas de erro/pending.

23) Como garantir que env vars críticas não faltem em produção?
- Resposta: Fail-fast na inicialização do servidor (checagem de PRIVATE_VAPID_KEY, SESSION_SECRET, DB), e usar validação no CI/CD.

24) Por que o frontend precisa do `REACT_APP_PUBLIC_VAPID_KEY`?
- Resposta: Para chamar `pushManager.subscribe()` no cliente. Pode ser embutida ou obtida via endpoint.

25) Qual o melhor formato do payload?
- Resposta: JSON com { title, body, icon, url, data }. Manter pequeno; buscar dados adicionais via fetch se necessário.

------------------------------------------------------------

SEÇÃO D — Decisões técnicas e segurança (avançado)

26) Como projetar estratégia de rollback para alterações relacionadas a notificações?
- Resposta: Feature flags, pause worker, backups, testar em staging e ter plano para reverter mudanças de VAPID/DB.

27) Riscos de compatibilidade entre browsers?
- Resposta: Variações em payload sizes, suporte (Safari/iOS tem diferenças); testar em navegadores alvo e ter fallback (email/in-app).

28) Como garantir idempotência ao reenviar notificações?
- Resposta: Incluir notification_id e registrar envios por subscription; checar antes de reenviar.

29) Como integrar monitoramento de saúde do worker?
- Resposta: Expor `/health` com checagens do DB/last-run; alertas se pendências aumentarem.

30) Quando migrar o processamento para filas externas?
- Resposta: Quando throughput/complexidade crescer — filas trazem retries, visibilidade e distribuição.

31) Como proteger endpoints de subscribe/unsubscribe contra abuso?
- Resposta: Autenticação, validação de user_id, rate-limiting e sanitização de payloads.

32) Como planejar testes automatizados para o worker?
- Resposta: Unit tests com mock de `web-push` e DB; integração em staging com scripts de teste.

33) Como migrar VAPID sem perder subscriptions?
- Resposta: Notificar clientes a re-subscribe no login se detectado mudança de public key; fornecer endpoint que retorna a key atual.

34) Como proteger logs que podem conter endpoints?
- Resposta: Mascarar dados sensíveis, restringir acesso a logs e limitar retenção.

35) Design recomendado para tabela `scheduled_notifications`?
- Resposta: Campos: id, payload(TEXT/JSON), scheduled_at, attempts, max_attempts, locked_at, status, last_error, created_at, updated_at. Index por status+scheduled_at.

36) Backup/restore de subscriptions e fila?
- Resposta: Incluir em backups regulares e testar restore em staging. Exportar para JSON para migrações quando necessário.

37) Métricas operacionais importantes?
- Resposta: mensagens/minuto, taxa de sucesso, latência, pending jobs, attempts moyen e subscriptions ativas.

38) Lidar com limite de tamanho do payload?
- Resposta: Minimizar payloads e usar fetch no SW para dados grandes.

39) Suportar múltiplas aplicações frontend na mesma infra?
- Resposta: Incluir `app_id`/origin nas subscriptions e segmentar envios.

------------------------------------------------------------

SEÇÃO D1 — Segurança (detalhado)

40) Onde guardar segredos (PRIVATE_VAPID_KEY, SESSION_SECRET)?
- Resposta: Em um secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) ou em variáveis de ambiente no host/CI com acesso restrito. Não commitar em repositórios. Em ambientes containerizados, use Secrets do orquestrador (Kubernetes Secrets) com controles de acesso.

41) Como rotacionar a chave VAPID com segurança?
- Resposta: Planejar migração: gerar nova keypair em staging, atualizar `PUBLIC_VAPID_KEY` e `PRIVATE_VAPID_KEY` nos ambientes protegidos, e decidir se será necessário re-subscrever clientes. Uma estratégia é expor a public key via endpoint e, no login do cliente, verificar se a key mudou para re-subscrever automaticamente.

42) Como limitar o impacto de ataques e abusos nas rotas de subscribe/send?
- Resposta: Aplicar rate-limiting nas rotas sensíveis, autenticação forte, validação estrita de payloads e tamanho máximo, e policies de CORS restritas (apenas `FRONTEND_ORIGIN`). Monitorar picos e aplicar WAF se necessário.

43) Que cabeçalhos HTTP melhorarão a segurança do frontend/worker?
- Resposta: Habilitar HTTPS estrito; usar Content-Security-Policy (CSP) para controlar origens de scripts e conexões; habilitar Strict-Transport-Security (HSTS); usar X-Content-Type-Options, X-Frame-Options e Referrer-Policy apropriadas.

44) Como proteger logs que podem conter endpoints e dados sensíveis?
- Resposta: Não logar chaves privadas; truncar/máscarar endpoints se logs forem públicos; restringir acesso ao sistema de logs; aplicar retenção curta para dados sensíveis.

45) Como garantir que usuários só possam gerenciar suas próprias subscriptions?
- Resposta: Validar `user_id` extraído do token de autenticação e compará-lo com o corpo da requisição; rejeitar solicitações onde IDs divergirem; auditar operações de subscribe/unsubscribe.

46) Recomendações para evitar DoS através de payloads de notificação
- Resposta: Limitar tamanho do payload, validar e sanitizar strings, recusar payloads que excedam limites, e aplicar quotas por usuário/grupo.

47) Controle de acesso e princípio do menor privilégio
- Resposta: Serviços e processos que enviam notificações devem ter só as permissões necessárias (DB apenas para ler/escrever subscriptions e scheduled_notifications). Separar contas de serviço para tarefas cron/worker e API.

SEÇÃO D2 — Offline, Service Worker e comportamento desconectado

48) Como o app deve se comportar quando estiver offline?
- Resposta: O frontend deve continuar funcional para ações locais por meio de caching de assets (Cache API) e cache de dados (IndexedDB). Operações que precisam de rede devem ser enfileiradas localmente (ex.: `frontend/src/utils/offlineQueue.js`) e reprocessadas quando online.

49) Que estratégias de cache usar no service worker?
- Resposta: Estratégias comuns:
- Cache First para assets estáticos (CSS/JS) para inicialização rápida.
- Network First para recursos dinâmicos que precisam de frescor (API calls), com fallback para cache se offline.
- Stale-While-Revalidate para combinar velocidade e atualização.

50) O que é uma offline queue e como integrá-la?
- Resposta: Uma offline queue armazena ações do usuário localmente (IndexedDB) quando não há conexão e as envia automaticamente quando a conexão volta. Use um wrapper na camada de services/API para enfileirar falhas e tentar de novo. `frontend/src/utils/offlineQueue.js` já é um bom ponto de partida.

51) Devo usar Background Sync? Quando funciona melhor?
- Resposta: Background Sync é útil para garantir que requisições saiam quando o usuário recuperar conectividade (ex.: POST de formulários). Tem suporte limitado em alguns navegadores; combine com uma offline queue para máxima compatibilidade.

52) Como o Service Worker lida com push quando o app estava offline?
- Resposta: Push vem do servidor direto para o SW — mesmo se a página estiver fechada. SW executa `push` event e mostra notificação. Se payload exigir dados adicionais, o SW pode tentar fetch; se offline, salvar uma sinalização e processar ao voltar online.

53) Como garantir que notificações agendadas sejam enviadas mesmo com downtime temporário?
- Resposta: O worker deve re-tentar envios com base em `attempts` e `last_error`. Se o serviço ficar down por um período, os registros na tabela `scheduled_notifications` permanecem e serão processados quando o worker voltar. Implementar `max_attempts` e backoff para evitar sobrecarga.

54) Boas práticas para testes offline
- Resposta: Testar com dos DevTools (offline mode), usar ferramentas como Lighthouse para auditoria PWA, e testar re-sincronização de filas (enfileirar ações, desconectar, reconectar e verificar comportamento).

------------------------------------------------------------

SEÇÃO E — Resumo prático: "por que X em vez de Y"

- SQL queue vs Redis/Bull: SQL = simplicidade; Redis = escala e recursos de retry.
- Build-time public key vs runtime endpoint: build-time = performance/simples; runtime = flexibilidade.
- Payload JSON vs colunas normalizadas: JSON = flexibilidade; normalização = integrity/analytics.
- `web-push` self-hosted vs serviço externo: controle e custo vs conveniência/escala.
