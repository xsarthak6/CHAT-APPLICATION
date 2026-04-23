import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState({ owned: [], shared: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocs(data);
    } catch { setError('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const createDoc = async () => {
    try {
      const { data } = await api.post('/documents', { title: 'Untitled Document' });
      navigate(`/document/${data._id}`);
    } catch { setError('Failed to create document'); }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this document permanently?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs(d => ({ ...d, owned: d.owned.filter(doc => doc._id !== id) }));
    } catch { setError('Failed to delete'); }
  };

  const formatDate = (d) => {
    const diff = (new Date() - new Date(d)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:'60px', background:'var(--surface)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="#185FA5"/>
            <rect x="8" y="10" width="20" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="17" width="14" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="24" width="17" height="3" rx="1.5" fill="white"/>
          </svg>
          <span style={{ fontSize:'17px', fontWeight:'600' }}>CollabDocs</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div className="avatar" style={{ background: user?.color||'#185FA5', fontSize:'12px', width:28, height:28 }}>{initials}</div>
          <span style={{ fontSize:'14px', fontWeight:500 }}>{user?.name}</span>
          <button className="btn btn-sm" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <main style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 32px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'32px', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'600', marginBottom:'4px' }}>My Documents</h1>
            <p style={{ color:'var(--text2)', fontSize:'14px' }}>Create and collaborate on documents in real time</p>
          </div>
          <button className="btn btn-primary" onClick={createDoc}>+ New document</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p style={{ textAlign:'center', color:'var(--text2)', padding:'60px 0' }}>Loading...</p>
        ) : (
          <>
            <section style={{ marginBottom:'40px' }}>
              <h2 style={{ fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text2)', marginBottom:'14px' }}>Created by me</h2>
              {docs.owned.length === 0 ? (
                <div style={{ padding:'32px', background:'var(--surface)', border:'1px dashed var(--border2)', borderRadius:'12px', textAlign:'center' }}>
                  <p style={{ color:'var(--text2)', fontSize:'14px' }}>No documents yet. <button onClick={createDoc} style={{ color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontSize:'14px' }}>Create your first →</button></p>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'16px' }}>
                  {docs.owned.map(doc => (
                    <div key={doc._id} onClick={() => navigate(`/document/${doc._id}`)}
                      style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', cursor:'pointer', overflow:'hidden', position:'relative' }}>
                      <div style={{ background:'#f8f7f4', padding:'20px', borderBottom:'1px solid var(--border)', height:'100px', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {[100,70,85,55].map((w,i) => <div key={i} style={{ height:'7px', background:'var(--border2)', borderRadius:'4px', width:`${w}%` }} />)}
                      </div>
                      <div style={{ padding:'12px 16px' }}>
                        <p style={{ fontSize:'14px', fontWeight:'500', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.title || 'Untitled'}</p>
                        <p style={{ fontSize:'11px', color:'var(--text3)' }}>Edited {formatDate(doc.updatedAt)}</p>
                      </div>
                      <button onClick={e => deleteDoc(doc._id, e)}
                        style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(255,255,255,0.9)', border:'1px solid var(--border)', borderRadius:'6px', width:'22px', height:'22px', fontSize:'10px', color:'var(--text2)', cursor:'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {docs.shared.length > 0 && (
              <section>
                <h2 style={{ fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text2)', marginBottom:'14px' }}>Shared with me</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'16px' }}>
                  {docs.shared.map(doc => (
                    <div key={doc._id} onClick={() => navigate(`/document/${doc._id}`)}
                      style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', cursor:'pointer', overflow:'hidden' }}>
                      <div style={{ background:'#f8f7f4', padding:'20px', borderBottom:'1px solid var(--border)', height:'100px', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {[100,70,85].map((w,i) => <div key={i} style={{ height:'7px', background:'var(--border2)', borderRadius:'4px', width:`${w}%` }} />)}
                      </div>
                      <div style={{ padding:'12px 16px' }}>
                        <p style={{ fontSize:'14px', fontWeight:'500', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.title || 'Untitled'}</p>
                        <p style={{ fontSize:'11px', color:'var(--text3)' }}>By {doc.owner?.name} · {formatDate(doc.updatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}