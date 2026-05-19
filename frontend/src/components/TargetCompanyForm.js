import React, { useState } from 'react';
import { createTargetCompany } from '../api/targetCompanyApi';

export default function TargetCompanyForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    company: '', tier: '', role: '', why_it_fits: '', referral_contact: '', status: 'Not Contacted'
  });
  const [error, setError] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createTargetCompany({ ...form });
      setForm({ company: '', tier: '', role: '', why_it_fits: '', referral_contact: '', status: 'Not Contacted' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add target company');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">🎯 Add Target Company</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Company</label>
                <input className="form-control" name="company" placeholder="e.g. Netflix" value={form.company} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Tier</label>
                <select className="form-control" name="tier" value={form.tier} onChange={handleChange} required>
                  <option value="">Select Tier...</option>
                  <option value="T1">T1 — Dream</option>
                  <option value="T2">T2 — Strong Fit</option>
                  <option value="T3">T3 — Good Fit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Status</label>
                <select className="form-control" name="status" value={form.status} onChange={handleChange} required>
                  <option value="Not Contacted">Not Contacted</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Role Type</label>
                <input className="form-control" name="role" placeholder="e.g. Backend Engineer" value={form.role} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Referral Contact</label>
                <input className="form-control" name="referral_contact" placeholder="Name or LinkedIn..." value={form.referral_contact} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Why It Fits</label>
                <textarea className="form-control" name="why_it_fits" placeholder="Why do you want to work here..." value={form.why_it_fits} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Company</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}
