import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { config } from 'dotenv';
import pg from 'pg';

// Charger les variables d'environnement de test
config({ path: resolve(cwd(), '.env.test') });

console.log('Paramètres de connexion PostgreSQL:');
console.log('Hôte:', process.env.PGHOST || 'localhost');
console.log('Port:', process.env.PGPORT || 5432);
console.log('Base de données:', process.env.PGDATABASE);
console.log('Utilisateur:', process.env.PGUSER || 'postgres');

// Configurer pool global pour les tests
global.testDbPool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT, 10) || 5432,
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 10
});

// Vérifier la connexion à la base de données
global.testDbPool.connect((err, client, release) => {
  if (err) {
    console.error('Détails complets de l\'erreur de connexion:', err);
    console.error('Code d\'erreur:', err.code);
    console.error('Message:', err.message);
  } else {
    console.log('Connexion à la base de données réussie');
    release(); // Libérer le client immédiatement
  }
});