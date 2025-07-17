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
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Normalize the username: trim whitespace and convert to lowercase
            const normalizedUsername = username.trim().toLowerCase();

            // Login returns the complete response with token, role, etc.
            const userData = await login(normalizedUsername, password);
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

    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value.trim().toLowerCase());
    };

    return (
        <div className="rockops__auth__login__main__container">
            {/* Background decoration */}
            <div className="rockops__auth__login__background__decoration">
                <div className="rockops__auth__login__floating__circle rockops__auth__login__floating__circle--primary"></div>
                <div className="rockops__auth__login__floating__circle rockops__auth__login__floating__circle--secondary"></div>
                <div className="rockops__auth__login__floating__circle rockops__auth__login__floating__circle--tertiary"></div>
            </div>

            {/* Main login card */}
            <div className="rockops__auth__login__main__card">
                {/* Header section */}
                <div className="rockops__auth__login__header__section">
                    <div className="rockops__auth__login__brand__logo">
                        <div className="rockops__auth__login__brand__icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h1 className="rockops__auth__login__brand__text">RockOps</h1>
                    </div>
                    <h2 className="rockops__auth__login__welcome__title">Welcome Back</h2>
                    <p className="rockops__auth__login__welcome__subtitle">Sign in to your account to continue</p>
                </div>

                {/* Error message */}
                {error && (
                    <div className="rockops__auth__login__error__message">
                        <svg className="rockops__auth__login__error__icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Login form */}
                <form onSubmit={handleSubmit} className="rockops__auth__login__form__wrapper">
                    {/* Username field */}
                    <div className="rockops__auth__login__form__group">
                        <label htmlFor="username" className="rockops__auth__login__field__label">
                            Username
                        </label>
                        <div className="rockops__auth__login__input__wrapper">
                            <svg className="rockops__auth__login__input__icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            <input
                                id="username"
                                type="text"
                                className="rockops__auth__login__input__field"
                                placeholder="Enter your username"
                                value={username}
                                onChange={handleUsernameChange}
                                required
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password field */}
                    <div className="rockops__auth__login__form__group">
                        <label htmlFor="password" className="rockops__auth__login__field__label">
                            Password
                        </label>
                        <div className="rockops__auth__login__input__wrapper">
                            <svg className="rockops__auth__login__input__icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="rockops__auth__login__input__field"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="rockops__auth__login__password__toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Form options */}
                    <div className="rockops__auth__login__form__options">
                        <label className="rockops__auth__login__checkbox__wrapper">
                            <input
                                type="checkbox"
                                checked={rememberPassword}
                                onChange={(e) => setRememberPassword(e.target.checked)}
                                className="rockops__auth__login__checkbox__input"
                            />
                            <span className="rockops__auth__login__checkbox__custom"></span>
                            <span className="rockops__auth__login__checkbox__label">Remember me</span>
                        </label>
                        <a href="#" className="rockops__auth__login__forgot__password">
                            Forgot password?
                        </a>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="rockops__auth__login__submit__button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="rockops__auth__login__button__spinner"></div>
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <svg className="rockops__auth__login__button__arrow" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="rockops__auth__login__footer__section">
                    <p>© 2024 RockOps. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;