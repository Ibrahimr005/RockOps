import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './login.scss';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberPassword, setRememberPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Login returns the complete response with token, role, etc.
            const userData = await login(username, password);
            console.log('[LoginPage] Login successful:', userData);

            // Navigate based on role from the response
            if (userData.role === 'ADMIN') {
                console.log('[LoginPage] Redirecting to admin page');
                navigate('/admin');
            } else {
                console.log('[LoginPage] Redirecting to dashboard');
                navigate('/dashboard');
            }
        } catch (error) {
            setError(error.message || 'Failed to login. Please check your credentials.');
            console.error('[LoginPage] Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="rockops-login__container">
            <div className="rockops-login__card">
                <div className="rockops-login__header">
                    <h2 className="rockops-login__title">Login to Account</h2>
                    <p className="rockops-login__subtitle">Please enter your username and password to continue</p>
                </div>

                {error && (
                    <div className="rockops-login__error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="rockops-login__form-group">
                        <label className="rockops-login__label" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="rockops-login__input"
                            placeholder="@username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="rockops-login__form-group">
                        <div className="rockops-login__password-header">
                            <label className="rockops-login__label" htmlFor="password">
                                Password
                            </label>
                        </div>
                        <input
                            id="password"
                            type="password"
                            className="rockops-login__input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <a href="#" className="rockops-login__forgot-link">Forgot Password?</a>
                    </div>

                    <div className="rockops-login__remember">
                        <input
                            id="remember"
                            type="checkbox"
                            className="rockops-login__checkbox"
                            checked={rememberPassword}
                            onChange={(e) => setRememberPassword(e.target.checked)}
                        />
                        <label htmlFor="remember" className="rockops-login__remember-label">
                            Remember Password
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="rockops-login__button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="rockops-login__spinner"></span>
                                Signing in...
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>

                {/*<div className="rockops-login__signup">*/}
                {/*    <span>Don't have an account? </span>*/}
                {/*    <a href="/register" className="rockops-login__signup-link">Create Account</a>*/}
                {/*</div>*/}
            </div>
        </div>
    );
};

export default Login;