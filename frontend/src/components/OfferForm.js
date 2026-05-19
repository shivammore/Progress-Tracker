import React, { useState } from 'react';
import { createOffer } from '../api/offerApi';

export default function OfferForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    company: '', role: '', ctc: '', base: '', bonus: '', stocks: '', benefits: '', notes: '', status: 'Pending'
  });
  const [error, setError] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createOffer({
        ...form,
        ctc: Number(form.ctc),
        base: Number(form.base),
        bonus: Number(form.bonus),
        stocks: Number(form.stocks)
      });
      setForm({ company: '', role: '', ctc: '', base: '', bonus: '', stocks: '', benefits: '', notes: '', status: 'Pending' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add offer');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">🎉 Add Offer</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Company</label>
                <input className="form-control" name="company" placeholder="e.g. Google" value={form.company} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Role</label>
                <input className="form-control" name="role" placeholder="e.g. L4 Engineer" value={form.role} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Status</label>
                <select className="form-control" name="status" value={form.status} onChange={handleChange} required>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Total CTC</label>
                <input className="form-control" name="ctc" type="number" placeholder="e.g. 200000" value={form.ctc} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Base Salary</label>
                <input className="form-control" name="base" type="number" placeholder="e.g. 130000" value={form.base} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Bonus (Sign-on / Annual)</label>
                <input className="form-control" name="bonus" type="number" placeholder="e.g. 20000" value={form.bonus} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Stocks / RSU Value</label>
                <input className="form-control" name="stocks" type="number" placeholder="e.g. 50000" value={form.stocks} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Benefits</label>
                <textarea className="form-control" name="benefits" placeholder="Relocation, 401k match..." value={form.benefits} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Deadline to respond..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Offer</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}