// client/src/App.tsx
// License: AGPL-3.0-only
import { useState, useEffect } from 'react';
import logo from './assets/eis-logo_web_large_sans_texte-v1.0.png';
import ResultsView from './components/ResultsView';
import { useRouter } from './useRouter';
import fr from './locales/fr.json';
import en from './locales/en.json';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

const locales: { [key: string]: any } = { fr, en };

interface Criterion {
    id: string;
    label: string;
}

interface Category {
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

interface LegendItem {
    note: number;
    label: string;
}

const importanceLegend: LegendItem[] = [
    { note: 6, label: 'Extrêmement important' },
    { note: 5, label: 'Très important' },
    { note: 4, label: 'Relativement important' },
    { note: 3, label: 'Assez important' },
    { note: 2, label: 'Légèrement important' },
    { note: 1, label: 'Pas du tout important' }
];

const evaluationLegend: LegendItem[] = [
    { note: 10, label: 'Exceptionnelle' },
    { note: 9, label: 'Excellente' },
    { note: 8, label: 'Très bonne' },
    { note: 7, label: 'Bonne' },
    { note: 6, label: 'Au-dessus de la moyenne' },
    { note: 5, label: 'Moyenne' },
    { note: 4, label: 'En dessous de la moyenne' },
    { note: 3, label: 'Faible' },
    { note: 2, label: 'Très faible' },
    { note: 1, label: 'Insuffisante' }
];

interface Rating {
    importance?: number;
    evaluation?: number;
}

interface Ratings {
    [key: string]: Rating;
}

const WrappedTick = (props: any) => {
    const { x, y, cx, cy, payload } = props;
    
    // Calcul de la direction depuis le centre pour écarter le libellé
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = 35; // Écart de 35px vers l'extérieur
    
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
                    y={index * 12}
                    dy={index === 0 ? 0 : 4}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize={10}
                    fontWeight={600}
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

const getInitialHeader = () => ({
    client: '',
    clientReferent: { firstName: '', lastName: '', service: '' },
    eisReferent: { firstName: '', lastName: '' },
    project: '',
    date: new Date().toISOString().split('T')[0],
    details: ''
});

const getInitialRatings = (): Ratings => {
    const initialRatings: Ratings = {};
    categories.forEach(cat => {
        cat.criteria.forEach(crit => {
            initialRatings[crit.id] = { importance: 1, evaluation: 1 };
        });
    });
    return initialRatings;
};

export default function App() {
    const { path, navigate } = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [header, setHeader] = useState(getInitialHeader);

    // Initialisation des notes avec des valeurs par défaut (1) pour rendre les bulles visibles dès le départ
    const [ratings, setRatings] = useState<Ratings>(getInitialRatings);
    const [appreciation, setAppreciation] = useState('');
    const [allowAppreciationPublication, setAllowAppreciationPublication] = useState(false);
    const [allowNamePublication, setAllowNamePublication] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Multi-language handling
    const getInitialLanguage = (): string => {
        const params = new URLSearchParams(window.location.search);
        const langParam = params.get('lang')?.toLowerCase();
        if (langParam === 'en' || langParam === 'fr') {
            return langParam;
        }
        if (navigator.language.startsWith('en')) {
            return 'en';
        }
        return 'fr';
    };

    const [language, setLanguage] = useState<string>(getInitialLanguage);
    const t = locales[language] || fr;

    useEffect(() => {
        if (path === '/results') {
            document.title = `${t.menu.results} - ${t.title}`;
        } else {
            document.title = t.title;
        }
    }, [path, t.title, t.menu.results]);

    // Parse URL query parameters for Type and Perimeter
    const [surveyType] = useState<string>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const typeParam = searchParams.get('type');
        if (typeParam === 'annuelle') {
            return 'Enquête annuelle';
        }
        return 'Fin de projet';
    });

