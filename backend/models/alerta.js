const db = require('../server');

const createAlertasTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS alertas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            message TEXT,
            type VARCHAR(255)
        )
    `;
    db.query(sql, (err) => {
        if (err) throw err;
        console.log('Tabela de alertas criada ou já existe.');
    });
};

const getAlertasByType = (type, callback) => {
    db.query('SELECT * FROM alertas WHERE type = ? OR type = "all"', [type], (err, results) => {
        if (err) throw err;
        callback(results);
    });
};

const insertAlertas = (message, type, callback) => {
    db.query('INSERT INTO alertas (message, type) VALUES (?, ?)', [message, type], (err) => {
        if (err) throw err;
        callback();
    });
};

module.exports = {
    createAlertasTable,
    getAlertasByType,
    insertAlertas,
};
