import { useMemo, useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function DriverDashboard() {
  const { snapshot, currentUser, updateDriverStatus, acceptPing, confirmPickup } = useAppStore();
  const [routeId, setRouteId] = useState(currentUser?.currentRouteId ?? snapshot?.routes[0]?.id ?? '');
  const [occupancy, setOccupancy] = useState(currentUser?.occupancy ?? 8);

  const relevantPings = useMemo(() => snapshot?.pings.filter(ping => {
    const route = snapshot.routes.find(item => item.id === routeId);
    return route ? ping.originRankId === route.originId && ping.destinationRankId === route.destinationId : true;
  }) ?? [], [snapshot, routeId]);

  if (!snapshot || !currentUser) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Driver trip control</div>
        <div className="form-grid two-col">
          <select value={routeId} onChange={e => setRouteId(e.target.value)}>
            {snapshot.routes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <input type="number" min={1} max={16} value={occupancy} onChange={e => setOccupancy(Number(e.target.value))} />
        </div>
        <button className="primary-btn" onClick={() => updateDriverStatus(routeId, occupancy)}>Update driver status</button>
      </section>

      <section className="panel">
        <div className="section-title">Passenger demand on your route</div>
        <div className="list">
          {relevantPings.map(ping => (
            <div className="list-card" key={ping.id}>
              <div>
                <strong>{ping.passengerName}</strong>
                <p>Offer fare: R{ping.price}</p>
                <small>{ping.message}</small>
              </div>
              <div className="button-column">
                <button className="secondary-btn" onClick={() => acceptPing(ping.id)}>Accept</button>
                <button className="ghost-btn" onClick={() => confirmPickup(ping.id)}>Confirm pickup</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