    const [surveyPerimeter] = useState<string>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const typeParam = searchParams.get('type');
        const perimetreParam = searchParams.get('perimetre');
        if (typeParam === 'annuelle') {
            if (perimetreParam === 'annee') {
                return 'Année écoulée';
            } else if (perimetreParam === 'derniere') {
                return 'Depuis la dernière enquête';
            }
            return 'Année écoulée'; // default if type is annuelle but perimetre is missing/invalid
        }
        return '';
    });

    const getTranslatedType = (val: string) => {
        if (val === 'Enquête annuelle') return t.typeSection.annualSurvey;
        if (val === 'Fin de projet') return t.typeSection.projectEnd;
        return val;
    };

    const getTranslatedPerimeter = (val: string) => {
        if (val === 'Année écoulée') return t.typeSection.yearElapsed;
        if (val === 'Depuis la dernière enquête') return t.typeSection.sinceLast;
        return val;
    };

    // Calcul des scores global dynamique (A / B)
    const cumulativeScoreA = categories.reduce((sum, cat) => {
        return sum + cat.criteria.reduce((catSum, crit) => {
            return catSum + ((ratings[crit.id]?.importance || 0) * (ratings[crit.id]?.evaluation || 0));
        }, 0);
    }, 0);

    const totalImportance = categories.reduce((sum, cat) => {
        return sum + cat.criteria.reduce((catSum, crit) => {
            return catSum + (ratings[crit.id]?.importance || 0);
        }, 0);
    }, 0);

    const maxEvaluation = Math.max(...evaluationLegend.map(item => item.note));
    const maxScoreB = totalImportance * maxEvaluation;
    const percentageC = maxScoreB > 0 ? Math.round((cumulativeScoreA / maxScoreB) * 100) : 0;

    const handleRatingChange = (criterionId: string, type: 'importance' | 'evaluation', value: number) => {
        setRatings(prev => ({
            ...prev,
            [criterionId]: {
                ...prev[criterionId],
                [type]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'info', message: t.submitting });

        // Validation sommaire des critères
        let allRatingsFilled = true;
        for (const cat of categories) {
            for (const crit of cat.criteria) {
                const rating = ratings[crit.id];
                if (!rating?.importance || !rating?.evaluation) {
                    allRatingsFilled = false;
                    break;
                }
            }
        }

        if (!allRatingsFilled) {
            setStatus({ type: 'error', message: t.validation.allRatings });
            return;
        }

        try {
            const response = await fetch('/api/survey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    header,
                    ratings,
                    appreciation,
                    allowAppreciationPublication,
                    allowNamePublication,
                    type: surveyType,
                    perimetre: surveyPerimeter
                })
            });

            const resData = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: t.validation.success });
                setHeader(getInitialHeader());
                setRatings(getInitialRatings());
                setAppreciation('');
                setAllowAppreciationPublication(false);
                setAllowNamePublication(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setStatus({ type: 'error', message: resData.error || t.validation.error });
            }
        } catch (err) {
            setStatus({ type: 'error', message: t.validation.connError });
        }
    };

    if (path === '/results') {
        return <ResultsView onNavigate={navigate} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header visuel */}
            <header className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white py-12 px-4 md:px-8 shadow-md">
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <img src={logo} alt="E-IS Logo" className="h-28 md:h-32 w-auto md:-ml-4" />
                        <div className="md:ml-6">
                            <h1 className="text-4xl font-extrabold tracking-tight">{t.title}</h1>
                            <p className="mt-2 text-teal-100 max-w-2xl">
                                {t.subtitle === 'Environmental Information Systems' && language === 'fr'
                                    ? "Votre avis nous intéresse pour contribuer à l'amélioration constante de nos services."
                                    : language === 'en'
                                    ? "Your feedback is important to us to help continuously improve our services."
                                    : t.subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Language Selector Selector */}
                        <div className="flex bg-white/10 border border-white/20 p-0.5 rounded-xl shadow-inner gap-0.5">
                            <button
                                type="button"
                                onClick={() => setLanguage('fr')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    language === 'fr'
                                        ? 'bg-white text-teal-900 shadow-sm'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                                id="btn-lang-fr"
                            >
                                FR
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    language === 'en'
                                        ? 'bg-white text-teal-900 shadow-sm'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                                id="btn-lang-en"
                            >
                                EN
                            </button>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="text-white bg-white/20 border border-white/30 hover:bg-white/30 active:scale-[0.95] h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer font-bold text-2xl shadow-sm"
                                id="menu-trigger"
                            >
                                ⁝
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate('/results');
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                                        id="btn-goto-results"
                                    >
                                        📊 {t.menu.results}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Section Formulaire (2 colonnes sur grand écran) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Type d'enquête Section */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{t.typeSection.title}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="survey-display-type" className="block text-sm font-semibold text-slate-700">{t.typeSection.type}</label>
                                    <input
                                        id="survey-display-type"
                                        type="text"
                                        readOnly
                                        className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed shadow-sm focus:outline-none"
                                        value={getTranslatedType(surveyType)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="survey-display-perimeter" className="block text-sm font-semibold text-slate-700">{t.typeSection.perimeter}</label>
                                    <input
                                        id="survey-display-perimeter"
                                        type="text"
                                        readOnly
                                        className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed shadow-sm focus:outline-none"
                                        value={getTranslatedPerimeter(surveyPerimeter)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 1. Informations d'en-tête */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{t.generalInfo.title}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label htmlFor="date" className="block text-sm font-semibold text-slate-700">{t.generalInfo.date} <span className="text-red-500">*</span></label>
                                    <input
                                        id="date"
                                        type="date"
                                        required
                                        className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                        value={header.date}
                                        onChange={e => setHeader({...header, date: e.target.value})}
                                        onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                        onInput={e => e.currentTarget.setCustomValidity('')}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label htmlFor="client" className="block text-sm font-semibold text-slate-700">{t.generalInfo.client} <span className="text-red-500">*</span></label>
                                    <input
                                        id="client"
                                        type="text"
                                        required
                                        className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                        value={header.client}
                                        onChange={e => setHeader({...header, client: e.target.value})}
                                        onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                        onInput={e => e.currentTarget.setCustomValidity('')}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label htmlFor="project" className="block text-sm font-semibold text-slate-700">{t.generalInfo.projectName} <span className="text-red-500">*</span></label>
                                    <input
                                        id="project"
                                        type="text"
                                        required
                                        className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                        value={header.project}
                                        onChange={e => setHeader({...header, project: e.target.value})}
                                        onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                        onInput={e => e.currentTarget.setCustomValidity('')}
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <label htmlFor="details" className="block text-sm font-semibold text-slate-700">{t.generalInfo.details}</label>
                                <input
                                    id="details"
                                    type="text"
                                    className="mt-1 w-full px-6 py-3 rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                    value={header.details}
                                    onChange={e => setHeader({...header, details: e.target.value})}
                                />
                            </div>

                            {/* Référent Client */}
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider block">{t.generalInfo.clientReferent}</span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label htmlFor="clientFirstName" className="block text-xs font-semibold text-slate-600">{t.generalInfo.firstName} <span className="text-red-500">*</span></label>
                                        <input
                                            id="clientFirstName"
                                            type="text"
                                            required
                                            className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-white"
                                            value={header.clientReferent.firstName}
                                            onChange={e => setHeader({
                                                ...header,
                                                clientReferent: { ...header.clientReferent, firstName: e.target.value }
                                            })}
                                            onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                            onInput={e => e.currentTarget.setCustomValidity('')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="clientLastName" className="block text-xs font-semibold text-slate-600">{t.generalInfo.lastName} <span className="text-red-500">*</span></label>
                                        <input
                                            id="clientLastName"
                                            type="text"
                                            required
                                            className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-white"
                                            value={header.clientReferent.lastName}
                                            onChange={e => setHeader({
                                                ...header,
                                                clientReferent: { ...header.clientReferent, lastName: e.target.value }
                                            })}
                                            onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                            onInput={e => e.currentTarget.setCustomValidity('')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="clientService" className="block text-xs font-semibold text-slate-600">{t.generalInfo.service}</label>
                                        <input
                                            id="clientService"
                                            type="text"
                                            className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-white"
                                            value={header.clientReferent.service}
                                            onChange={e => setHeader({
                                                ...header,
                                                clientReferent: { ...header.clientReferent, service: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Référent E-IS */}
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider block">{t.generalInfo.eisReferent}</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="eisFirstName" className="block text-xs font-semibold text-slate-600">{t.generalInfo.firstName} <span className="text-red-500">*</span></label>
                                        <input
                                            id="eisFirstName"
                                            type="text"
                                            required
                                            className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-white"
                                            value={header.eisReferent.firstName}
                                            onChange={e => setHeader({
                                                ...header,
                                                eisReferent: { ...header.eisReferent, firstName: e.target.value }
                                            })}
                                            onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                            onInput={e => e.currentTarget.setCustomValidity('')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="eisLastName" className="block text-xs font-semibold text-slate-600">{t.generalInfo.lastName} <span className="text-red-500">*</span></label>
                                        <input
                                            id="eisLastName"
                                            type="text"
                                            required
                                            className="mt-1 w-full px-4 py-3 rounded-lg border-slate-200 bg-white"
                                            value={header.eisReferent.lastName}
                                            onChange={e => setHeader({
                                                ...header,
                                                eisReferent: { ...header.eisReferent, lastName: e.target.value }
                                            })}
                                            onInvalid={e => e.currentTarget.setCustomValidity(t.validation.requiredField)}
                                            onInput={e => e.currentTarget.setCustomValidity('')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Évaluations */}
                        {categories.map((category) => (
                            <section key={category.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                                <h2 className="text-xl font-bold text-teal-800 border-b pb-2">{t.categories[category.id] || category.title}</h2>
                                <div className="divide-y divide-slate-100">
                                    {category.criteria.map((criterion) => (
                                        <div key={criterion.id} className="py-6 first:pt-0 last:pb-0 space-y-4">
                                            <h3 className="text-base font-semibold text-slate-800">{t.criteria[criterion.id] || criterion.label}</h3>

                                            <div className="space-y-6">
                                                {/* Note Importance (1-6) */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {t.satisfaction.importanceLabel} <span className="text-red-500">*</span>
                                                        </span>
                                                        <span className="text-xs font-semibold text-teal-600">
                                                            {t.legends.importance[ratings[criterion.id]?.importance?.toString() || '1']}
                                                        </span>
                                                        <span className="text-sm font-bold px-3 py-1 rounded-full bg-teal-600 text-white shadow-sm transition-all">
                                                            {ratings[criterion.id]?.importance || 1}
                                                        </span>
                                                    </div>
                                                    <div className="px-2">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="6"
                                                            step="1"
                                                            value={ratings[criterion.id]?.importance || 1}
                                                            onChange={(e) => handleRatingChange(criterion.id, 'importance', parseInt(e.target.value))}
                                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                                                        />
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-0.5">
                                                            <span className="text-teal-700/60 uppercase">{t.legends.importance['1']}</span>
                                                            <span className="text-teal-700/60 uppercase">{t.legends.importance['6']}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-extrabold text-slate-300 mt-1 px-0.5">
                                                            {[1, 2, 3, 4, 5, 6].map(n => <span key={n}>{n}</span>)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Note Évaluation (1-10) */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {t.satisfaction.evaluationLabel} <span className="text-red-500">*</span>
                                                        </span>
                                                        <span className="text-xs font-semibold text-emerald-600">
                                                            {t.legends.evaluation[ratings[criterion.id]?.evaluation?.toString() || '1']}
                                                        </span>
                                                        <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm transition-all">
                                                            {ratings[criterion.id]?.evaluation || 1}
                                                        </span>
                                                    </div>
                                                    <div className="px-2">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            step="1"
                                                            value={ratings[criterion.id]?.evaluation || 1}
                                                            onChange={(e) => handleRatingChange(criterion.id, 'evaluation', parseInt(e.target.value))}
                                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                                        />
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-0.5">
                                                            <span className="text-emerald-700/60 uppercase">{t.legends.evaluation['1']}</span>
                                                            <span className="text-emerald-700/60 uppercase">{t.legends.evaluation['10']}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-extrabold text-slate-300 mt-1 px-0.5">
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <span key={n}>{n}</span>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {/* 3. Analyse Graphique */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{t.chart.synthesis}</h2>
                            <p className="text-sm text-slate-500">
                                {t.chart.subtitle}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Graphique 1: Qualité de la prestation */}
                                {categories.filter(c => c.id === 'qualite').map(cat => (
                                    <div key={cat.id} className="h-80 w-full border border-slate-50 rounded-xl p-2 bg-slate-50/30">
                                        <h3 className="text-sm font-bold text-center text-teal-900/70 mb-2 uppercase tracking-tight">
                                            {t.categories[cat.id]?.split('. ')[1] || cat.title.split('. ')[1]}
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="50%" data={cat.criteria.map(crit => ({
                                                subject: t.criteria[crit.id] || crit.label,
                                                score: (ratings[crit.id]?.importance || 0) * (ratings[crit.id]?.evaluation || 0),
                                                fullMark: 60,
                                            }))}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis 
                                                    dataKey="subject" 
                                                    tick={<WrappedTick />}
                                                />
                                                <PolarRadiusAxis 
                                                    angle={90} 
                                                    domain={[0, 60]} 
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                />
                                                <Radar
                                                    name={t.chart.scoreName}
                                                    dataKey="score"
                                                    stroke="#0d9488"
                                                    fill="#0d9488"
                                                    fillOpacity={0.5}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ))}

                                {/* Graphique 2: Coûts & Délais fusionnés */}
                                <div className="h-80 w-full border border-slate-50 rounded-xl p-2 bg-slate-50/30">
                                    <h3 className="text-sm font-bold text-center text-teal-900/70 mb-2 uppercase tracking-tight">
                                        {t.chart.costsDelays}
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="50%" data={
                                            categories.filter(c => ['cout', 'delais'].includes(c.id))
                                                .flatMap(cat => cat.criteria)
                                                .map(crit => ({
                                                    subject: t.criteria[crit.id] || crit.label,
                                                    score: (ratings[crit.id]?.importance || 0) * (ratings[crit.id]?.evaluation || 0),
                                                    fullMark: 60,
                                                }))
                                        }>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis 
                                                dataKey="subject" 
                                                tick={<WrappedTick />}
                                            />
                                            <PolarRadiusAxis 
                                                angle={90} 
                                                domain={[0, 60]} 
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            />
                                            <Radar
                                                name={t.chart.scoreName}
                                                dataKey="score"
                                                stroke="#0d9488"
                                                fill="#0d9488"
                                                fillOpacity={0.5}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        {/* Score Global */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{t.globalScore.title}</h2>
                            <div className="flex items-center justify-between bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">{t.globalScore.cumulated}</span>
                                    <p className="text-xs text-slate-400 mt-1">{t.globalScore.subtitle}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-extrabold text-teal-800 tracking-tight" id="global-score-text">
                                        {cumulativeScoreA}<span className="text-slate-300 font-normal mx-1">/</span>{maxScoreB}{" "}<span className="text-2xl font-bold text-teal-600 ml-2">({percentageC}%)</span>
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Appréciation globale */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{t.appreciation.title}</h2>
                            <textarea
                                rows={4}
                                className="w-full p-4 rounded-lg border-slate-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 placeholder-slate-400"
                                placeholder={t.appreciation.placeholder}
                                value={appreciation}
                                onChange={e => setAppreciation(e.target.value)}
                            />
                            <div className="space-y-3 pt-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.appreciation.pubTitle}</span>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="allowAppreciationPublication"
                                        checked={allowAppreciationPublication}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setAllowAppreciationPublication(checked);
                                            if (!checked) {
                                                setAllowNamePublication(false);
                                            }
                                        }}
                                        className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 mt-0.5"
                                    />
                                    <label htmlFor="allowAppreciationPublication" className="text-sm text-slate-700 cursor-pointer select-none">
                                        {t.appreciation.pubAppreciation}
                                    </label>
                                </div>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="allowNamePublication"
                                        checked={allowNamePublication}
                                        disabled={!allowAppreciationPublication}
                                        onChange={e => setAllowNamePublication(e.target.checked)}
                                        className={`h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 mt-0.5 ${
                                            !allowAppreciationPublication ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    />
                                    <label
                                        htmlFor="allowNamePublication"
                                        className={`text-sm select-none ${
                                            allowAppreciationPublication ? 'text-slate-700 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {t.appreciation.pubName}
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Zone d'envoi et alertes */}
                        {status.message && (
                            <div className={`p-4 rounded-xl text-sm font-semibold ${
                                status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                                    status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                        'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                                {status.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-teal-700 to-cyan-800 hover:from-teal-800 hover:to-cyan-900 text-white font-bold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.99]"
                        >
                            {t.submit}
                        </button>
                    </div>

                    {/* Colonne Légendes (1 colonne, Sticky sur Desktop) */}
                    <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">

                        {/* Légende 1 : Importance */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-teal-800 mb-3 uppercase tracking-wider">
                                {t.legends.importance.title}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead>
                                    <tr className="border-b border-slate-100 text-slate-500 text-left">
                                        <th className="pb-2 font-semibold">{t.legends.importance.note}</th>
                                        <th className="pb-2 font-semibold pl-4">{t.legends.importance.signification}</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-55">
                                    {importanceLegend.map((item) => (
                                        <tr key={item.note} className="hover:bg-slate-50">
                                            <td className="py-2 font-extrabold text-slate-700">{item.note}</td>
                                            <td className="py-2 pl-4 text-slate-600">{t.legends.importance[item.note.toString()] || item.label}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Légende 2 : Évaluation */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wider">
                                {t.legends.evaluation.title}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead>
                                    <tr className="border-b border-slate-100 text-slate-500 text-left">
                                        <th className="pb-2 font-semibold">{t.legends.evaluation.note}</th>
                                        <th className="pb-2 font-semibold pl-4">{t.legends.evaluation.signification}</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                    {evaluationLegend.map((item) => (
                                        <tr key={item.note} className="hover:bg-slate-50">
                                            <td className="py-1.5 font-extrabold text-slate-700">{item.note}</td>
                                            <td className="py-1.5 pl-4 text-slate-600">{t.legends.evaluation[item.note.toString()] || item.label}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </aside>
                </form>
            </main>

            {/* Pied de page */}
            <footer className="bg-slate-900 text-slate-400 py-10 px-4 mt-16 border-t border-slate-800 text-xs">
                <div className="max-w-7xl mx-auto space-y-4 text-center">
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
                    <p className="text-slate-500 text-[10px] uppercase">
                        EURL au capital de 10 000 Euros – RCS Laval 514 733 575 – Code APE : 6201 Z – SIRET : 514 733 575 00039
                    </p>
                </div>
            </footer>
        </div>
    );
}
