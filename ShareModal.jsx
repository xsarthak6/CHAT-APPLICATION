import { useState } from 'react';
import api from '../api';

export default function ShareModal({ docId, onClose }) {
  const [permission, setPermission] = useState('view');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/documents/${docId}/share`, { permission });
      const url = `${window.location.origin}/document/${docId}?share=${data.shareLink}`;
      setLink(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const disableLink = async () => {
    try {
      await api.post(`/documents/${docId}/share`, { permission: 'none' });
      setLink('');
    } catch {
      setError('Failed to disable link');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ fontSize:'17px', fontWeight:'600' }}>Share document</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {error && <div className="alert alert-error">{error}</div>}

          <p style={styles.label}>Anyone with the link can</p>
          <div style={{ display:'flex', gap:'20px', marginBottom:'16px' }}>
            {['view', 'edit'].map((p) => (
              <label key={p} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer' }}>
                <input
                  type="radio"
                  name="permission"
                  value={p}
                  checked={permission === p}
                  onChange={() => setPermission(p)}
                />
                <span style={{ fontSize:'14px', textTransform:'capitalize' }}>{p}</span>
              </label>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center' }}
            onClick={generateLink}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate share link'}
          </button>

          {link && (
            <>
              <div style={{ display:'flex', gap:'8px', marginTop:'14px', alignItems:'center' }}>
                <input
                  style={styles.linkInput}
                  value={link}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button className="btn btn-primary btn-sm" onClick={copyLink}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <button style={styles.disableBtn} onClick={disableLink}>
                Disable link
              </button>
            </>
          )}

          {/* Divider */}
          <div style={{ borderTop:'1px solid var(--border)', margin:'20px 0' }} />

          <p style={styles.label}>Or invite directly by email</p>
          <p style={{ fontSize:'12px', color:'var(--text3)' }}>
            Use the <strong>People</strong> tab inside the editor sidebar to invite collaborators by email.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position:'fixed',
    inset:0,
    background:'rgba(0,0,0,0.45)',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    zIndex:1000,
    padding:'16px',
  },
  modal: {
    background:'var(--surface)',
    borderRadius:'16px',
    width:'100%',
    maxWidth:'440px',
    boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
  },
  header: {
    display:'flex',
    alignItems:'center',
    justifyContent:'space-between',
    padding:'20px 24px 0',
  },
  closeBtn: {
    background:'none',
    border:'none',
    fontSize:'16px',
    color:'var(--text2)',
    cursor:'pointer',
    padding:'4px 8px',
    borderRadius:'6px',
  },
  body: {
    padding:'20px 24px 28px',
  },
  label: {
    fontSize:'13px',
    fontWeight:'500',
    color:'var(--text2)',
    marginBottom:'10px',
  },
  linkInput: {
    flex:1,
    padding:'7px 10px',
    border:'1px solid var(--border2)',
    borderRadius:'8px',
    fontSize:'12px',
    background:'var(--bg)',
    color:'var(--text)',
    outline:'none',
    fontFamily:'monospace',
    minWidth:0,
  },
  disableBtn: {
    marginTop:'10px',
    background:'none',
    border:'none',
    color:'var(--danger)',
    fontSize:'12px',
    cursor:'pointer',
    textDecoration:'underline',
    padding:0,
  },
};