import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './app.jsx';

// Login Component
function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2 className="auth-title">Login to Loose Draw</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Loading...' : 'Login'}
                    </button>
                </form>
                <p className="auth-link">
                    Don't have an account? <a href="/register">Register</a>
                </p>
            </div>
        </div>
    );
}

// Register Component
function Register() {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        
        setLoading(true);
        
        try {
            await register(formData);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2 className="auth-title">Join Loose Draw</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="auth-input"
                    />
                    <input
                        type="text"
                        name="username"
                        placeholder="Username *"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password *"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password *"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="auth-input"
                    />
                    <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="auth-input"
                    />
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="auth-input"
                    />
                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="auth-input"
                    />
                    <textarea
                        name="address"
                        placeholder="Address"
                        value={formData.address}
                        onChange={handleChange}
                        className="auth-input"
                        rows="3"
                    />
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>
                <p className="auth-link">
                    Already have an account? <a href="/login">Login</a>
                </p>
            </div>
        </div>
    );
}

// Profile Component
function Profile() {
    const { user, logout } = useAuth();
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || '',
        postalCode: user?.postalCode || ''
    });

    const handleUpdate = async (e) => {
        e.preventDefault();
        // Update profile logic
        setEditing(false);
    };

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2 className="profile-title">My Profile</h2>
                <div className="profile-info">
                    <div className="info-item">
                        <span className="label">Email:</span>
                        <span>{user?.email}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Username:</span>
                        <span>{user?.username}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Member Status:</span>
                        <span className={user?.isLifestyleMember ? 'lifestyle-badge' : ''}>
                            {user?.isLifestyleMember ? 'Lifestyle Member' : 'Standard Member'}
                        </span>
                    </div>
                </div>
                
                {editing ? (
                    <form onSubmit={handleUpdate} className="profile-form">
                        <input
                            type="text"
                            placeholder="First Name"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            className="auth-input"
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            className="auth-input"
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="auth-input"
                        />
                        <textarea
                            placeholder="Address"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            className="auth-input"
                            rows="3"
                        />
                        <button type="submit" className="auth-button">Save Changes</button>
                        <button type="button" onClick={() => setEditing(false)} className="cancel-button">
                            Cancel
                        </button>
                    </form>
                ) : (
                    <div className="profile-actions">
                        <button onClick={() => setEditing(true)} className="edit-button">Edit Profile</button>
                        <button onClick={logout} className="logout-button">Logout</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default { Login, Register, Profile };