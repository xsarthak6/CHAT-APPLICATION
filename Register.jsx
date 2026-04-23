import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    const result = await register(form.name, form.email, form.password);
    if (result.success) navigate('/');
    else setError(result.message);
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) });

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'24px' }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'420px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="#185FA5"/>
            <rect x="8" y="10" width="20" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="17" width="14" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="24" width="17" height="3" rx="1.5" fill="white"/>
          </svg>
          <span style={{ fontSize:'20px', fontWeight:'600' }}>CollabDocs</span>
        </div>
        <h1 style={{ fontSize:'22px', fontWeight:'600', marginBottom:'6px' }}>Create your account</h1>
        <p style={{ fontSize:'14px', color:'var(--text2)', marginBottom:'24px' }}>Start collaborating in real time</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {[['name','text','Full name','Jane Smith'],['email','email','Email','you@example.com'],
            ['password','password','Password','Min 6 characters'],['confirm','password','Confirm password','Repeat password']
          ].map(([field, type, label, placeholder]) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <input className="form-input" type={type} placeholder={placeholder} {...f(field)} required />
            </div>
          ))}
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', marginTop:'4px' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:'13px', color:'var(--text2)', marginTop:'20px' }}>
          Already have an account? <Link to="/login" style={{ color:'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}