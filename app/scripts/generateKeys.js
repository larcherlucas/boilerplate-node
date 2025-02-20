// scripts/generateKeys.js
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, '..', '..', 'app', 'keys');

console.log('Attempting to create directory at:', keyPath);

try {
    // Force creation of directory
    if (!fs.existsSync(keyPath)) {
        fs.mkdirSync(keyPath, { recursive: true });
        console.log('Keys directory created successfully at:', keyPath);
    } else {
        console.log('Keys directory already exists at:', keyPath);
    }

    // Generate key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // Write keys to files with explicit error handling
    fs.writeFileSync(path.join(keyPath, 'private.key'), privateKey);
    console.log('Private key created successfully');

    fs.writeFileSync(path.join(keyPath, 'public.key'), publicKey);
    console.log('Public key created successfully');

    console.log('RSA key pair generated successfully');
} catch (error) {
    console.error('Error during key generation:', error);
    process.exit(1);
}