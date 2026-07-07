// client/src/components/ResultsView.tsx
// License: AGPL-3.0-only

import { useState, useEffect } from 'react';
import logo from '../assets/eis-logo_web_large_sans_texte-v1.0.png';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

export interface Criterion {
    id: string;
    label: string;
}

export interface Category {
    id: string;
    title: string;
    criteria: Criterion[];
}

const categories: Category[] = [
    {
        id: 'qualite',
        title: '1. Qualité de la prestation',
        criteria: [
            { id: 'gestion', label: 'Gestion du projet' },
            { id: 'strategique', label: 'Prise en compte des enjeux stratégiques et fonctionnels' },
            { id: 'anticipation', label: 'Anticipation des besoins' },
            { id: 'livrables', label: 'Qualité des livrables' },
            { id: 'solutions', label: 'Pertinence des solutions apportées' },
            { id: 'competences', label: "Adéquation des compétences de l'équipe projet" }
        ]
    },
    {
        id: 'cout',
        title: '2. Coût',
        criteria: [
            { id: 'budget', label: 'Respect du budget / forfait' },
            { id: 'tarifs', label: 'Compétitivité des tarifs' }
        ]
    },
    {
        id: 'delais',
        title: '3. Délais',
        criteria: [
            { id: 'calendrier', label: 'Respect du calendrier' },
            { id: 'reactivite', label: 'Réactivité' }
        ]
    }
];

export interface HeaderInfo {
    client: string;
    clientReferent: {
        firstName: string;
        lastName: string;
        service?: string;
    };
    eisReferent: {
        firstName: string;
        lastName: string;
    };
    project: string;
    date: string;
    details?: string;
    type?: string;
    perimetre?: string;
}

export interface Rating {
    importance?: number;
    evaluation?: number;
}

export interface Ratings {
    [key: string]: Rating;
}

export interface SurveyData {
    filename: string;
    header: HeaderInfo;
    ratings: Ratings;
    appreciation?: string;
    comments?: string;
    comptabilise?: boolean;
    allowAppreciationPublication?: boolean;
    allowNamePublication?: boolean;
    type?: string;
    perimetre?: string;
}

interface ResultsViewProps {
    onNavigate: (to: string) => void;
}

