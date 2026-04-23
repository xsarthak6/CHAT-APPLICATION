import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) navigate('/');
    else setError(result.message);
  };

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
        <h1 style={{ fontSize:'22px', fontWeight:'600', marginBottom:'6px' }}>Welcome back</h1>
        <p style={{ fontSize:'14px', color:'var(--text2)', marginBottom:'24px' }}>Sign in to your account</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', marginTop:'4px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:'13px', color:'var(--text2)', marginTop:'20px' }}>
          Don't have an account? <Link to="/register" style={{ color:'var(--primary)' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}