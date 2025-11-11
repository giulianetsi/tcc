const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { createGroup, listGroups, listCourses, reassignCourseTurmas, addUserToGroups, deleteGroup, getGroupMembers, getAvailableUsersForGroup, removeMemberFromGroup, updateGroup } = require('../controllers/groupController');

const router = express.Router();

// Apenas administradores podem criar/deletar/atribuir grupos
router.post('/create', authenticateToken, requireAdmin, createGroup);
router.get('/', authenticateToken, listGroups);
// Listagem pública (sem autenticação) para clientes que não enviam token (útil em selects)
router.get('/public', listGroups);
// Auxiliar público: retornar apenas os cursos
router.get('/courses', listCourses);
router.post('/assign-user', authenticateToken, requireAdmin, addUserToGroups);
// Reatribuir turmas de um curso para outro (admin)
router.post('/reassign-turmas', authenticateToken, requireAdmin, reassignCourseTurmas);
// Atualizar grupo (admin)
router.put('/:id', authenticateToken, requireAdmin, updateGroup);
// Gerenciamento de membros
router.get('/:id/members', authenticateToken, getGroupMembers);
router.get('/:id/available-users', authenticateToken, getAvailableUsersForGroup);
router.delete('/:id/members/:userId', authenticateToken, requireAdmin, removeMemberFromGroup);

// Excluir grupo
router.delete('/:id', authenticateToken, requireAdmin, deleteGroup);

module.exports = router;
