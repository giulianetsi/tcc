const db = require('../db');

// Criar um novo grupo. Suporta opcionalmente a coluna parent_course_id quando presente no schema.
const createGroup = async (req, res) => {
	const { name, description, group_type, parent_course_id } = req.body;

	console.log('createGroup called with body:', req.body);
	const created_by = req.user?.userId;

	if (!name) return res.status(400).json({ message: 'Nome do grupo requerido' });

	try {
		const [colCheck] = await db.execute("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups' AND COLUMN_NAME = 'parent_course_id'");
		const parentColExists = (colCheck && colCheck[0] && colCheck[0].cnt > 0) || false;

		let result;
		if (parentColExists && parent_course_id) {
			const [pc] = await db.execute('SELECT id, group_type FROM `groups` WHERE id = ? LIMIT 1', [parent_course_id]);
			if (!pc || pc.length === 0) {
				return res.status(400).json({ message: 'parent_course_id inválido: curso não encontrado' });
			}
			if (((pc[0].group_type || '').toString().toLowerCase()) !== 'curso') {
				return res.status(400).json({ message: 'parent_course_id deve apontar para um grupo do tipo "curso"' });
			}
		}

		if (parentColExists) {
			[result] = await db.execute('INSERT INTO `groups` (name, description, group_type, parent_course_id, created_by) VALUES (?, ?, ?, ?, ?)', [name, description || null, group_type || 'custom', parent_course_id || null, created_by || null]);
		} else {
			[result] = await db.execute('INSERT INTO `groups` (name, description, group_type, created_by) VALUES (?, ?, ?, ?)', [name, description || null, group_type || 'custom', created_by || null]);
		}

		const [rows] = await db.execute('SELECT g.*, (SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count FROM `groups` g WHERE g.id = ? LIMIT 1', [result.insertId]);
		const createdGroup = rows && rows[0] ? rows[0] : null;

		res.status(201).json({ message: 'Grupo criado', groupId: result.insertId, group: createdGroup });
	} catch (error) {
		console.error('Erro ao criar grupo:', error.message);
		res.status(500).json({ message: 'Erro ao criar grupo', error: error.message });
	}
};

const listGroups = async (req, res) => {
	try {
		const [colCheck] = await db.execute(
			"SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups' AND COLUMN_NAME = 'parent_course_id'"
		);
		const parentColExists = (colCheck && colCheck[0] && colCheck[0].cnt > 0) || false;

		console.log(`listGroups: coluna parent_course_id existe? ${parentColExists}`);

		try {
			const [recent] = await db.execute('SELECT id, name, created_at FROM `groups` ORDER BY id DESC LIMIT 20');
			console.log('listGroups: grupos recentes (id desc) ->', recent.map(r => `${r.id}:${r.name}`));
		} catch (dbgErr) {
			console.warn('listGroups: falha ao selecionar grupos recentes para debug:', dbgErr && dbgErr.message);
		}

		if (parentColExists) {
			const [groups] = await db.execute(
				`SELECT g.*, 
					pc.name AS parent_course_name,
					u.first_name AS created_by_name,
					u.last_name AS created_by_lastname,
					(SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count
				FROM \`groups\` g
				LEFT JOIN \`groups\` pc ON pc.id = g.parent_course_id
				LEFT JOIN users u ON u.id = g.created_by
				ORDER BY g.name COLLATE utf8mb4_general_ci ASC`
			);
			console.log(`listGroups: retornando ${groups.length} grupos (com parent_course_id)`);
			return res.status(200).json(groups);
		} else {
			const [groups] = await db.execute(
				`SELECT g.*, 
					(SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count
				FROM \`groups\` g
				ORDER BY g.name COLLATE utf8mb4_general_ci ASC`
			);
			console.log(`listGroups: retornando ${groups.length} grupos (sem parent_course_id)`);
			return res.status(200).json(groups);
		}
	} catch (error) {
		console.error('Erro ao listar grupos:', error.message);
		res.status(500).json({ message: 'Erro ao listar grupos', error: error.message });
	}
};

