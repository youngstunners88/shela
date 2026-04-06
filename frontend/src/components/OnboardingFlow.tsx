import { useState } from 'react';
import type { UserRole } from '../types';
import { roleDescriptions } from '../constants';
import { useAppStore } from '../state/AppStore';

export function OnboardingFlow() {
  const { registerUser } = useAppStore();
  const [role, setRole] = useState<UserRole>('PASSENGER');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Toyota Quantum');
  const [color, setColor] = useState('White');
  const [plate, setPlate] = useState('');

  return (
    <section className="panel hero-panel">
      <div className="eyebrow">Jozi Taxi Network</div>
      <h1>Bhubezi</h1>
      <p className="lede">Community-powered movement for passengers, drivers, and marshals across Johannesburg taxi ranks.</p>

      <div className="role-grid">
        {(['PASSENGER', 'DRIVER', 'MARSHAL'] as UserRole[]).map(item => (
          <button key={item} className={`role-card ${role === item ? 'active' : ''}`} onClick={() => setRole(item)}>
            <strong>{item}</strong>
            <span>{roleDescriptions[item]}</span>
          </button>
        ))}
      </div>

      <div className="form-grid">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        {role === 'DRIVER' && (
          <>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Vehicle brand" />
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="Vehicle color" />
            <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Number plate" />
          </>
        )}
      </div>

      <button
        className="primary-btn"
        onClick={() => registerUser(name || 'New User', role, role === 'DRIVER' ? { brand, color, plate } : undefined)}
      >
        Enter Bhubezi
      </button>
    </section>
  );
}
