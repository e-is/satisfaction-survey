// server.js
// License: AGPL-3.0-only
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');

// Création du dossier de stockage NoSQL si inexistant
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

app.use(cors());
app.use(express.json());

// Initialisation du fichier auth.json si inexistant
const CONFIG_DIR = path.join(__dirname, 'config');
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR);
}
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');
if (!fs.existsSync(AUTH_FILE)) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify([{ username: 'Etienne', password: 'Toto' }], null, 2), 'utf-8');
}

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Accès non autorisé.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        if (fs.existsSync(AUTH_FILE)) {
            const users = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                req.user = user;
                return next();
            }
        }
    } catch (e) {
        // Ignore error
    }
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide.' });
};

// Point d'entrée pour la connexion
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Identifiant et mot de passe obligatoires.' });
        }
        if (!fs.existsSync(AUTH_FILE)) {
            return res.status(500).json({ success: false, error: 'Fichier utilisateur introuvable.' });
        }
        const users = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            const token = Buffer.from(`${username}:${password}`).toString('base64');
            return res.json({ success: true, token, username });
        } else {
            return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        return res.status(500).json({ success: false, error: 'Une erreur interne est survenue.' });
    }
});

// Point d'entrée API pour sauvegarder le formulaire
app.post('/api/survey', (req, res) => {
    try {
        const data = req.body;

        // Validation minimale des champs obligatoires
        const { header } = data;
        if (
            !header?.client ||
            !header?.clientReferent?.firstName ||
            !header?.clientReferent?.lastName ||
            !header?.eisReferent?.firstName ||
            !header?.eisReferent?.lastName ||
            !header?.project ||
            !header?.date
        ) {
            return res.status(400).json({ success: false, error: 'Champs d\'en-tête obligatoires manquants.' });
        }

        // Valeur comptabilisé par défaut à vrai
        if (data.comptabilise === undefined) {
            data.comptabilise = true;
        }

        // Nommage propre du fichier NoSQL (JSON)
        const clientCleaned = header.client.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `enquete_${clientCleaned}_${timestamp}.json`;
        const filepath = path.join(DATA_DIR, filename);

        // Écriture du fichier JSON sur le disque
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

        return res.status(201).json({ success: true, message: 'Enquête enregistrée avec succès.', file: filename });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement :', error);
        return res.status(500).json({ success: false, error: 'Une erreur interne est survenue.' });
    }
});

// GET /api/survey : Récupère la liste de toutes les enquêtes
app.get('/api/survey', authMiddleware, (req, res) => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            return res.json([]);
        }
        const files = fs.readdirSync(DATA_DIR);
        const surveys = files
            .filter(file => file.endsWith('.json') && file.startsWith('enquete_'))
            .map(file => {
                const filepath = path.join(DATA_DIR, file);
                try {
                    const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                    // On injecte le filename pour permettre les modifications futures
                    return { ...content, filename: file };
                } catch (e) {
                    console.error(`Erreur de lecture du fichier ${file}:`, e);
                    return null;
                }
            })
            .filter(Boolean);

        return res.json(surveys);
    } catch (error) {
        console.error('Erreur lors de la récupération des enquêtes :', error);
        return res.status(500).json({ success: false, error: 'Impossible de récupérer les enquêtes.' });
    }
});

// PUT /api/survey/:filename : Met à jour une enquête spécifique
app.put('/api/survey/:filename', authMiddleware, (req, res) => {
    try {
        const { filename } = req.params;

        // Validation / sanitisation du nom de fichier pour éviter les failles path traversal
        if (!/^[a-z0-9_.-]+$/i.test(filename) || !filename.endsWith('.json')) {
            return res.status(400).json({ success: false, error: 'Nom de fichier invalide.' });
        }

        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ success: false, error: 'Fichier non trouvé.' });
        }

        const data = req.body;
        // Ne pas stocker le nom de fichier à l'intérieur du JSON
        const { filename: _, ...surveyData } = data;

        fs.writeFileSync(filepath, JSON.stringify(surveyData, null, 2), 'utf-8');
        return res.json({ success: true, message: 'Enquête mise à jour avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'enquête :', error);
        return res.status(500).json({ success: false, error: 'Erreur interne lors de la mise à jour.' });
    }
});

// DELETE /api/survey/:filename : Supprime une enquête spécifique
app.delete('/api/survey/:filename', authMiddleware, (req, res) => {
    try {
        const { filename } = req.params;

        // Validation / sanitisation du nom de fichier pour éviter les failles path traversal
        if (!/^[a-z0-9_.-]+$/i.test(filename) || !filename.endsWith('.json')) {
            return res.status(400).json({ success: false, error: 'Nom de fichier invalide.' });
        }

        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ success: false, error: 'Fichier non trouvé.' });
        }

        fs.unlinkSync(filepath);
        return res.json({ success: true, message: 'Enquête supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'enquête :', error);
        return res.status(500).json({ success: false, error: 'Erreur interne lors de la suppression.' });
    }
});

// Distribution du frontend en production
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    console.log(`Get request`, req);
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});