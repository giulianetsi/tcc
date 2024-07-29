import { FaEdit, FaTrashAlt } from "react-icons/fa";

const alertColors = {
    'Tipo1': '#FFCC33',
    'Tipo2': '#0FB9B1', 
    'Tipo3': '#CC3333',
    'default': '#F6F6F6' 
  };

export function Alerta({alerta, isAdmin, openModal}){
    return (
        <div
              key={alerta.id}
              className={`alert-card ${alerta.titulo === 'Placeholder' ? 'alert-card-placeholder' : ''}`}
              style={{ backgroundColor: alerta.titulo !== 'Placeholder' ? alertColors[alerta.tipo] || alertColors['default'] : '#C0C0C0' }}
              onClick={() => alerta.titulo !== 'Placeholder' && openModal(alerta)}
            >
              {alerta.titulo !== 'Placeholder' ? (
                <>
                  <div className="alert-content">
                    <h5 className="card-title">{alerta.titulo}</h5>
                    <p className="card-text">{alerta.texto}</p>
                    <p>{alerta.data} - {alerta.hora}</p>
                    <p>{alerta.local}</p>
                  </div>
                  {isAdmin && (
                    <div className="icon-buttons">
                      <button className="icon-button">
                        <FaEdit/>
                      </button>
                      <button className="icon-button">
                        <FaTrashAlt />
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
    )
}