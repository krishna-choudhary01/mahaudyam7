import React, { useState, useEffect } from 'react';
import { adminAuthService, ROLES } from '../../../services/auth/adminAuthService.js';
import { useLanguage } from '../../../i18n/index.js';

export function UserManagementSection() {
  const { t, isMarathi } = useLanguage();
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Admin User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(ROLES.ADMIN);
  const [newPassword, setNewPassword] = useState('');

  const isSuperAdmin = adminAuthService.hasPermission('MANAGE_ADMINS');

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdminUsers();
    }
  }, [isSuperAdmin]);

  const loadAdminUsers = async () => {
    setLoading(true);
    try {
      const users = await adminAuthService.getAdminUsers();
      setAdminUsers(users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await adminAuthService.createAdminUser({
        username: newUsername,
        email: newEmail,
        name: newName,
        role: newRole,
        password: newPassword
      });

      if (res.success) {
        setSuccess(`✓ Created administrator ${res.user.name} (${res.user.role})`);
        setNewUsername('');
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setShowCreateForm(false);
        loadAdminUsers();
      } else {
        setError(res.error || 'Failed to create administrative account.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change status of ${user.name} to ${nextStatus}?`)) {
      return;
    }

    try {
      const res = await adminAuthService.updateAdminStatus(user.userId, nextStatus);
      if (res.success) {
        setSuccess(`✓ ${res.message}`);
        setTimeout(() => setSuccess(''), 3000);
        loadAdminUsers();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="admin-section">
        <div className="admin-card" style={{ borderColor: '#ffcdd2', backgroundColor: '#ffebee' }}>
          <h3 style={{ color: '#c62828' }}>🚫 Access Restricted</h3>
          <p>
            Administrative User Management is restricted strictly to <strong>SUPER_ADMIN</strong>.
            Your active role does not possess the <code>MANAGE_ADMINS</code> permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.users')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'प्रशासक खाती तयार करणे, भूमिका वाटप व सुरक्षा नियंत्रण (केवळ सर्वोच्च प्रशासक)'
              : 'Provision administrative accounts, assign roles, and manage permissions (Super Admin Only)'}
          </p>
        </div>
        <button
          type="button"
          className="btn-mini btn-mini--primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '➕ Provision New Administrator'}
        </button>
      </div>

      {success && (
        <div className="admin-alert admin-alert--info">
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert--error">
          <span>{error}</span>
        </div>
      )}

      {/* Create New Admin User Drawer */}
      {showCreateForm && (
        <div className="admin-card" style={{ borderLeft: '4px solid #1b5e20' }}>
          <h3 className="admin-card__title">Create Official Administrative Account</h3>
          <p style={{ fontSize: '0.8rem', color: '#6e7a72', marginBottom: '12px' }}>
            Notice: Public registration for administrators is prohibited. Accounts created here are strictly bound to official governance roles.
          </p>

          <form onSubmit={handleCreateUser}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Admin Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  required
                />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. anand_mkt"
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Official Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. anand.deshmukh@mahaudyam.gov.in"
                  required
                />
              </div>
              <div className="form-group">
                <label>Assigned Administrative Role *</label>
                <select
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value={ROLES.ADMIN}>ADMIN (Market Records & Verification)</option>
                  <option value={ROLES.MODERATOR}>MODERATOR (Field Review & Flagging)</option>
                  <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN (Full Governance)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label>Temporary Password (min 8 chars with complexity) *</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter secure initial password"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" className="btn-mini btn-mini--primary">
                Create Account
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Users Table */}
      <div className="admin-card">
        <h3 className="admin-card__title">Registered Governance Personnel</h3>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Personnel Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Last Login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>
                    Loading administrative accounts...
                  </td>
                </tr>
              ) : adminUsers.map((u) => (
                <tr key={u.userId}>
                  <td><strong>{u.name}</strong></td>
                  <td><code>{u.username}</code></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`admin-role-pill ${u.role === ROLES.SUPER_ADMIN ? 'role-super' : u.role === ROLES.ADMIN ? 'role-admin' : 'role-moderator'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.status === 'ACTIVE' ? 'badge-verified' : 'badge-inactive'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                  <td>
                    {u.userId !== adminAuthService.getCurrentAdmin()?.userId ? (
                      <button
                        type="button"
                        className={`btn-mini ${u.status === 'ACTIVE' ? 'btn-mini--danger' : 'btn-mini--primary'}`}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#6e7a72' }}>Current User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagementSection;
