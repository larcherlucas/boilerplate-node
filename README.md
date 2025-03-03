# Node.js Express API

A secure and scalable RESTful API built with Node.js and Express, featuring comprehensive security measures, monitoring, and best practices.

## 🏗️ Project Structure

```
src/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── middlewares/      # Custom middlewares
├── routes/           # Route definitions
├── services/         # Business logic
├── utils/           # Utility functions
└── server.js        # Application entry point
```

## 📦 Key Dependencies

### Core
- `express`: Web framework for Node.js
- `cors`: Cross-Origin Resource Sharing middleware
- `helmet`: Security headers middleware
- `compression`: Response compression
- `dotenv`: Environment variables management

### Security
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT authentication
- `express-rate-limit`: Request rate limiting
- `xss-clean`: XSS protection
- `hpp`: HTTP Parameter Pollution protection

### Monitoring & Logging
- `@sentry/node`: Error tracking and monitoring
- `winston`: Logging framework
- `morgan`: HTTP request logging
- `pm2`: Process manager for Node.js

### Documentation
- `swagger-jsdoc`: API documentation generation
- `swagger-ui-express`: Swagger UI for API docs

## 🗂️ Key Files and Their Purposes

### Core Files
- `src/server.js`: Application entry point and Express configuration
- `src/config/index.js`: Configuration management with Joi validation

### Controllers
- `src/controllers/authController.js`: Authentication logic (login/register)
- `src/controllers/userController.js`: User management operations

### Middlewares
- `src/middlewares/authenticate.js`: JWT authentication middleware
- `src/middlewares/errorHandler.js`: Centralized error handling
- `src/middlewares/rateLimiter.js`: Request rate limiting
- `src/middlewares/validators/`: Request validation schemas

### Utils
- `src/utils/logger.js`: Winston logger configuration
- `src/utils/ApiError.js`: Custom error class
- `src/utils/monitoring.js`: Sentry integration
- `src/utils/processManager.js`: PM2 configuration
- `src/utils/serverInfo.js`: Server information logging
- `src/utils/errorEmoji.js`: Error type emoji mapping

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Configure your `.env` file
5. Start development server:
   ```bash
   npm run dev
   ```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | JWT signing key | - |
| JWT_EXPIRES_IN | JWT expiration | 1d |
| SENTRY_DSN | Sentry DSN URL | - |
| PUBLIC_URL | Production URL | - |

## 🛠️ Scripts

- `npm start`: Production mode
- `npm run dev`: Development mode with nodemon
- `npm run start:pm2`: Production mode with PM2
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm test`: Run tests

## 🔒 Security Features

- HTTP Security Headers (Helmet)
- CORS Protection
- Rate Limiting
- XSS Protection
- Parameter Pollution Prevention
- Request Size Limiting
- Secure Password Hashing

## 📊 Monitoring

- Sentry error tracking
- Winston logging
- PM2 process management
- HTTP request logging (Morgan)

## 🧪 Testing

Tests are written using Jest and Supertest for:
- Authentication flows
- User operations
- Middleware functionality
- Error handling

## 📖 API Documentation

API documentation is available at `/api-docs` when running the server (Swagger UI).#   b o i l e r p l a t e - n o d e  
 