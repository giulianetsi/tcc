import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Core color palette requested by product
const COLORS = {
    event: '#FFCC33',      // eventos
    reuniao: '#0FB9B1',    // reuniões
    aviso: '#CC3333',      // avisos
    palestra: '#F4A171',   // palestra (nova)
    // new mappings requested
    workshop: '#3884C7',   // workshop
    cerimonia: '#C04D00',  // cerimônia (updated)
    treinamento: '#8E7DBE',// treinamento
    outros: '#6C737E',     // outros
    default: '#F6F6F6'
};

// Some older data uses Tipo1/Tipo2/Tipo3; keep compatibility while
// also recognizing localized words like 'evento', 'reunião', 'aviso'.
const exactMap = {
    'Tipo1': COLORS.event,
    'Tipo2': COLORS.reuniao,
    'Tipo3': COLORS.aviso
};

function getColorForType(tipo) {
    if (!tipo) return COLORS.default;
    // exact match first
    if (exactMap[tipo]) return exactMap[tipo];

    const t = String(tipo).toLowerCase();
    if (t.includes('evento') || t.includes('event')) return COLORS.event;
    if (t.includes('reun') || t.includes('reuni')) return COLORS.reuniao;
    if (t.includes('workshop') || t.includes('oficina')) return COLORS.workshop;
    if (t.includes('cerimon') || t.includes('cerimônia') || t.includes('cerim')) return COLORS.cerimonia;
    if (t.includes('trein') || t.includes('treinamento')) return COLORS.treinamento;
    if (t.includes('outro') || t.includes('outros')) return COLORS.outros;
    if (t.includes('palestr') || t.includes('palestra')) return COLORS.palestra;
    if (t.includes('aviso') || t.includes('avis')) return COLORS.aviso;
    return COLORS.default;
}


export function Evento({ evento, isAdmin, openModal }) {
    const navigate = useNavigate();
    // Não renderizar placeholders - retorna null (completamente invisível)
    if (evento.titulo === 'Placeholder') {
        return null;
    }
    const currentUserId = localStorage.getItem('user_id');
    const isCreator = currentUserId && evento.criado_por_id && Number(currentUserId) === Number(evento.criado_por_id);

    const formatDateTime = () => {
        // Respect explicit mostrar_data flag: if false, don't show any date/time
        if (!evento) return '';
        if (typeof evento.mostrar_data !== 'undefined' && evento.mostrar_data === false) return '';

        // If the event uses a period (range), prefer that
        const ps = evento.data_period_start || evento.period_start || evento.data_periodo_inicio || '';
        const pe = evento.data_period_end || evento.period_end || evento.data_periodo_fim || '';
        if (ps || pe) {
            if (ps && pe) return `${ps} — ${pe}`;
            return ps || pe || '';
        }

        // Fallback to single-date + optional time
        const d = evento.data ? String(evento.data).trim() : '';
        const h = evento.hora ? String(evento.hora).trim() : '';
        if (d && h) return `${d} — ${h}`;
        return d || h || '';
    };

    return (
        <div
            key={evento.id}
            className="event-card"
            style={{ backgroundColor: getColorForType(evento.tipo) }}
            onClick={() => openModal(evento)}
        >
            <div className="event-content">
                <h5 className="card-title">{evento.titulo}</h5>
                {/* description intentionally omitted to keep cards compact */}
                {formatDateTime() ? <p className="event-datetime">{formatDateTime()}</p> : null}
                {evento.local ? <p className="event-local">{evento.local}</p> : null}
            </div>
            {/* Ícones só para criador OU admin */}
            {(isCreator || (isAdmin && isCreator)) ? (
                <div className="icon-buttons">
                    <button
                        className="icon-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/add-evento', { state: { evento } });
                        }}
                        title="Editar evento"
                    >
                        <FaEdit />
                    </button>
                    <button
                        className="icon-button"
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm('Tem certeza que deseja apagar este evento?')) return;
                            try {
                                await api.delete(`/events/${evento.id}`);
                                window.dispatchEvent(new CustomEvent('evento-deleted', { detail: { id: evento.id } }));
                            } catch (err) {
                                                    console.error('Erro ao deletar evento', err);
                                                    alert('Erro ao deletar evento');
                                                }
                                            }}
                                            title="Apagar evento"
                                        >
                                                <FaTrashAlt />
                                        </button>
                                </div>
                        ) : null}
        </div>
    );
}
