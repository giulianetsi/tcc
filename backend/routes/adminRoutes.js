const express = require('express');
const { listPermissions, updatePermissions, listScheduledNotifications } = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar todos os tipos de usuário e suas permissões (apenas admin)
router.get('/permissions', authenticateToken, requireAdmin, listPermissions);

// Atualizar permissões para um user_type_id específico
router.put('/permissions/:user_type_id', authenticateToken, requireAdmin, updatePermissions);

// Listar notificações agendadas pendentes para debug/admin
router.get('/scheduled-notifications', authenticateToken, requireAdmin, listScheduledNotifications);

module.exports = router;
