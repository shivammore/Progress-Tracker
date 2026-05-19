import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchTargetCompanies, deleteTargetCompany, updateTargetCompany } from '../api/targetCompanyApi';
import TargetCompanyForm from './TargetCompanyForm';

function EditCompanyInline({ company, onSave, onCancel }) {
  const [form, setForm] = useState({ ...company });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="form-label">Company</label>
          <input className="form-control" name="company" value={form.company} onChange={handleChange} required />
        </div>
        <div>
          <label className="form-label">Tier</label>
          <select className="form-control" name="tier" value={form.tier} onChange={handleChange}>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
          </select>
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-control" name="status" value={form.status} onChange={handleChange}>
            <option value="Not Contacted">Not Contacted</option>
            <option value="Contacted">Contacted</option>
            <option value="Applied">Applied</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="form-label">Role Type</label>
          <input className="form-control" name="role" value={form.role || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="form-label">Referral Contact</label>
          <input className="form-control" name="referral_contact" value={form.referral_contact || ''} onChange={handleChange} />
        </div>
      </div>
      <div>
        <label className="form-label">Why It Fits</label>
        <textarea className="form-control" name="why_it_fits" value={form.why_it_fits || ''} onChange={handleChange} rows={2} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" type="submit">💾 Save Changes</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const getTierBadge = (tier) => {
  if (tier === 'T1') return 'status-badge tier-t1';
  if (tier === 'T2') return 'status-badge tier-t2';
  return 'status-badge tier-t3';
};

const getCompanyStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('offer')) return 'status-badge status-success';
  if (s.includes('interview')) return 'status-badge status-info';
  if (s.includes('applied') || s.includes('contacted')) return 'status-badge status-warning';
  if (s.includes('reject')) return 'status-badge status-danger';
  return 'status-badge status-neutral';
};

export default function TargetCompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [editId, setEditId] = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadCompanies = () => fetchTargetCompanies().then(res => setCompanies(res.data));
  useEffect(() => { loadCompanies(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this target company?')) {
      await deleteTargetCompany(id);
      loadCompanies();
    }
  };
  const handleSave = async (form) => {
    await updateTargetCompany(form.id, form);
    setEditId(null);
    loadCompanies();
  };

  const updateStatusQuick = async (company, newStatus) => {
    await updateTargetCompany(company.id, { ...company, status: newStatus });
    loadCompanies();
  };

  let filtered = companies;
  if (filterTier !== 'all') filtered = filtered.filter(c => c.tier === filterTier);
  if (filterStatus !== 'all') filtered = filtered.filter(c => (c.status || '').toLowerCase() === filterStatus.toLowerCase());

  return (
    <div>
      <TargetCompanyForm onSuccess={loadCompanies} />

      {/* Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', padding: '0.75rem 1rem',
        background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier:</span>
          <select className="form-control" value={filterTier} onChange={e => setFilterTier(e.target.value)}
            style={{ minWidth: '100px', padding: '0.4rem 0.6rem' }}>
            <option value="all">All Tiers</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ minWidth: '130px', padding: '0.4rem 0.6rem' }}>
            <option value="all">All Statuses</option>
            <option value="not contacted">Not Contacted</option>
            <option value="contacted">Contacted</option>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> companies
        </div>
      </div>

      <style>{`
        .form-label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
        .company-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .c-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; transition: all var(--transition); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1rem; }
        .c-card:hover { box-shadow: var(--shadow-md); border-color: var(--accent-light); }
        .c-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .c-title { display: flex; alignItems: center; gap: 0.75rem; }
        .c-name { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
        .c-body { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .c-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1rem; }
        @media (max-width: 600px) { .c-body { grid-template-columns: 1fr; } .c-footer { flex-direction: column; gap: 1rem; align-items: stretch; } }
      `}</style>

      {/* Rich List of Companies */}
      <div className="company-list">
        {filtered.map(c => (
          <div key={c.id} className="c-card" style={editId === c.id ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-md)' } : {}}>
            {editId === c.id ? (
              <EditCompanyInline company={c} onSave={handleSave} onCancel={() => setEditId(null)} />
            ) : (
              <>
                <div className="c-header">
                  <div className="c-title">
                    <span className={getTierBadge(c.tier)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>{c.tier}</span>
                    <span className="c-name">{c.company}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={getCompanyStatusBadge(c.status)}>{c.status}</span>
                  </div>
                </div>

                <div className="c-body">
                  <div>
                    <div className="form-label">Role Type</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{c.role || '—'}</div>
                  </div>
                  <div>
                    <div className="form-label">Referral Contact</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{c.referral_contact || '—'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Why It Fits</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.why_it_fits || '—'}</div>
                  </div>
                </div>

                <div className="c-footer">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-edit" onClick={() => setEditId(c.id)}>✏️ Edit</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(c.id)}>🗑️ Delete</button>
                    {['applied', 'interviewing', 'offer'].includes((c.status || '').toLowerCase()) ? (
                      <button className="btn btn-ghost" onClick={() => navigate(`/jobs?company=${encodeURIComponent(c.company)}`)} style={{ color: 'var(--accent)' }}>📂 View App</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => navigate(`/jobs?company=${encodeURIComponent(c.company)}`)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>➕ Log App</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>QUICK STATUS:</span>
                    <select 
                      className="form-control" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto', background: 'var(--bg-main)' }}
                      value={c.status || ''}
                      onChange={(e) => updateStatusQuick(c, e.target.value)}
                    >
                      <option value="Not Contacted">Not Contacted</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-text">No target companies match your filters.</div>
        </div>
      )}
    </div>
  );
}
