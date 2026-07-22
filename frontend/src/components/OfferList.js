import React, { useEffect, useState } from 'react';
import { fetchOffers, deleteOffer, updateOffer } from '../api/offerApi';
import OfferForm from './OfferForm';
import RightSidebarWidgets from './RightSidebarWidgets';

function EditRow({ offer, onSave, onCancel }) {
  const [form, setForm] = useState({ ...offer });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input className="form-control" name="company" value={form.company} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="role" value={form.role} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="status" value={form.status} onChange={handleChange} required style={{width:100}} />
      <button className="btn btn-primary" type="submit">💾 Save</button>
      <button className="btn" type="button" onClick={onCancel} style={{ background: '#e2e8f0' }}>❌ Cancel</button>
    </form>
  );
}

const getOfferStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('accept')) return 'status-badge status-success';
  if (s.includes('reject') || s.includes('decline')) return 'status-badge status-danger';
  if (s.includes('negotiating') || s.includes('pending')) return 'status-badge status-warning';
  return 'status-badge status-info';
};

export default function OfferList() {
  const [offers, setOffers] = useState([]);
  const [editId, setEditId] = useState(null);
  const loadOffers = () => fetchOffers().then(res => setOffers(res.data));
  useEffect(() => { loadOffers(); }, []);
  const handleDelete = async (id) => {
    if (window.confirm('Delete this offer?')) {
      await deleteOffer(id);
      loadOffers();
    }
  };
  const handleEdit = (id) => setEditId(id);
  const handleCancel = () => setEditId(null);
  const handleSave = async (form) => {
    await updateOffer(form.id, form);
    setEditId(null);
    loadOffers();
  };
  const totalCTC = offers.filter(o => !o.status?.toLowerCase().includes('reject')).reduce((sum, o) => sum + (o.ctc || 0), 0);
  const bestOffer = offers.filter(o => !o.status?.toLowerCase().includes('reject')).sort((a, b) => (b.ctc || 0) - (a.ctc || 0))[0];

  return (
    <div className="dashboard-grid">
      <div className="dp-left-col">
      <OfferForm onSuccess={loadOffers} />
      
      {offers.length > 0 && (
        <div style={{
          display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Value Pipeline</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>
              ₹{totalCTC.toLocaleString()}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Best Offer</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
              {bestOffer ? `${bestOffer.company} (₹${bestOffer.ctc.toLocaleString()})` : '-'}
            </div>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>CTC / Breakdown</th>
              <th>Benefits</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.sort((a, b) => (b.ctc || 0) - (a.ctc || 0)).map(offer => (
              <tr key={offer.id} className={editId === offer.id ? 'editing-row' : ''}>
                {editId === offer.id ? (
                  <td colSpan="6">
                    <EditRow offer={offer} onSave={handleSave} onCancel={handleCancel} />
                  </td>
                ) : (
                  <>
                    <td style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--accent)' }}>{offer.company}</td>
                    <td style={{ fontWeight: 500 }}>{offer.role}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>₹{offer.ctc?.toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Base: ₹{offer.base?.toLocaleString() || 0} | Bonus: ₹{offer.bonus?.toLocaleString() || 0} | Stocks: ₹{offer.stocks?.toLocaleString() || 0}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>{offer.benefits || '-'}</td>
                    <td><span className={getOfferStatusBadge(offer.status)}>{offer.status}</span></td>
                    <td>
                      <button className="btn btn-edit" onClick={() => handleEdit(offer.id)}>✏️</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(offer.id)}>🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 0 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💰</div>
                    <div className="empty-state-text">No offers recorded.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      <RightSidebarWidgets />

    </div>
  );
}