const listCourses = async (req, res) => {
	try {
		const [colCheck] = await db.execute(
			"SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups' AND COLUMN_NAME = 'parent_course_id'"
		);
		const parentColExists = (colCheck && colCheck[0] && colCheck[0].cnt > 0) || false;

		let sql;
		if (parentColExists) {
			sql = `SELECT g.id, g.name, g.description, g.group_type, g.parent_course_id, 
								(SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count
						 FROM \`groups\` g
						 WHERE LOWER(COALESCE(g.group_type, '')) = 'curso'
						 ORDER BY g.name COLLATE utf8mb4_general_ci ASC`;
		} else {
			sql = `SELECT g.id, g.name, g.description, g.group_type, 
								(SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = g.id) AS member_count
						 FROM \`groups\` g
						 WHERE LOWER(COALESCE(g.group_type, '')) = 'curso'
						 ORDER BY g.name COLLATE utf8mb4_general_ci ASC`;
		}

		const [courses] = await db.execute(sql);
		res.status(200).json(courses);
	} catch (error) {
		console.error('Erro ao listar cursos:', error.message);
		res.status(500).json({ message: 'Erro ao listar cursos', error: error.message });
	}
};

const reassignCourseTurmas = async (req, res) => {
	const { from_course_id, to_course_id } = req.body;

	if (!from_course_id) return res.status(400).json({ message: 'from_course_id requerido' });

	try {
		const [fromRows] = await db.execute('SELECT id, group_type FROM `groups` WHERE id = ? LIMIT 1', [from_course_id]);
		if (!fromRows || fromRows.length === 0) return res.status(404).json({ message: 'Curso origem não encontrado' });
		if (((fromRows[0].group_type || '').toString().toLowerCase()) !== 'curso') return res.status(400).json({ message: 'from_course_id não é um curso' });

		if (to_course_id) {
			const [toRows] = await db.execute('SELECT id, group_type FROM `groups` WHERE id = ? LIMIT 1', [to_course_id]);
			if (!toRows || toRows.length === 0) return res.status(404).json({ message: 'Curso destino não encontrado' });
			if (((toRows[0].group_type || '').toString().toLowerCase()) !== 'curso') return res.status(400).json({ message: 'to_course_id não é um curso' });
		}

		const [result] = await db.execute('UPDATE `groups` SET parent_course_id = ? WHERE parent_course_id = ?', [to_course_id || null, from_course_id]);

		res.status(200).json({ message: 'Turmas reatribuídas', affectedRows: result.affectedRows });
	} catch (error) {
		console.error('Erro ao reatribuir turmas:', error.message);
		res.status(500).json({ message: 'Erro ao reatribuir turmas', error: error.message });
	}
};

const addUserToGroups = async (req, res) => {
	// Compatibilidade retroativa:
	// - aceitar { user_id, group_ids } para substituir todas as associações de um usuário
	// - ou { groupId, userId } para adicionar um único usuário a um único grupo (usado pelo frontend "Adicionar Membro")
	const { user_id, group_ids, groupId, userId } = req.body;

	const connection = await db.getConnection();
	try {
		await connection.beginTransaction();

		if (user_id && Array.isArray(group_ids)) {
			// Substituir todas as associações de grupos para o usuário informado
			await connection.execute('DELETE FROM user_groups WHERE user_id = ?', [user_id]);
			for (const gid of group_ids) {
				await connection.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [user_id, gid]);
			}
			await connection.commit();
			return res.status(200).json({ message: 'Associações atualizadas' });
		}

		if (groupId && userId) {
			// Adicionar único usuário a um único grupo se ainda não existir (INSERT IGNORE)
			await connection.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [userId, groupId]);
			await connection.commit();
			return res.status(200).json({ message: 'Usuário adicionado ao grupo' });
		}

		await connection.rollback();
		return res.status(400).json({ message: 'Parâmetros inválidos para atribuir usuário' });
	} catch (error) {
		await connection.rollback();
		console.error('Erro ao atualizar user_groups:', error.message);
		res.status(500).json({ message: 'Erro ao atualizar grupos do usuário', error: error.message });
	} finally {
		connection.release();
	}
};

// Retornar membros de um grupo específico
const getGroupMembers = async (req, res) => {
	const { id } = req.params;
	try {
		const [members] = await db.execute(
			`SELECT u.id, u.first_name, u.last_name, u.email, ut.name as user_type, ug.joined_at
			 FROM user_groups ug
			 JOIN users u ON ug.user_id = u.id
			 LEFT JOIN user_types ut ON u.user_type_id = ut.id
			 WHERE ug.group_id = ?`,
			[id]
		);
		res.status(200).json(members);
	} catch (error) {
		console.error('Erro ao buscar membros do grupo:', error.message);
		res.status(500).json({ message: 'Erro ao buscar membros do grupo', error: error.message });
	}
};

