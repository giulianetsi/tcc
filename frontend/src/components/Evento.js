import { FaEdit, FaTrashAlt } from "react-icons/fa";

const eventColors = {
    'Tipo1': '#FFCC33',
    'Tipo2': '#0FB9B1', 
    'Tipo3': '#CC3333',
    'default': '#F6F6F6' 
};

export function Evento({ evento, isAdmin, openModal }) {
    return (
        <div
            key={evento.id}
            className={`event-card ${evento.titulo === 'Placeholder' ? 'event-card-placeholder' : ''}`}
            style={{ backgroundColor: evento.titulo !== 'Placeholder' ? eventColors[evento.tipo] || eventColors['default'] : '#F6F6F6' }}
            onClick={() => evento.titulo !== 'Placeholder' && openModal(evento)}
        >
            {evento.titulo !== 'Placeholder' ? (
                <>
                    <div className="event-content">
                        <h5 className="card-title">{evento.titulo}</h5>
                        <p className="card-text">{evento.texto}</p>
                        <p>{evento.data} - {evento.hora}</p>
                        <p>{evento.local}</p>
                    </div>
                    {isAdmin && (
                        <div className="icon-buttons">
                            <button className="icon-button">
                                <FaEdit />
                            </button>
                            <button className="icon-button">
                                <FaTrashAlt />
                            </button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
