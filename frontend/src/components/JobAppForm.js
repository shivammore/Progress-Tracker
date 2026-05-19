import React, { useState, useEffect } from 'react';
import { createJobApp } from '../api/jobAppApi';
import { fetchTargetCompanies, updateTargetCompany } from '../api/targetCompanyApi';

export default function JobAppForm({ onSuccess, defaultCompany }) {
  const [form, setForm] = useState({
    date_applied: '', company: defaultCompany || '', role: '', location: '', source: '', job_link: '', referral: '', status: '', recruiter_contact: '', next_step: '', next_step_date: '', notes: ''
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

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
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

      setForm({ date_applied: '', company: '', role: '', location: '', source: '', job_link: '', referral: '', status: '', recruiter_contact: '', next_step: '', next_step_date: '', notes: '' });
      setError(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add job application');
    }
  };

  return (
    <div className="form-container">
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#4f46e5' }}>Add Job Application</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <input className="form-control" name="date_applied" type="date" value={form.date_applied} onChange={handleChange} required />
          
          <input 
            className="form-control" 
            name="company" 
            placeholder="Company (Type or Select)" 
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

          <input className="form-control" name="role" placeholder="Role" value={form.role} onChange={handleChange} required />
          <input className="form-control" name="location" placeholder="Location" value={form.location} onChange={handleChange} />
          <input className="form-control" name="source" placeholder="Source" value={form.source} onChange={handleChange} />
          <input className="form-control" name="job_link" placeholder="Job Link" value={form.job_link} onChange={handleChange} />
          <input className="form-control" name="referral" placeholder="Referral" value={form.referral} onChange={handleChange} />
          <input className="form-control" name="status" placeholder="Status (e.g. Applied)" value={form.status} onChange={handleChange} required />
          <input className="form-control" name="recruiter_contact" placeholder="Recruiter Contact" value={form.recruiter_contact} onChange={handleChange} />
          <input className="form-control" name="next_step" placeholder="Next Step" value={form.next_step} onChange={handleChange} />
          <input className="form-control" name="next_step_date" type="date" value={form.next_step_date} onChange={handleChange} />
          <input className="form-control" name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
          <button className="btn btn-primary" type="submit">➕ Add</button>
        </div>
        {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
      </form>
    </div>
  );
}