// Retornar usuários que não estão no grupo (disponíveis para adicionar)
const getAvailableUsersForGroup = async (req, res) => {
	const { id } = req.params;
	try {
		const [available] = await db.execute(
			`SELECT u.id, u.first_name, u.last_name, u.email, ut.name as user_type
			 FROM users u
			 LEFT JOIN user_types ut ON u.user_type_id = ut.id
			 WHERE u.id NOT IN (SELECT user_id FROM user_groups WHERE group_id = ?)`,
			[id]
		);
		res.status(200).json(available);
	} catch (error) {
		console.error('Erro ao buscar usuários disponíveis:', error.message);
		res.status(500).json({ message: 'Erro ao buscar usuários disponíveis', error: error.message });
	}
};

// Remover um usuário específico de um grupo
const removeMemberFromGroup = async (req, res) => {
	const { id, userId } = req.params;
	try {
		await db.execute('DELETE FROM user_groups WHERE group_id = ? AND user_id = ?', [id, userId]);
		res.status(200).json({ message: 'Usuário removido do grupo' });
	} catch (error) {
		console.error('Erro ao remover membro do grupo:', error.message);
		res.status(500).json({ message: 'Erro ao remover membro do grupo', error: error.message });
	}
};

const deleteGroup = async (req, res) => {
	const { id } = req.params;
	try {
		// Verifica se o grupo existe e qual é o seu tipo
		const [grows] = await db.execute('SELECT id, group_type FROM `groups` WHERE id = ? LIMIT 1', [id]);
		if (!grows || grows.length === 0) return res.status(404).json({ message: 'Grupo não encontrado' });
		const group = grows[0];

		// Se for um 'curso', garante que não haja turmas (parent_course_id) vinculadas antes de apagar
		if (String((group.group_type || '').toLowerCase()) === 'curso') {
			const [refs] = await db.execute('SELECT COUNT(*) as cnt FROM `groups` WHERE parent_course_id = ?', [id]);
			const cnt = refs && refs[0] ? refs[0].cnt : 0;
			if (cnt > 0) {
				return res.status(400).json({ message: `Não é possível apagar este curso: existem ${cnt} turma(s) vinculada(s). Substitua ou desvincule antes de apagar.` });
			}
		}

		await db.execute('DELETE FROM `groups` WHERE id = ?', [id]);
		res.status(200).json({ message: 'Grupo removido' });
	} catch (error) {
		console.error('Erro ao remover grupo:', error.message);
		res.status(500).json({ message: 'Erro ao remover grupo', error: error.message });
	}
};

// Atualizar um grupo (permite alterar parent_course_id, nome, descrição e tipo)
const updateGroup = async (req, res) => {
	const { id } = req.params;
	const { name, description, group_type, parent_course_id } = req.body;

	if (!name) return res.status(400).json({ message: 'Nome do grupo requerido' });

	try {
		// Incluir parent_course_id apenas se a coluna existir no schema
		const [colCheck] = await db.execute("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups' AND COLUMN_NAME = 'parent_course_id'");
		const parentColExists = (colCheck && colCheck[0] && colCheck[0].cnt > 0) || false;

		if (parentColExists && parent_course_id) {
			// Validar que parent_course_id aponta para um curso existente
			const [pc] = await db.execute('SELECT id, group_type FROM `groups` WHERE id = ? LIMIT 1', [parent_course_id]);
			if (!pc || pc.length === 0) {
				return res.status(400).json({ message: 'parent_course_id inválido: curso não encontrado' });
			}
			if (((pc[0].group_type || '').toString().toLowerCase()) !== 'curso') {
				return res.status(400).json({ message: 'parent_course_id deve apontar para um grupo do tipo "curso"' });
			}
		}

		if (parentColExists) {
			await db.execute('UPDATE `groups` SET name = ?, description = ?, group_type = ?, parent_course_id = ? WHERE id = ?', [name, description || null, group_type || 'custom', parent_course_id || null, id]);
		} else {
			await db.execute('UPDATE `groups` SET name = ?, description = ?, group_type = ? WHERE id = ?', [name, description || null, group_type || 'custom', id]);
		}

		res.status(200).json({ message: 'Grupo atualizado' });
	} catch (error) {
		console.error('Erro ao atualizar grupo:', error.message);
		res.status(500).json({ message: 'Erro ao atualizar grupo', error: error.message });
	}
};

module.exports = {
	createGroup,
	listGroups,
  listCourses,
  reassignCourseTurmas,
	addUserToGroups,
	getGroupMembers,
	getAvailableUsersForGroup,
	removeMemberFromGroup,
	deleteGroup
  ,
  updateGroup
};
