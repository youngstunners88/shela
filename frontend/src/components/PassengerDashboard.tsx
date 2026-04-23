import { useMemo, useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function PassengerDashboard() {
  const { snapshot, createPing, askQuestion } = useAppStore();
  const [routeId, setRouteId] = useState(snapshot?.routes[0]?.id ?? '');
  const [message, setMessage] = useState('I am waiting near the entrance.');

  const route = useMemo(() => snapshot?.routes.find(item => item.id === routeId), [snapshot, routeId]);

  if (!snapshot) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Passenger tools</div>
        <div className="form-grid">
          <select value={routeId} onChange={e => setRouteId(e.target.value)}>
            {snapshot.routes.map(item => <option key={item.id} value={item.id}>{item.label} · R{item.fare}</option>)}
          </select>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note for drivers" />
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={() => route && createPing(route.originId, route.destinationId, route.fare, message)}>Ping drivers</button>
          <button className="secondary-btn" onClick={() => route && askQuestion(`How much is ${route.label}?`, route.id)}>Ask fare question</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Live pings</div>
        <div className="list">
          {snapshot.pings.map(ping => (
            <div className="list-card" key={ping.id}>
              <div>
                <strong>{snapshot.ranks.find(rank => rank.id === ping.originRankId)?.name} → {snapshot.ranks.find(rank => rank.id === ping.destinationRankId)?.name}</strong>
                <p>Expected fare: R{ping.price}</p>
                <small>{ping.message}</small>
              </div>
              <div className="pill-stack">
                <span className="pill">{ping.acceptedDriverNames.length} driver offers</span>
                {ping.pickedUp && <span className="pill success">Picked up</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
