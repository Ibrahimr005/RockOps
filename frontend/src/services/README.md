# Authentication Services

This directory contains the authentication-related services for the RockOps application.

## Files

### `authService.js`
Basic authentication service that handles direct API calls to the backend authentication endpoints.

**Endpoints:**
- `authenticate(username, password)` - Authenticate user with credentials
- `register(userData)` - Register new user
- `validateToken()` - Validate current token
- `refreshToken(refreshToken)` - Refresh authentication token
- `logout()` - Logout user

### `loginService.js`
Comprehensive login service that provides advanced authentication functionality including session management, token validation, and error handling.

**Key Features:**
- User authentication and registration
- Token management and validation
- Session persistence
- Role-based access control
- Comprehensive error handling
- Automatic token expiration checking

## Usage

### Basic Authentication

```javascript
import { loginService } from '../services/loginService';

// Login
try {
    const userData = await loginService.authenticate(username, password);
    console.log('Login successful:', userData);
} catch (error) {
    console.error('Login failed:', error.message);
}

// Register
try {
    const result = await loginService.register({
        username: 'newuser',
        password: 'password123',
        email: 'user@example.com'
    });
    console.log('Registration successful:', result);
} catch (error) {
    console.error('Registration failed:', error.message);
}
```

### Session Management

```javascript
// Save user session
loginService.saveUserSession(userData);

// Check if user is authenticated
const isAuth = loginService.isAuthenticated();

// Get user role
const role = loginService.getUserRole();

// Check specific role
const isAdmin = loginService.hasRole('ADMIN');

// Check multiple roles
const hasAccess = loginService.hasAnyRole(['ADMIN', 'MANAGER']);
```

### Token Management

```javascript
// Check if token is expired
const isExpired = loginService.isTokenExpired(token);

// Get token expiration time
const expiration = loginService.getTokenExpiration(token);

// Validate token with backend
const isValid = await loginService.validateToken();

// Refresh token
const newTokenData = await loginService.refreshToken(refreshToken);
```

## API Configuration

The authentication endpoints are configured in `../config/api.config.js`:

```javascript
export const AUTH_ENDPOINTS = {
    BASE: '/api/v1/auth',
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    AUTHENTICATE: '/api/v1/auth/authenticate'
};
```

## Error Handling

The login service provides comprehensive error handling for different scenarios:

- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Access denied
- **404 Not Found**: Authentication service not found
- **500 Internal Server Error**: Server error
- **Network Errors**: Connection issues

All errors are formatted with user-friendly messages.

## Integration with AuthContext

The `AuthContext` uses the `loginService` for all authentication operations:

```javascript
import { loginService } from '../services/loginService';

// In AuthContext
const login = async (username, password) => {
    try {
        const userData = await loginService.authenticate(username, password);
        loginService.saveUserSession(userData);
        // Update context state...
        return userData;
    } catch (error) {
        throw error; // loginService handles error formatting
    }
};
```

## Security Features

- **Token Expiration**: Automatic checking of JWT token expiration
- **Session Persistence**: Secure storage of user sessions in localStorage
- **Role-based Access**: Built-in role checking functionality
- **Error Sanitization**: User-friendly error messages without exposing sensitive information
- **Network Resilience**: Graceful handling of network errors

## Best Practices

1. **Always use try-catch**: Wrap authentication calls in try-catch blocks
2. **Check token expiration**: Use `isTokenExpired()` before making authenticated requests
3. **Handle errors gracefully**: Display user-friendly error messages
4. **Validate roles**: Use role checking methods for access control
5. **Clear sessions on logout**: Always call `clearUserSession()` on logout 