import { useState, useRef, type ChangeEvent } from 'react';
import type { UserRole } from '../types';
import { roleDescriptions } from '../constants';
import { useAppStore } from '../state/AppStore';

export function OnboardingFlow() {
  const { login, register } = useAppStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PASSENGER');
  
  // Driver vehicle fields
  const [brand, setBrand] = useState('Toyota Quantum');
  const [color, setColor] = useState('White');
  const [plate, setPlate] = useState('');
  
  // Profile photo upload (for all roles)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validation
    if (!phone || !password) {
      setError('Phone and password are required');
      return;
    }
    
    if (activeTab === 'register') {
      if (!name) {
        setError('Name is required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      if (activeTab === 'login') {
        await login(phone, password);
      } else {
        const vehicle = role === 'DRIVER' ? { brand, color, plate: plate || 'Unknown' } : undefined;
        await register(name, phone, password, role, vehicle, photoFile || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel hero-panel">
      <div className="eyebrow">Jozi Taxi Network</div>
      <h1>Bhubezi</h1>
      <p className="lede">Community-powered movement for passengers, drivers, and marshals across Johannesburg taxi ranks.</p>

      {/* Tabs */}
      <div className="tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          className={`tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
        <button 
          className={`tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          Register
        </button>
      </div>

      {/* Registration: Role selection */}
      {activeTab === 'register' && (
        <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['PASSENGER', 'DRIVER', 'MARSHAL'] as UserRole[]).map(item => (
            <button 
              key={item} 
              className={`role-card ${role === item ? 'active' : ''}`} 
              onClick={() => setRole(item)}
              style={{ 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                border: '2px solid',
                borderColor: role === item ? '#00E676' : 'transparent',
                background: role === item ? 'rgba(0,230,118,0.1)' : '#f5f5f5',
                cursor: 'pointer'
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{item}</strong>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{roleDescriptions[item]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Form fields */}
      <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {activeTab === 'register' && (
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Your full name"
            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
          />
        )}
        
        <input 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          placeholder="Phone number (e.g., 0712345678)"
          type="tel"
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
        />
        
        <input 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="Password"
          type="password"
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
        />
        
        {activeTab === 'register' && (
          <input 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            placeholder="Confirm password"
            type="password"
            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
          />
        )}

        {/* Driver vehicle fields */}
        {activeTab === 'register' && role === 'DRIVER' && (
          <>
            <input 
              value={brand} 
              onChange={e => setBrand(e.target.value)} 
              placeholder="Vehicle brand (e.g., Toyota Quantum)"
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
            />
            <input 
              value={color} 
              onChange={e => setColor(e.target.value)} 
              placeholder="Vehicle color"
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
            />
            <input 
              value={plate} 
              onChange={e => setPlate(e.target.value)} 
              placeholder="Number plate (e.g., JZ 456 GP)"
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
            />
          </>
        )}

        {/* Profile photo upload for all users during registration */}
        {activeTab === 'register' && (
          <div style={{
            border: '2px dashed #ccc',
            borderRadius: '0.5rem',
            padding: '1rem',
            textAlign: 'center',
            cursor: 'pointer'
          }} onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile photo"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>📷 Add a profile photo (optional)</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>\n                  {role === 'DRIVER' ? 'Driver verification selfie' : 'Upload a photo'}\n                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '0.75rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={isLoading}
        style={{ 
          width: '100%', 
          padding: '1rem',
          background: isLoading ? '#ccc' : '#00E676',
          color: 'black',
          border: 'none',
          borderRadius: '0.5rem',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Processing...' : (activeTab === 'login' ? 'Login' : 'Create Account')}
      </button>
    </section>
  );
}
