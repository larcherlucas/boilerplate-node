import jwt from 'jsonwebtoken';
import debugLib from 'debug';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: '.env' });

const publicKeyPath = path.join(__dirname, '..', '..', process.env.JWT_PUBLIC_KEY_PATH);
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

const debug = debugLib('app:jwtMiddleware');

export const jwtMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  debug('Authorization Header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const [scheme, token] = authHeader.split(' ');
  debug('Scheme:', scheme);
  debug('Token:', token);

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid authorization format' });
  }

  try {
    const decoded = jwt.verify(token, publicKey);
    debug('Decoded JWT:', decoded);

    req.user = decoded;
    next();
  } catch (error) {
    debug('JWT verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const checkRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: `Accès refusé. Rôle ${role} requis.` 
      });
    }

    next();
  };
};

export default jwtMiddleware;