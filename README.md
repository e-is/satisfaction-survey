# Satisfaction Survey - Application d'Enquête de Satisfaction 📊

Ce dépôt contient le code source de l'application **Satisfaction Survey**, un système complet de gestion d'enquêtes de satisfaction. L'application est composée d'un questionnaire public et d'un tableau de bord sécurisé d'administration pour la visualisation et la gestion des résultats.

Toutes les contributions et le code source de ce projet sont publiés sous licence **AGPL-3.0-only**.

---

## 🏗️ Architecture & Stack Technique

L'application est conçue selon une architecture client-serveur moderne, optimisée pour la simplicité et la performance :

### 🖥️ Frontend (Client)
- **Framework** : React 19+ avec TypeScript (mode strict).
- **Compilation & Outillage** : Vite 8+ avec support de **React Compiler** pour l'optimisation automatique des rendus.
- **Routage** : Routage côté client ultra-léger et sans dépendance externe via un hook personnalisé (`client/src/useRouter.ts`).
- **Stylisation** : Tailwind CSS 4+ (intégré via le plugin `@tailwindcss/vite`, sans fichier de configuration superflu).
- **Graphiques** : Recharts pour la génération de la synthèse graphique (radar/toile d'araignée).

### ⚙️ Backend (Serveur)
- **Environnement** : Node.js avec Express.
- **Stockage des données** : Base de données NoSQL légère basée sur des fichiers JSON stockés dans le dossier `/data`. Les fichiers d'enquête respectent le format de nommage `enquete_{client_cleaned}_{timestamp}.json`.
- **Sécurité & Authentification** :
  - Génération automatique des identifiants d'administration dans `config/auth.json` au premier démarrage (identifiants par défaut : `Etienne` / `Toto`).
  - Validation par token encodé en Base64 via un middleware d'authentification (`Bearer token`).
  - Protection contre la traversée de répertoires lors de la manipulation des fichiers d'enquête.

### 🧪 Tests
- **Framework** : Playwright pour les tests End-to-End (E2E).
- **Couverture** : Soumission du formulaire, routage client, connexion administration (succès/échec), modification du statut de comptabilisation des enquêtes, suppression et déconnexion.

---

## 🛠️ Fonctionnalités Clés

1. **Questionnaire Public (`/` ou `/survey`)** :
   - Formulaire dynamique d'évaluation de la prestation (Qualité, Coût, Délais) avec gestion multilingue (Français/Anglais).
   - Validation stricte des données de l'en-tête (Client, Référents, Projet, Date).
2. **Dashboard d'Administration (`/results`)** :
   - Visualisation globale et détaillée de toutes les enquêtes soumises.
   - **Score global** : Calcul dynamique du score cumulé de l'enquête ($Score\ A = \sum (importance \times evaluation)$) comparé au score maximum possible ($Score\ B = \sum (importance \times note\ max)$).
   - **Synthèse Graphique** : Graphique en radar dynamique affichant les moyennes par critère.
   - **Appréciation Globale** : Section dédiée aux commentaires textuels (anciennement `comments` dans le JSON, géré de manière rétrocompatible sous la clé `appreciation`).
   - Actions d'administration : Prise en compte (comptabilisation true/false) et suppression de fiches d'enquêtes.

---

## 📂 Structure du Projet

```text
satisfaction-survey/
├── AGENTS.md               # Directives de développement et instructions pour agents IA
├── package.json            # Dépendances et scripts backend
├── server.js               # Code serveur Express principal
├── config/
│   └── auth.json           # Stockage sécurisé des identifiants (généré au démarrage)
├── data/                   # Fichiers JSON des enquêtes collectées
├── tests/
│   └── survey.spec.ts      # Suite de tests Playwright E2E
├── client/                 # Application Frontend React
│   ├── index.html
│   ├── package.json        # Dépendances et scripts frontend
│   ├── vite.config.ts      # Configuration de compilation Vite & proxy API
│   └── src/
│       ├── App.tsx         # Point d'entrée de l'application frontend
│       ├── useRouter.ts    # Routeur client minimaliste
│       ├── components/
│       │   └── ResultsView.tsx # Vue d'administration et de synthèse des résultats
│       └── locales/        # Fichiers de traduction i18n (fr.json, en.json)
```

---

## 🚀 Installation et Démarrage

### 1. Installation des dépendances
Installez les dépendances du serveur (à la racine) et du client :
```bash
# Installation globale des dépendances du projet
npm install && cd client && npm install
```

### 2. Lancement en mode Développement (Dev)
Pour développer sur l'application avec rechargement à chaud (Hot Module Replacement) :
```bash
# Lancer le serveur backend (port 5000)
npm run start

# Dans un autre terminal, lancer le serveur frontend (port 5173, proxie automatiquement /api vers 5000)
cd client
npm run dev
```

### 3. Lancement en mode Production (Build & Serve)
Pour servir l'application dans des conditions réelles de production :
```bash
# 1. Compiler le client React
cd client
npm run build

# 2. Retourner à la racine et démarrer le serveur de production
cd ..
npm run start
```
*Note : L'application compilée sera servie directement par Express sur `http://localhost:5000`.*

---

## 🔄 Règle d'or de Modification (Workflow obligatoire)

> ⚠️ **IMPORTANT** : Après toute modification du code du client (dans `/client`), vous devez **obligatoirement** recompiler le client et redémarrer le serveur pour que les changements soient pris en compte de manière correcte (notamment pour la suite de tests Playwright) :
>
> 1. **Recompiler le client** : `cd client && npm run build`
> 2. **Libérer le port si nécessaire** : `kill -9 $(lsof -t -i:5000)` (si le port 5000 reste occupé)
> 3. **Redémarrer le serveur** : `npm run start` (ou `node server.js`) depuis la racine.

---

## 🧪 Exécution des Tests Playwright

Les tests E2E permettent de s'assurer de la non-régression de l'ensemble du cycle de vie des enquêtes.

Pour exécuter les tests :
```bash
# Lancer la suite de tests E2E
npx playwright test
```
*Playwright démarrera automatiquement le serveur local via la commande configurée dans `playwright.config.ts`.*

---

## 📜 Conventions de Code & Directives

### Directives de développement
- **Langue** : L'interface utilisateur est en **français** par défaut. Le code (nommage des variables, fonctions, commentaires) doit être rédigé en **anglais**.
- **Licence** : Tout nouveau fichier de code source doit comporter l'en-tête suivant :
  ```javascript
  // License: AGPL-3.0-only
  ```
- **Fichiers d'Enquêtes** : Générés sous la forme `enquete_{client_cleaned}_{timestamp}.json`. Ne pas commiter les fichiers présents dans le dossier `data/`.

### Intelligence Artificielle / Agents IA
Si vous utilisez un agent de codage IA (comme Gemini CLI, Junie, etc.), le fichier **`AGENTS.md`** à la racine contient des instructions ultra-spécifiques et des mandates structurels à respecter scrupuleusement. Merci de lui demander de le lire au début de chaque session.
