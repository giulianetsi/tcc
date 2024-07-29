const Alerta = require('../models/alerta');

const getAlertas = (req, res) => {
    Alerta.getAlertasByType(req.session.user.tipo, (alertas) => {
        res.render('dashboard', {
            username: req.session.user.login,
            alertas: alertas,
            isAdmin: req.session.user.tipo === 'admin',
        });
    });
};

const addAlerta = (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).send('Forbidden');
    }
    const { message, type } = req.body;
    Alerta.insertAlertas(message, type, () => {
        res.redirect('/dashboard');
    });
};

module.exports = {
    getAlertas,
    addAlerta,
};