// Custom tick label wrapping helper
const WrappedTick = (props: any) => {
    const { x, y, cx, cy, payload } = props;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = 22; // Moderate offset to prevent labels from going out of bounds
    
    const nx = dist !== 0 ? dx / dist : 0;
    const ny = dist !== 0 ? dy / dist : 0;
    
    const finalX = x + nx * offset;
    const finalY = y + ny * offset;

    const words = payload.value.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word: string) => {
        if ((currentLine + word).length > 15) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    lines.push(currentLine.trim());

    return (
        <g transform={`translate(${finalX},${finalY})`}>
            {lines.map((line, index) => (
                <text
                    key={index}
                    x={0}
                    y={index * 11}
                    dy={index === 0 ? 0 : 3}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={9}
                    fontWeight={600}
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

export default function ResultsView({ onNavigate }: ResultsViewProps) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loggingIn, setLoggingIn] = useState(false);

    const [surveys, setSurveys] = useState<SurveyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetailedRatings, setShowDetailedRatings] = useState(false);
    const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

    const [surveyType, setSurveyType] = useState<string>('Fin de projet');
    const [perimeter, setPerimeter] = useState<string>('');
    const [surveyLanguage, setSurveyLanguage] = useState<string>('fr');
    const [copied, setCopied] = useState<boolean>(false);

    // Filtering states
    const [filterClient, setFilterClient] = useState<string>('');
    const [filterProject, setFilterProject] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterPerimeter, setFilterPerimeter] = useState<string>('');
    const [filterPublication, setFilterPublication] = useState<string>('');
    const [filterNominative, setFilterNominative] = useState<string>('');

    // Sorting states
    const [sortColumn, setSortColumn] = useState<string | null>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleTypeChange = (value: string) => {
        setSurveyType(value);
        if (value === 'Enquête annuelle') {
            setPerimeter('Année écoulée');
        } else {
            setPerimeter('');
        }
    };

    const getGeneratedUrl = () => {
        const baseUrl = `${window.location.origin}/`;
        const params = new URLSearchParams();
        if (surveyType === 'Enquête annuelle') {
            params.set('type', 'annuelle');
            if (perimeter === 'Année écoulée') {
                params.set('perimetre', 'annee');
            } else if (perimeter === 'Depuis la dernière enquête') {
                params.set('perimetre', 'derniere');
            }
        } else {
            params.set('type', 'projet');
        }
        
        // Append selected language
        params.set('lang', surveyLanguage);
        
        return `${baseUrl}?${params.toString()}`;
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(getGeneratedUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for non-secure contexts or testing environments without clipboard permission
            try {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = getGeneratedUrl();
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
            }
        }
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        setToken(null);
        setSurveys([]);
    };

    // Handle login form submission
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setLoggingIn(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_username', data.username);
                setToken(data.token);
                setUsernameInput('');
                setPasswordInput('');
            } else {
                setLoginError(data.error || 'Identifiant ou mot de passe incorrect.');
            }
        } catch (err) {
            setLoginError('Impossible de contacter le serveur de connexion.');
        } finally {
            setLoggingIn(false);
        }
    };

    // Fetch surveys from the server
    const fetchSurveys = async (currentToken: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/survey', {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            if (response.status === 401) {
                handleLogout();
                throw new Error('Session expirée ou non autorisée.');
            }
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données.');
            }
            const data = await response.json();
            setSurveys(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Impossible de se connecter au serveur.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchSurveys(token);
        }
    }, [token]);

    // Toggle the comptabilise status of a survey
    const handleToggleComptabilise = async (survey: SurveyData) => {
        if (!token) return;
        const updatedSurvey = {
            ...survey,
            comptabilise: !(survey.comptabilise ?? true)
        };

        // Optimistic update
        setSurveys(prev => prev.map(s => s.filename === survey.filename ? updatedSurvey : s));

        try {
            const response = await fetch(`/api/survey/${survey.filename}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedSurvey)
            });

            if (response.status === 401) {
                handleLogout();
                alert('Votre session a expiré. Merci de vous reconnecter.');
                return;
            }

            if (!response.ok) {
                throw new Error('La mise à jour a échoué sur le serveur.');
            }
        } catch (err) {
            console.error(err);
            // Rollback on error
            setSurveys(prev => prev.map(s => s.filename === survey.filename ? survey : s));
            alert('Erreur lors de la mise à jour de la case Comptabilisé.');
        }
    };

    // Confirm and delete a survey
    const handleDeleteSurvey = async (filename: string) => {
        if (!token) return;
        console.log('ResultsView: handleDeleteSurvey called with:', filename);
        try {
            const response = await fetch(`/api/survey/${filename}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('ResultsView: DELETE response status:', response.status);

            if (response.status === 401) {
                handleLogout();
                alert('Votre session a expiré. Merci de vous reconnecter.');
                return;
            }

            if (!response.ok) {
                throw new Error('La suppression a échoué.');
            }

            setSurveys(prev => prev.filter(s => s.filename !== filename));
            setDeletingFilename(null);
            console.log('ResultsView: Deleted successfully, state updated.');
        } catch (err) {
            console.error('ResultsView: Error deleting survey:', err);
            alert('Erreur lors de la suppression de l\'enquête.');
        }
    };

    const uniqueClients = Array.from(new Set(surveys.map(s => s.header.client).filter(Boolean))).sort();
    const uniqueProjects = Array.from(new Set(surveys.map(s => s.header.project).filter(Boolean))).sort();

    // Compute filtered and sorted list of surveys
    const getFilteredAndSortedSurveys = () => {
        let result = [...surveys];

        // 1. Filtering
        if (filterClient) {
            result = result.filter(s => s.header.client === filterClient);
        }
        if (filterProject) {
            result = result.filter(s => s.header.project === filterProject);
        }
        if (filterType) {
            result = result.filter(s => {
                const typeVal = s.type || s.header?.type || '-';
                return typeVal === filterType;
            });
        }
        if (filterPerimeter) {
            result = result.filter(s => {
                const permVal = s.perimetre || s.header?.perimetre || '-';
                return permVal === filterPerimeter;
            });
        }
        if (filterPublication) {
            result = result.filter(s => {
                const val = s.allowAppreciationPublication !== undefined
                    ? (s.allowAppreciationPublication ? 'Oui' : 'Non')
                    : 'Non';
                return val === filterPublication;
            });
        }
        if (filterNominative) {
            result = result.filter(s => {
                const val = s.allowNamePublication !== undefined
                    ? (s.allowNamePublication ? 'Oui' : 'Non')
                    : 'Non';
                return val === filterNominative;
            });
        }

        // 2. Sorting
        if (sortColumn) {
            result.sort((a, b) => {
                let valA: string = '';
                let valB: string = '';

                switch (sortColumn) {
                    case 'date':
                        valA = a.header.date || '';
                        valB = b.header.date || '';
                        break;
                    case 'client':
                        valA = a.header.client || '';
                        valB = b.header.client || '';
                        break;
                    case 'project':
                        valA = a.header.project || '';
                        valB = b.header.project || '';
                        break;
                    case 'type':
                        valA = a.type || a.header?.type || '-';
                        valB = b.type || b.header?.type || '-';
                        break;
                    case 'perimeter':
                        valA = a.perimetre || a.header?.perimetre || '-';
                        valB = b.perimetre || b.header?.perimetre || '-';
                        break;
                    case 'publication':
                        valA = a.allowAppreciationPublication !== undefined ? (a.allowAppreciationPublication ? 'Oui' : 'Non') : 'Non';
                        valB = b.allowAppreciationPublication !== undefined ? (b.allowAppreciationPublication ? 'Oui' : 'Non') : 'Non';
                        break;
                    case 'nominative':
                        valA = a.allowNamePublication !== undefined ? (a.allowNamePublication ? 'Oui' : 'Non') : 'Non';
                        valB = b.allowNamePublication !== undefined ? (b.allowNamePublication ? 'Oui' : 'Non') : 'Non';
                        break;
                    default:
                        break;
                }

                const comparison = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    };

    const displaySurveys = getFilteredAndSortedSurveys();

    // Toggle Sort Helper
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Calculate averages for surveys where comptabilise is true
    const activeSurveys = displaySurveys.filter(s => s.comptabilise ?? true);
    const hasActiveSurveys = activeSurveys.length > 0;

    const getAverageScore = (criterionId: string): number => {
        if (!hasActiveSurveys) return 0;
        const total = activeSurveys.reduce((sum, survey) => {
            const rating = survey.ratings[criterionId];
            const imp = rating?.importance ?? 0;
            const evalNote = rating?.evaluation ?? 0;
            return sum + (imp * evalNote);
        }, 0);
        return parseFloat((total / activeSurveys.length).toFixed(1));
    };

    // Prepare chart data
    const qualiteChartData = categories
        .find(c => c.id === 'qualite')
        ?.criteria.map(crit => ({
            subject: crit.label,
            score: getAverageScore(crit.id),
            fullMark: 60
        })) || [];

    const coutDelaisChartData = categories
        .filter(c => ['cout', 'delais'].includes(c.id))
        .flatMap(cat => cat.criteria)
        .map(crit => ({
            subject: crit.label,
            score: getAverageScore(crit.id),
            fullMark: 60
        }));

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans justify-between">
                {/* Header visuel */}
                <header className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white py-12 px-4 md:px-8 shadow-md">
                    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <img src={logo} alt="E-IS Logo" className="h-28 md:h-32 w-auto md:-ml-4" />
                            <div className="md:ml-6">
                                <h1 className="text-4xl font-extrabold tracking-tight">Gestion des résultats</h1>
                                <p className="mt-2 text-teal-100 max-w-2xl">
                                    Accès réservé aux administrateurs.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onNavigate('/')}
                            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer"
                        >
                            ← Retour au formulaire
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-4 py-16">
                    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-100 space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800">Connexion requise</h2>
                            <p className="text-sm text-slate-500 mt-1">Saisissez vos identifiants pour accéder aux données</p>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-semibold text-slate-700">Identifiant</label>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-teal-500 text-slate-800"
                                    value={usernameInput}
                                    onChange={e => setUsernameInput(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Mot de passe</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-teal-500 text-slate-800"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                />
                            </div>

                            {loginError && (
                                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-semibold">
                                    {loginError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loggingIn}
                                className="w-full bg-gradient-to-r from-teal-700 to-cyan-800 hover:from-teal-800 hover:to-cyan-900 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loggingIn ? 'Connexion en cours...' : 'Se connecter'}
                            </button>
                        </form>
                    </div>
                </main>

                <footer className="bg-slate-900 text-slate-400 py-10 px-6 border-t border-slate-800 text-xs">
                    <div className="max-w-full mx-auto space-y-4 text-center">
                        <p className="font-bold text-sm text-slate-200 uppercase tracking-wide">
                            E-IS – Environmental Information Systems
                        </p>
                        <p className="max-w-2xl mx-auto leading-relaxed">
                            19, rue de Cassiopée 53 470 Martigné-sur-Mayenne FRANCE<br />
                            Tél. : <a href="tel:+33973889825" className="text-teal-400 hover:underline">+ 33 (0) 9 73 88 98 25</a> –{' '}
                            <a href="https://www.e-is.pro" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                                https://www.e-is.pro
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white py-12 px-4 md:px-8 shadow-md">
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <img src={logo} alt="E-IS Logo" className="h-28 md:h-32 w-auto md:-ml-4" />
                        <div className="md:ml-6">
                            <h1 className="text-4xl font-extrabold tracking-tight">Gestion des résultats</h1>
                            <p className="mt-2 text-teal-100 max-w-2xl">
                                Visualisation globale des enquêtes de satisfaction reçues.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-semibold text-teal-100 bg-teal-950/40 px-3.5 py-2 rounded-xl border border-teal-700/30">
                            Connecté : <strong className="text-white">{localStorage.getItem('auth_username') || 'Admin'}</strong>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer"
                        >
                            Se déconnecter
                        </button>
                        <button
                            onClick={() => onNavigate('/')}
                            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all text-sm cursor-pointer"
                        >
                            ← Retour au formulaire
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-grow max-w-full w-full mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-semibold">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-800"></div>
                        <p className="text-slate-500 font-medium">Chargement des données...</p>
                    </div>
                ) : surveys.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-slate-500 text-lg font-semibold">Aucune enquête enregistrée pour le moment.</p>
                        <button
                            onClick={() => onNavigate('/')}
                            className="mt-4 inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm cursor-pointer"
                        >
                            Saisir une première enquête
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col xl:flex-row gap-8 items-start">
                        {/* Table Column */}
                        <div className="flex-grow min-w-0 space-y-6">
                            {/* Link Sharing Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider">
                                    Création d'un lien de questionnaire
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    {/* Type Dropdown */}
                                    <div className="space-y-1">
                                        <label htmlFor="survey-type" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Type
                                        </label>
                                        <select
                                            id="survey-type"
                                            value={surveyType}
                                            onChange={e => handleTypeChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-teal-500 text-slate-800 text-sm cursor-pointer"
                                        >
                                            <option value="Fin de projet">Fin de projet</option>
                                            <option value="Enquête annuelle">Enquête annuelle</option>
                                        </select>
                                    </div>

                                    {/* Perimeter Dropdown */}
                                    <div className="space-y-1">
                                        <label htmlFor="survey-perimeter" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Périmètre
                                        </label>
                                        <select
                                            id="survey-perimeter"
                                            value={perimeter}
                                            onChange={e => setPerimeter(e.target.value)}
                                            disabled={surveyType !== 'Enquête annuelle'}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                                                surveyType === 'Enquête annuelle'
                                                    ? 'border-slate-200 bg-slate-50 text-slate-800 focus:border-teal-500 focus:ring-teal-500'
                                                    : 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {surveyType !== 'Enquête annuelle' ? (
                                                <option value=""></option>
                                            ) : (
                                                <>
                                                    <option value="Année écoulée">Année écoulée</option>
                                                    <option value="Depuis la dernière enquête">Depuis la dernière enquête</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {/* Language Dropdown */}
                                    <div className="space-y-1">
                                        <label htmlFor="survey-language-select" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Langue
                                        </label>
                                        <select
                                            id="survey-language-select"
                                            value={surveyLanguage}
                                            onChange={e => setSurveyLanguage(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-teal-500 text-slate-800 text-sm cursor-pointer"
                                        >
                                            <option value="fr">Français</option>
                                            <option value="en">Anglais</option>
                                        </select>
                                    </div>

                                    {/* URL field & Copy button */}
                                    <div className="space-y-1">
                                        <label htmlFor="survey-url" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            URL du questionnaire
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                id="survey-url"
                                                type="text"
                                                readOnly
                                                value={getGeneratedUrl()}
                                                className="flex-grow min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-sm focus:outline-none"
                                            />
                                            <button
                                                id="copy-url-btn"
                                                type="button"
                                                onClick={handleCopyUrl}
                                                className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
                                                    copied
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                        : 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm'
                                                }`}
                                            >
                                                {copied ? '✓ Copié !' : "Copier l'URL"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="text-sm font-bold text-teal-800 uppercase tracking-wider">
                                        Filtres des enquêtes
                                    </h3>
                                    {(filterClient || filterProject || filterType || filterPerimeter || filterPublication || filterNominative) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterClient('');
                                                setFilterProject('');
                                                setFilterType('');
                                                setFilterPerimeter('');
                                                setFilterPublication('');
                                                setFilterNominative('');
                                            }}
                                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer underline"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {/* Client Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-client" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Client
                                        </label>
                                        <select
                                            id="filter-client"
                                            value={filterClient}
                                            onChange={e => setFilterClient(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            {uniqueClients.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Project Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-project" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Projet
                                        </label>
                                        <select
                                            id="filter-project"
                                            value={filterProject}
                                            onChange={e => setFilterProject(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            {uniqueProjects.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Type Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-type" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Type
                                        </label>
                                        <select
                                            id="filter-type"
                                            value={filterType}
                                            onChange={e => setFilterType(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            <option value="Fin de projet">Fin de projet</option>
                                            <option value="Enquête annuelle">Enquête annuelle</option>
                                            <option value="-">-</option>
                                        </select>
                                    </div>

                                    {/* Perimeter Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-perimeter" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Périmètre
                                        </label>
                                        <select
                                            id="filter-perimeter"
                                            value={filterPerimeter}
                                            onChange={e => setFilterPerimeter(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            <option value="Année écoulée">Année écoulée</option>
                                            <option value="Depuis la dernière enquête">Depuis la dernière enquête</option>
                                            <option value="-">-</option>
                                        </select>
                                    </div>

                                    {/* Publication Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-publication" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Publication
                                        </label>
                                        <select
                                            id="filter-publication"
                                            value={filterPublication}
                                            onChange={e => setFilterPublication(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            <option value="Oui">Oui</option>
                                            <option value="Non">Non</option>
                                        </select>
                                    </div>

                                    {/* Nominative Filter */}
                                    <div className="space-y-1">
                                        <label htmlFor="filter-nominative" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Nominative
                                        </label>
                                        <select
                                            id="filter-nominative"
                                            value={filterNominative}
                                            onChange={e => setFilterNominative(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs cursor-pointer focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">Tous</option>
                                            <option value="Oui">Oui</option>
                                            <option value="Non">Non</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Controls Bar */}
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-sm font-semibold text-slate-600">
                                    Total : {displaySurveys.length} enquête(s) reçue(s) | {activeSurveys.length} comptabilisée(s).
                                </div>
                                <button
                                    onClick={() => setShowDetailedRatings(prev => !prev)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                        showDetailedRatings
                                            ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {showDetailedRatings
                                        ? '📊 Masquer le détail des notes'
                                        : '📊 Afficher le détail des notes'}
                                </button>
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1600px]">
                                        <thead>
                                            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                                <th className="py-4 px-4 font-semibold text-center w-16 align-bottom pb-4"></th>
                                                <th className="py-4 px-4 font-semibold w-32 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('date')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Date {sortColumn === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-32 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('client')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Client {sortColumn === 'client' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-32 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('project')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Projet {sortColumn === 'project' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-48 align-bottom pb-4">Référent Client</th>
                                                <th className="py-4 px-4 font-semibold w-48 align-bottom pb-4">Référent E-IS</th>
                                                {/* Category headers dynamically structured */}
                                                {categories.map(cat => 
                                                    cat.criteria.map(crit => {
                                                        const key = `${cat.id}-${crit.id}`;
                                                        const colSpan = showDetailedRatings ? 3 : 1;
                                                        const widthClass = showDetailedRatings ? 'min-w-[130px] w-36' : 'min-w-[56px] w-14';
                                                        return (
                                                            <th
                                                                key={key}
                                                                colSpan={colSpan}
                                                                className={`py-4 px-2 text-center border-l border-slate-100 align-bottom pb-4 ${widthClass}`}
                                                                title={crit.label}
                                                            >
                                                                <div
                                                                    className="mx-auto text-[10px] font-bold tracking-wider"
                                                                    style={{
                                                                        writingMode: 'vertical-rl',
                                                                        transform: 'rotate(180deg)',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {crit.label}
                                                                </div>
                                                                {showDetailedRatings && (
                                                                    <div className="grid grid-cols-3 gap-1 mt-2 text-[8px] font-medium text-slate-400">
                                                                        <span title="Importance">Imp.</span>
                                                                        <span title="Évaluation">Éval.</span>
                                                                        <span title="Score (Imp * Éval)">Score</span>
                                                                    </div>
                                                                )}
                                                            </th>
                                                        );
                                                    })
                                                )}
                                                <th className="py-4 px-4 font-semibold w-24 border-l border-slate-100 text-center align-bottom pb-4">Score</th>
                                                <th className="py-4 px-4 font-semibold w-28 border-l border-slate-100 text-center align-bottom pb-4">Score maximal</th>
                                                <th className="py-4 px-4 font-semibold w-16 border-l border-slate-100 text-center align-bottom pb-4">%</th>
                                                <th className="py-4 px-4 font-semibold w-48 border-l border-slate-100 align-bottom pb-4">Appréciation globale</th>
                                                <th className="py-4 px-4 font-semibold w-32 border-l border-slate-100 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('type')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Type {sortColumn === 'type' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-36 border-l border-slate-100 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('perimeter')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Périmètre {sortColumn === 'perimeter' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-28 border-l border-slate-100 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('publication')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Publication {sortColumn === 'publication' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold w-28 border-l border-slate-100 align-bottom pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSort('nominative')}
                                                        className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold cursor-pointer text-left w-full focus:outline-none"
                                                    >
                                                        Nominative {sortColumn === 'nominative' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                                                    </button>
                                                </th>
                                                <th className="py-4 px-4 font-semibold text-center w-16 border-l border-slate-100 align-bottom pb-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                            {displaySurveys.map((survey) => {
                                                const isComptabilise = survey.comptabilise ?? true;
                                                return (
                                                    <tr
                                                        key={survey.filename}
                                                        className={`hover:bg-slate-50/50 transition-colors ${
                                                            !isComptabilise ? 'bg-slate-50/30 text-slate-400' : ''
                                                        }`}
                                                    >
                                                        {/* Comptabilisé Checkbox */}
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isComptabilise}
                                                                onChange={() => handleToggleComptabilise(survey)}
                                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                                                            />
                                                        </td>

                                                        {/* Date */}
                                                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                                            {survey.header.date}
                                                        </td>

                                                        {/* General Info */}
                                                        <td className="py-3 px-4 font-bold max-w-[120px] truncate" title={survey.header.client}>
                                                            {survey.header.client}
                                                        </td>
                                                        <td className="py-3 px-4 max-w-[120px] truncate" title={survey.header.project}>
                                                            {survey.header.project}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate" title={`${survey.header.clientReferent.firstName} ${survey.header.clientReferent.lastName}`}>
                                                            {survey.header.clientReferent.firstName} {survey.header.clientReferent.lastName}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate" title={`${survey.header.eisReferent.firstName} ${survey.header.eisReferent.lastName}`}>
                                                            {survey.header.eisReferent.firstName} {survey.header.eisReferent.lastName}
                                                        </td>

                                                        {/* Survey Ratings Criteria Values */}
                                                        {categories.map(cat =>
                                                            cat.criteria.map(crit => {
                                                                const rating = survey.ratings[crit.id] || {};
                                                                const imp = rating.importance ?? 1;
                                                                const evalNote = rating.evaluation ?? 1;
                                                                const score = imp * evalNote;
                                                                const key = `cell-${survey.filename}-${cat.id}-${crit.id}`;

                                                                if (showDetailedRatings) {
                                                                    return (
                                                                        <td key={key} colSpan={3} className="py-3 px-2 border-l border-slate-100 text-center">
                                                                            <div className="grid grid-cols-3 gap-1 text-[11px]">
                                                                                <span className="text-slate-500">{imp}</span>
                                                                                <span className="text-slate-500">{evalNote}</span>
                                                                                <span className="font-extrabold text-teal-700">{score}</span>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <td key={key} className="py-3 px-2 border-l border-slate-100 text-center font-extrabold text-teal-700">
                                                                            {score}
                                                                        </td>
                                                                    );
                                                                }
                                                            })
                                                        )}

                                                        {/* Score, Score maximal, and % */}
                                                        {(() => {
                                                            const surveyScore = categories.reduce((sum, cat) => {
                                                                return sum + cat.criteria.reduce((catSum, crit) => {
                                                                    const rating = survey.ratings[crit.id] || {};
                                                                    const imp = rating.importance ?? 1;
                                                                    const evalNote = rating.evaluation ?? 1;
                                                                    return catSum + (imp * evalNote);
                                                                }, 0);
                                                            }, 0);

                                                            const surveyMaxScore = categories.reduce((sum, cat) => {
                                                                return sum + cat.criteria.reduce((catSum, crit) => {
                                                                    const rating = survey.ratings[crit.id] || {};
                                                                    const imp = rating.importance ?? 1;
                                                                    return catSum + (imp * 10);
                                                                }, 0);
                                                            }, 0);

                                                            const surveyPercentage = surveyMaxScore > 0 ? Math.round((surveyScore / surveyMaxScore) * 100) : 0;

                                                            return (
                                                                <>
                                                                    <td className="py-3 px-4 border-l border-slate-100 font-extrabold text-teal-800 text-center">
                                                                        {surveyScore}
                                                                    </td>
                                                                    <td className="py-3 px-4 border-l border-slate-100 text-slate-500 text-center">
                                                                        {surveyMaxScore}
                                                                    </td>
                                                                    <td className="py-3 px-4 border-l border-slate-100 font-bold text-teal-600 text-center">
                                                                        {surveyPercentage}%
                                                                    </td>
                                                                </>
                                                            );
                                                        })()}

                                                        {/* Comment */}
                                                        <td className="py-3 px-4 border-l border-slate-100 max-w-[160px] truncate text-slate-500" title={survey.appreciation || survey.comments}>
                                                            {survey.appreciation || survey.comments || '-'}
                                                        </td>

                                                        {/* Type */}
                                                        <td className="py-3 px-4 border-l border-slate-100 max-w-[120px] truncate text-slate-500" title={survey.type || survey.header?.type}>
                                                            {survey.type || survey.header?.type || '-'}
                                                        </td>

                                                        {/* Périmètre */}
                                                        <td className="py-3 px-4 border-l border-slate-100 max-w-[120px] truncate text-slate-500" title={survey.perimetre || survey.header?.perimetre}>
                                                            {survey.perimetre || survey.header?.perimetre || '-'}
                                                        </td>

                                                        {/* Publication */}
                                                        <td className="py-3 px-4 border-l border-slate-100 text-slate-500">
                                                            {survey.allowAppreciationPublication !== undefined
                                                                ? (survey.allowAppreciationPublication ? 'Oui' : 'Non')
                                                                : 'Non'}
                                                        </td>

                                                        {/* Nominative */}
                                                        <td className="py-3 px-4 border-l border-slate-100 text-slate-500">
                                                            {survey.allowNamePublication !== undefined
                                                                ? (survey.allowNamePublication ? 'Oui' : 'Non')
                                                                : 'Non'}
                                                        </td>

                                                        {/* Actions Column */}
                                                        <td className="py-3 px-4 text-center border-l border-slate-100">
                                                            {deletingFilename === survey.filename ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleDeleteSurvey(survey.filename)}
                                                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-[10px] cursor-pointer"
                                                                    >
                                                                        Confirmer
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeletingFilename(null)}
                                                                        className="text-slate-500 hover:text-slate-700 text-[10px] underline cursor-pointer"
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setDeletingFilename(survey.filename)}
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                                    title="Supprimer cette ligne"
                                                                >
                                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <aside className="xl:w-96 w-full shrink-0 space-y-6 xl:sticky xl:top-6">
                            {/* Radar Chart 1 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                <h3 className="text-xs font-bold text-center text-teal-800/80 mb-2 uppercase tracking-wider">
                                    Qualité de la prestation
                                </h3>
                                <p className="text-[10px] text-center text-slate-400 mb-4">
                                    Moyenne des {activeSurveys.length} enquête(s) comptabilisée(s)
                                </p>
                                <div className="h-64 w-full flex items-center justify-center">
                                    {hasActiveSurveys ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="50%" data={qualiteChartData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis
                                                    dataKey="subject"
                                                    tick={<WrappedTick />}
                                                />
                                                <PolarRadiusAxis
                                                    angle={90}
                                                    domain={[0, 60]}
                                                    tick={{ fill: '#94a3b8', fontSize: 8 }}
                                                />
                                                <Radar
                                                    name="Moyenne"
                                                    dataKey="score"
                                                    stroke="#0d9488"
                                                    fill="#0d9488"
                                                    fillOpacity={0.4}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                        fontSize: '10px'
                                                    }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-slate-400 text-xs font-medium text-center">Aucune donnée active</div>
                                    )}
                                </div>
                            </div>

                            {/* Radar Chart 2 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                <h3 className="text-xs font-bold text-center text-teal-800/80 mb-2 uppercase tracking-wider">
                                    Coûts & Délais
                                </h3>
                                <p className="text-[10px] text-center text-slate-400 mb-4">
                                    Moyenne des {activeSurveys.length} enquête(s) comptabilisée(s)
                                </p>
                                <div className="h-64 w-full flex items-center justify-center">
                                    {hasActiveSurveys ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="50%" data={coutDelaisChartData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis
                                                    dataKey="subject"
                                                    tick={<WrappedTick />}
                                                />
                                                <PolarRadiusAxis
                                                    angle={90}
                                                    domain={[0, 60]}
                                                    tick={{ fill: '#94a3b8', fontSize: 8 }}
                                                />
                                                <Radar
                                                    name="Moyenne"
                                                    dataKey="score"
                                                    stroke="#0d9488"
                                                    fill="#0d9488"
                                                    fillOpacity={0.4}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                        fontSize: '10px'
                                                    }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-slate-400 text-xs font-medium text-center">Aucune donnée active</div>
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-16 border-t border-slate-800 text-xs">
                <div className="max-w-full mx-auto space-y-4 text-center">
                    <p className="font-bold text-sm text-slate-200 uppercase tracking-wide">
                        E-IS – Environmental Information Systems
                    </p>
                    <p className="max-w-2xl mx-auto leading-relaxed text-[11px]">
                        19, rue de Cassiopée 53 470 Martigné-sur-Mayenne FRANCE<br />
                        Tél. : + 33 (0) 9 73 88 98 25 –{' '}
                        <a href="https://www.e-is.pro" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                            https://www.e-is.pro
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
