import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charger les variables d'environnement
config();

// Résolution du chemin absolu pour la clé privée
const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH.startsWith('./app')
  ? path.join(__dirname, '..', process.env.JWT_PRIVATE_KEY_PATH.replace('./app/', ''))
  : process.env.JWT_PRIVATE_KEY_PATH;


let privateKey;
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  console.log("Clé privée chargée avec succès");
} catch (error) {
  console.error('Erreur lors du chargement de la clé privée:', error);
  console.error('Chemin tenté:', privateKeyPath);
  
  // Tentative de chemin alternatif si le premier échoue
  try {
    const alternativePath = path.join(__dirname, '..', '..', 'app', 'keys', 'private.key');
    privateKey = fs.readFileSync(alternativePath, 'utf8');
    console.log("Clé privée chargée depuis le chemin alternatif:", alternativePath);
  } catch (altError) {
    console.error('Échec du chargement depuis le chemin alternatif:', altError);
    throw new Error('Impossible de charger la clé privée JWT');
  }
}

const generateToken = (user) => {
  if (!user || !user.id) {
    throw new Error('Objet utilisateur invalide fourni');
  }

  const payload = {
    userId: user.id,
    username: user.username || null,
    email: user.email,
    role: user.role 
  };

  const options = {
    expiresIn: '2 hours',
    algorithm: 'RS256',
  };

  return jwt.sign(payload, privateKey, options);
};

export default generateToken;