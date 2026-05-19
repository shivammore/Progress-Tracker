import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { createJobApp } from '../api/jobAppApi';
import { fetchTargetCompanies, updateTargetCompany } from '../api/targetCompanyApi';
import { fetchTargetCompanies, updateTargetCompany } from '../api/targetCompanyApi';

export default function JobAppForm({ onSuccess, defaultCompany }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    date_applied: '', company: defaultCompany || '', role: '', location: '', source: '', job_link: '', referral: '', status: 'Applied', recruiter_contact: '', next_step: '', next_step_date: '', notes: ''
  });
  const [error, setError] = useState(null);
  const [targetCompanies, setTargetCompanies] = useState([]);

  useEffect(() => {
    fetchTargetCompanies().then(res => setTargetCompanies(res.data)).catch(err => console.error("Failed to fetch target companies", err));
  }, []);

  useEffect(() => {
    if (defaultCompany) {
      setForm(prev => ({ ...prev, company: defaultCompany }));
    }
  }, [defaultCompany]);
  const [targetCompanies, setTargetCompanies] = useState([]);

  useEffect(() => {
    fetchTargetCompanies().then(res => setTargetCompanies(res.data)).catch(err => console.error("Failed to fetch target companies", err));
  }, []);

  useEffect(() => {
    if (defaultCompany) {
      setForm(prev => ({ ...prev, company: defaultCompany }));
    }
  }, [defaultCompany]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      // 1. Create the job application
      // 1. Create the job application
      await createJobApp({
        ...form,
        next_step_date: form.next_step_date || null
      });

      // 2. Check if this company exists in the target companies list
      const matchingTarget = targetCompanies.find(tc => tc.company.toLowerCase() === form.company.toLowerCase().trim());
      if (matchingTarget) {
        // Automatically update the target company status to match the job app status (or just "Applied")
        await updateTargetCompany(matchingTarget.id, {
          ...matchingTarget,
          status: form.status || 'Applied'
        });
      }

      setForm({ date_applied: '', company: '', role: '', location: '', source: '', job_link: '', referral: '', status: 'Applied', recruiter_contact: '', next_step: '', next_step_date: '', notes: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add job application');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">🏢 Add Job Application</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Date Applied</label>
                <input className="form-control" name="date_applied" type="date" value={form.date_applied} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Company</label>
                <input
                  className="form-control"
                  name="company"
                  placeholder="e.g. Google"
                  value={form.company}
                  onChange={handleChange}
                  list="target-companies-list"
                  required
                />
                <datalist id="target-companies-list">
                  {targetCompanies.map(tc => (
                    <option key={tc.id} value={tc.company} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label required">Role</label>
                <input className="form-control" name="role" placeholder="e.g. Frontend Engineer" value={form.role} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-control" name="location" placeholder="e.g. Remote, NY" value={form.location} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <input className="form-control" name="source" placeholder="e.g. LinkedIn, Website" value={form.source} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Job Link</label>
                <input className="form-control" name="job_link" placeholder="https://..." value={form.job_link} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Referral</label>
                <input className="form-control" name="referral" placeholder="Name of referrer..." value={form.referral} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label required">Status</label>
                <select className="form-control" name="status" value={form.status} onChange={handleChange} required>
                  <option value="Applied">Applied</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Recruiter Contact</label>
                <input className="form-control" name="recruiter_contact" placeholder="Email or LinkedIn..." value={form.recruiter_contact} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Next Step</label>
                <input className="form-control" name="next_step" placeholder="e.g. Phone Screen" value={form.next_step} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Next Step Date</label>
                <input className="form-control" name="next_step_date" type="date" value={form.next_step_date} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Any additional notes..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Application</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}