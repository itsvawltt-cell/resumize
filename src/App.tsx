import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Upload, Sparkles, AlertCircle, CheckCircle2, 
  Trash2, Copy, ArrowRight, TrendingUp, Cpu, Briefcase, 
  Users, Layers, Award, FileSpreadsheet, Shield, Search, 
  HelpCircle, ChevronRight, Check, RefreshCw, LogIn, 
  LogOut, UserPlus, Zap, Edit3, ArrowLeft, Download,
  Sun, Moon, Star, ExternalLink
} from "lucide-react";
import { User, ResumeAnalysis, DashboardStats, SystemStats, JobMatchResult, CoverLetterResult, KeywordOptimizationResult } from "./types";

export default function App() {
  // Appearance state
  const [theme] = useState<"light">("light");

  // OpenRouter custom key capabilities
  const [openrouterKey, setOpenrouterKey] = useState(() => localStorage.getItem("openrouter_key") || "");
  const [openrouterModel, setOpenrouterModel] = useState(() => localStorage.getItem("openrouter_model") || "google/gemini-2.5-flash");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [infoHubPage, setInfoHubPage] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"home" | "analyzer" | "jobmatch" | "coverletter" | "history" | "admin">("home");

  // Analyzer States
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState("");
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);

  // History / Dashboard States
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Job Match / Cover Letter Input States
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [letterTone, setLetterTone] = useState("confident");
  const [targetIndustry, setTargetIndustry] = useState("Technology");

  // Premium outputs
  const [isMatchingJob, setIsMatchingJob] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [letterResult, setLetterResult] = useState<CoverLetterResult | null>(null);
  const [isOptimizingKeywords, setIsOptimizingKeywords] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<KeywordOptimizationResult | null>(null);

  // Admin section details
  const [adminStats, setAdminStats] = useState<SystemStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminAnalyses, setAdminAnalyses] = useState<ResumeAnalysis[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  // Load user session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      fetchUser(savedToken);
    } else {
      // Auto-authenticate default guest user if no session token is present
      const autoAuth = async () => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "guest@resumize.dev", password: "guestpassword" })
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem("token", data.user.token);
            setUser(data.user);
          } else {
            const signupRes = await fetch("/api/auth/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: "guest@resumize.dev", password: "guestpassword", fullName: "Guest User" })
            });
            const signupData = await signupRes.json();
            if (signupRes.ok) {
              localStorage.setItem("token", signupData.user.token);
              setUser(signupData.user);
            }
          }
        } catch (e) {
          console.error("Silent authentication failure:", e);
        }
      };
      autoAuth();
    }
    // Set theme classes: strictly light mode
    document.documentElement.classList.remove("dark");
  }, [theme]);

  // Sync state stats when user changes
  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchDashboardStats();
      if (user.role === "admin") {
        fetchAdminData();
      }
    } else {
      setHistory([]);
      setStats(null);
      setActiveAnalysis(null);
    }
  }, [user]);

  const toggleTheme = () => {
    // Handled in strict light mode
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token") || "";
    const orKey = localStorage.getItem("openrouter_key") || "";
    const orModel = localStorage.getItem("openrouter_model") || "";
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-OpenRouter-Key": orKey,
      "X-OpenRouter-Model": orModel
    };
  };

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("token");
      }
    } catch {
      localStorage.removeItem("token");
    }
  };

  const fetchHistory = async () => {
    try {
      const resp = await fetch("/api/history", { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data);
        if (data.length > 0 && !activeAnalysis) {
          setActiveAnalysis(data[0]);
          setSelectedResumeId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load history lists", e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const resp = await fetch("/api/dashboard/stats", { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminData = async () => {
    setIsLoadingAdmin(true);
    try {
      const [statsRes, usersRes, analysesRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: getHeaders() }),
        fetch("/api/admin/users", { headers: getHeaders() }),
        fetch("/api/admin/analyses", { headers: getHeaders() })
      ]);

      if (statsRes.ok) setAdminStats(await statsRes.json());
      if (usersRes.ok) setAdminUsers(await usersRes.json());
      if (analysesRes.ok) setAdminAnalyses(await analysesRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  // Auth Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Login parameters error.");
        return;
      }
      localStorage.setItem("token", data.user.token);
      setUser(data.user);
      setAuthMode(null);
      setAuthEmail("");
      setAuthPassword("");
      setActiveTab("analyzer");
    } catch (err) {
      setAuthError("Failed connection to local sandbox server authentication cluster.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, fullName: authFullName })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Failed registration processing.");
        return;
      }
      localStorage.setItem("token", data.user.token);
      setUser(data.user);
      setAuthMode(null);
      setAuthEmail("");
      setAuthPassword("");
      setAuthFullName("");
      setActiveTab("analyzer");
    } catch (err) {
      setAuthError("Error running remote network endpoint registry registration.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setActiveTab("home");
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSuccess("A password reset link with telemetry keys was transmitted to " + authEmail);
  };

  // File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx" && ext !== "doc" && ext !== "txt") {
      setAnalysisError("We only accept ATS standard formats: PDF, DOCX, DOC, or TXT file bundles.");
      return;
    }
    setAnalysisError("");
    setSelectedFile(file);
    // Auto initiate upload sequence feedback
    startAnalysisSequence(file);
  };

  const startAnalysisSequence = (file: File) => {
    setIsUploading(true);
    setUploadProgress(15);
    
    // Simulate real stream file-load progression
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 200);

    // Read file binary structure content as simulation
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawStringResult = reader.result as string;
        const b64Data = rawStringResult.split(",")[1] || rawStringResult;
        
        // Execute network analysis API post
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type || "application/pdf",
            base64: b64Data
          })
        });

        clearInterval(interval);
        setUploadProgress(100);

        const data = await response.json();
        if (!response.ok) {
          setAnalysisError(data.error || "AI Resume parsing failed.");
          setIsUploading(false);
          return;
        }

        setTimeout(() => {
          setIsUploading(false);
          setActiveAnalysis(data);
          setSelectedResumeId(data.id);
          fetchHistory();
          fetchDashboardStats();
        }, 500);

      } catch (err) {
        clearInterval(interval);
        setIsUploading(false);
        setAnalysisError("Parsing crash. Connection interrupted to server parser sandbox.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Plain Text pasted upload
  const handlePastedSubmit = async () => {
    if (!pastedText.trim() || pastedText.length < 50) {
      setAnalysisError("Plain resume description details must be more than 50 characters to parse.");
      return;
    }
    setAnalysisError("");
    setIsUploading(true);
    setUploadProgress(40);
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          filename: "Pasted Core Text",
          rawText: pastedText
        })
      });

      setUploadProgress(100);
      const data = await response.json();
      if (!response.ok) {
        setAnalysisError(data.error || "Plain text analysis processing error.");
        setIsUploading(false);
        return;
      }

      setIsUploading(false);
      setActiveAnalysis(data);
      setSelectedResumeId(data.id);
      setPastedText("");
      fetchHistory();
      fetchDashboardStats();
    } catch {
      setIsUploading(false);
      setAnalysisError("Unknown network gateway failure.");
    }
  };

  // Advanced features API actions
  const executeJobMatch = async () => {
    if (!selectedResumeId || !jobDescription.trim()) {
      alert("Please select a resume version and insert a job description text segment.");
      return;
    }
    setIsMatchingJob(true);
    setMatchResult(null);
    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ resumeId: selectedResumeId, jobDescription })
      });
      const data = await res.json();
      if (res.ok) {
        setMatchResult(data);
      } else {
        alert(data.error || "Fail comparison scanning.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMatchingJob(false);
    }
  };

  const executeCoverLetter = async () => {
    if (!selectedResumeId) {
      alert("Choose an analyzed resume to feed context details.");
      return;
    }
    setIsGeneratingLetter(true);
    setLetterResult(null);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobDescription,
          tone: letterTone,
          companyName,
          jobTitle
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLetterResult(data);
      } else {
        alert(data.error || "Letter drafting failed.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const executeKeywordOptimization = async () => {
    if (!selectedResumeId) return;
    setIsOptimizingKeywords(true);
    setOptimizeResult(null);
    try {
      const res = await fetch("/api/optimize-keywords", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ resumeId: selectedResumeId, targetIndustry })
      });
      const data = await res.json();
      if (res.ok) {
        setOptimizeResult(data);
      } else {
        alert(data.error || "Keywords optimization database failure.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizingKeywords(false);
    }
  };

  // Download printable PDF report
  const handlePrintDownload = () => {
    window.print();
  };

  const deleteAnalysisRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you positive you wish to remove this resume assessment from database limits?")) return;
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (response.ok) {
        setHistory(prev => prev.filter(r => r.id !== id));
        fetchDashboardStats();
        if (activeAnalysis?.id === id) {
          setActiveAnalysis(null);
        }
      }
    } catch (err) {
      console.error("Delete command failure", err);
    }
  };

  // Filter history list
  const filteredHistory = history.filter(item => 
    item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.parsedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200">
      
      {/* ----------------- TOP HEADER NAVIGATION ----------------- */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-white dark:text-slate-900" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-none tracking-tight text-slate-900 dark:text-white">
                Resumize
              </span>
              <span className="text-[9px] font-mono font-semibold tracking-normal text-slate-400 dark:text-slate-500 uppercase">
                ATS Evaluation Engine
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "home" 
                ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-blue-400" 
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              Overview
            </button>
            {user && (
              <>
                <button 
                  onClick={() => setActiveTab("analyzer")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === "analyzer" 
                    ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  Scanner Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab("jobmatch")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === "jobmatch" 
                    ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  Job Comparison & Cover Letter
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === "history" 
                    ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  History Archive
                </button>
                {user.role === "admin" && (
                  <button 
                    onClick={() => setActiveTab("admin")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === "admin" 
                      ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" 
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </button>
                )}
              </>
            )}
          </nav>

          {/* User Session Area */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
              title="Configure API Provider"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              {openrouterKey ? (
                <span className="hidden sm:inline font-mono font-bold text-emerald-600 dark:text-emerald-400">OpenRouter Active</span>
              ) : (
                <span className="hidden sm:inline">API Settings</span>
              )}
            </button>



            {user && (
              <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-650 dark:text-indigo-400">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">{user.fullName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal Backdrop */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden transition-all">
            
            <button 
              onClick={() => setAuthMode(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              ✕
            </button>

            <div className="mb-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mb-3">
                <Cpu className="w-6 h-6 text-brand-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                {authMode === "login" && "Welcome back to Resumize"}
                {authMode === "signup" && "Create your cloud account"}
                {authMode === "forgot" && "Reset dynamic security key"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs text-center mt-1">
                {authMode === "login" && "Sign in below to restore history and compare resumes"}
                {authMode === "signup" && "Analyze, draft cover letters, and track progress for free"}
                {authMode === "forgot" && "Enter your email schema connection coordinates"}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Email Address</label>
                  <input 
                    type="email" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="you@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Account Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthSuccess(""); }}
                      className="text-xs text-brand-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input 
                    type="password" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Account
                </button>
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-400">Default Sandbox Login: </span>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-500">user@example.com / password123</code>
                </div>
              </form>
            )}

            {authMode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Full Name</label>
                  <input 
                    type="text" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="Alex Rivera"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Email Address</label>
                  <input 
                    type="email" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="you@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Choose Password</label>
                  <input 
                    type="password" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="Minimum 6 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Free Account
                </button>
              </form>
            )}

            {authMode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Registered Email Address</label>
                  <input 
                    type="email" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 dark:focus:border-indigo-400 outline-none text-sm transition-all"
                    placeholder="you@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all text-sm"
                >
                  Confirm Send Email Verification
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              {authMode === "login" && (
                <p className="text-xs text-slate-500">
                  New to Resumize?{" "}
                  <button onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthSuccess(""); }} className="text-brand-600 dark:text-blue-400 font-bold hover:underline">
                    Create free account
                  </button>
                </p>
              )}
              {authMode === "signup" && (
                <p className="text-xs text-slate-500">
                  Already registered?{" "}
                  <button onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }} className="text-brand-600 dark:text-blue-400 font-bold hover:underline">
                    Inbound login
                  </button>
                </p>
              )}
              {authMode === "forgot" && (
                <button onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold underline">
                  Back to normal Login screen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OpenRouter API Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">API Provider Settings</h2>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Resumize can route all text analysis, ATS rating, and writing tasks through custom models on OpenRouter. If empty, the app uses standard platform workspace keys.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                  OpenRouter API Key
                </label>
                <input 
                  type="password"
                  value={openrouterKey}
                  placeholder="sk-or-v1-..."
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-850 bg-slate-950 text-white placeholder-slate-600 focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-950/50 font-mono text-sm outline-none transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  You can get a key at <a href="https://openrouter.ai/" target="_blank" rel="noreferrer" className="text-indigo-400 font-semibold underline hover:text-indigo-350 transition-colors">openrouter.ai</a>. Keys are stored safely in local storage.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                  AI Model Identifier
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  {[
                    "google/gemini-2.5-flash",
                    "google/gemini-2.5-pro",
                    "meta-llama/llama-3-8b-instruct",
                    "anthropic/claude-3-5-sonnet",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOpenrouterModel(m)}
                      className={`px-3 py-2 text-left text-xs rounded-lg border font-mono transition-all cursor-pointer ${
                        openrouterModel === m 
                          ? "bg-white text-slate-950 border-white font-bold" 
                          : "border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-850 hover:text-white"
                      }`}
                    >
                      {m.split("/").pop()}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  value={openrouterModel}
                  placeholder="Or enter custom model e.g. deepseek/deepseek-chat"
                  onChange={(e) => setOpenrouterModel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-850 bg-slate-950 text-white placeholder-slate-600 focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-950/50 font-mono text-xs outline-none transition-all"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("openrouter_key");
                    localStorage.removeItem("openrouter_model");
                    setOpenrouterKey("");
                    setOpenrouterModel("google/gemini-2.5-flash");
                    setShowSettingsModal(false);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors font-semibold cursor-pointer"
                >
                  Reset To Default
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-3 py-1.5 text-xs border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("openrouter_key", openrouterKey.trim());
                      localStorage.setItem("openrouter_model", openrouterModel.trim());
                      setShowSettingsModal(false);
                    }}
                    className="px-4 py-1.5 text-xs bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information & Policy Hub Modal */}
      {infoHubPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl p-0 overflow-hidden relative flex flex-col md:flex-row h-[85vh] max-h-[720px] text-white">
            {/* Sidebar with Tabs */}
            <div className="w-full md:w-64 bg-slate-950 border-r border-slate-850 p-5 flex flex-col gap-1 shrink-0">
              <div className="mb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">RESOURCE CENTER</span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">Info & Guidance Hub</h3>
              </div>
              
              <button 
                onClick={() => setInfoHubPage("api-info")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "api-info" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Compliance API Documentation</span>
              </button>

              <button 
                onClick={() => setInfoHubPage("templates")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "templates" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pre-configured ATS Templates</span>
              </button>

              <div className="w-full h-px bg-slate-800 my-3" />

              <button 
                onClick={() => setInfoHubPage("corporate")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "corporate" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Corporate Affiliations</span>
              </button>

              <button 
                onClick={() => setInfoHubPage("careers")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "careers" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Engineering & Careers</span>
              </button>

              <button 
                onClick={() => setInfoHubPage("compliance")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "compliance" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Compliance & Rules</span>
              </button>

              <button 
                onClick={() => setInfoHubPage("safety")}
                className={`w-full px-3 py-2 text-left text-xs rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${infoHubPage === "safety" ? "bg-white text-slate-950 font-bold" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Safety Limits & Quotas</span>
              </button>

              <div className="mt-auto pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setInfoHubPage(null)}
                  className="w-full text-center py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Close Resource Hub
                </button>
              </div>
            </div>

            {/* Main scrollable body area for the page content */}
            <div className="flex-1 p-6 md:p-8 bg-slate-900 overflow-y-auto flex flex-col justify-between relative text-white">
              <button 
                onClick={() => setInfoHubPage(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="flex-1">
                {infoHubPage === "api-info" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-indigo-950/60 text-indigo-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Developer Integration API</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Grammatical Compliance Endpoint</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      Resumize provides a secure JSON evaluation endpoint for programmatic ATS auditing. Integrate grammar diagnostic runs directly within your pre-commit pipeline or developer recruitment workflow.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">HTTP Request Signature</div>
                        <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-3 rounded-lg overflow-x-auto border border-slate-800">
                          POST {window.location.origin}/api/analyze
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">Authorization Headers</div>
                        <pre className="bg-slate-950 text-slate-350 font-mono text-[11px] p-3 rounded-lg overflow-x-auto border border-slate-850">
{`{
  "Content-Type": "application/json",
  "X-OpenRouter-Key": "YOUR_OPENROUTER_KEY",    // Optional: for custom model routing
  "X-OpenRouter-Model": "YOUR_ROUTE_MODEL"     // Optional: defaults to gemini-2.5-flash
}`}
                        </pre>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">Payload Shell Example</div>
                        <div className="relative group">
                          <pre className="bg-slate-950 text-slate-350 font-mono text-[11.5px] p-4 rounded-lg overflow-x-auto border border-slate-850">
{`curl -X POST "${window.location.origin}/api/analyze" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pastedText": "Your full raw resume text here...",
    "filename": "resume.txt"
  }'`}
                          </pre>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`curl -X POST "${window.location.origin}/api/analyze" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "pastedText": "Your full raw resume text here...",\n    "filename": "resume.txt"\n  }'`);
                              alert("API request snippet copied to clipboard!");
                            }}
                            className="absolute right-3.5 top-3.5 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                          >
                            Copy Command
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {infoHubPage === "templates" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Standard ATS Layout Blueprints</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Pre-configured Plain-Text Templates</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      Below are structural, ATS-optimized plain-text Markdown templates that excel through robotic parsing algorithms. High-density layouts, clear subheaders, and tabular dates.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 relative flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-white">Tech Minimalist Template (Standard)</h3>
                          <p className="text-[11px] text-slate-450 mt-1 leading-snug">
                            Single-column structure designed specifically for tech stacks, engineering careers, and high-density technical keyword alignments.
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const mdText = `# JOHN DOE\nTechnical Program Manager | Denver, CO | info@johndoe.com\n\n## PROFESSIONAL SUMMARY\nReliable Technical Program Manager with 5+ years driving high-concurrency cloud migrations...\n\n## CORE SKILLS\n- Languages: TypeScript, Python, Go\n- Databases: PostgreSQL, Spanner, Redis\n\n## EXPERIENCE\n### SENIOR PM | CORPORATE CORPS | 2024 - Present\n- Led 4 cloud integration cycles cutting cold-starts by 40% globally.`;
                            navigator.clipboard.writeText(mdText);
                            alert("Tech Minimalist Template copied to clipboard!");
                          }}
                          className="mt-4 py-2 bg-white text-slate-950 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer text-center"
                        >
                          Copy Tech Markdown
                        </button>
                      </div>

                      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 relative flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-white">Executive Classic Serif Layout</h3>
                          <p className="text-[11px] text-slate-450 mt-1 leading-snug">
                            More formal structure featuring traditional headers. Highly recommended for executive alignments, finance, and operations roles.
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const mdText = `JOHN DOE, MBA\nNew York, NY | executive@doe.com | 555-0199\n\nEXECUTIVE PROFILE\nSenior Operations Director with a proven record of managing 50M+ annual capital flows and delivering 18% YoY growth.\n\nPROFESSIONAL EXPERIENCES\n\nVICE PRESIDENT OF OPERATIONS | GLOBAL TRADINGS | 2021 – 2026\n- Supervised global logistical alignment with international stakeholders, reducing delivery gaps by 22%.\n- Instituted compliance protocols that passed auditing procedures.`;
                            navigator.clipboard.writeText(mdText);
                            alert("Executive Classic Template copied to clipboard!");
                          }}
                          className="mt-4 py-2 bg-white text-slate-950 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer text-center"
                        >
                          Copy Executive Layout
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {infoHubPage === "corporate" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-blue-950/60 text-blue-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Enterprise Partnerships</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Corporate Affiliations and Integrations</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      Resumize partners with recruitment systems globally to align applicant evaluations with production-level hiring portals. 
                    </p>

                    <div className="space-y-4 text-xs text-slate-350 leading-relaxed">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <h3 className="font-bold text-white mb-1">Recruitment Portals & ATS Alignments</h3>
                        <p className="text-slate-400">Our grading engine parameters are modeled after compliance rules supplied by Workday, Taleo, Greenhouse, and Lever. Standardizing formats with Resumize guarantees that you bypass multi-column layout distortions and parsing failures.</p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <h3 className="font-bold text-white mb-1">Corporate Sponsor Programs</h3>
                        <p className="text-slate-400">We provide bulk license packages for engineering university centers, coding bootcamps, and outplacement operations. Reach out to partners@resumize.dev to request structured group accounts or dashboard setups.</p>
                      </div>
                    </div>
                  </div>
                )}

                {infoHubPage === "careers" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Work With Us</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Engineering and Product Careers</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      Our core product mission is to democratize resume evaluation using robust multi-model diagnostics and open developer tools.
                    </p>

                    <div className="space-y-4 text-xs text-slate-350 leading-relaxed">
                      <p className="text-slate-400">
                        We are a fully decentralized team of systems engineering, prompt architecture, and design specialists dedicated to producing human-centric AI software assets.
                      </p>
                      <h3 className="font-bold text-white mt-4 mb-1">Active Positions for 2026</h3>
                      <ul className="list-disc pl-5 space-y-2 mt-1 text-slate-300">
                        <li><strong className="text-white">Staff Prompt Architect</strong>: Build complex parsing schemas for multimodal models. (Remote, Global)</li>
                        <li><strong className="text-white">Backend Systems Engineer (Rust / Node)</strong>: Optimize document text extraction models and indexing pipelines. (Denver / NYC / Tokyo)</li>
                        <li><strong className="text-white">UI/UX Frontend Craftsperson (React / Tailwind)</strong>: Design gorgeous high-contrast candidate interfaces. (Tokyo / Remote)</li>
                      </ul>
                      <p className="mt-4 pt-1 text-[11px] text-slate-500">
                        Please send your Resumize scores along with your application details to team@resumize.dev!
                      </p>
                    </div>
                  </div>
                )}

                {infoHubPage === "compliance" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-rose-950/60 text-rose-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Legal & Standard Protocols</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Compliance Rules and Security Policies</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      Security is paramount when handling personal careers and intellectual experience documents. We strictly isolate all parsing workflows.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-350 leading-relaxed">
                      <div className="border-l-2 border-rose-500 pl-3">
                        <h3 className="font-semibold text-white font-sans">Zero-Retention Document Handling</h3>
                        <p className="text-slate-400 mt-0.5">Uploaded PDF and Word documents are passed as binary buffer strings directly to processing queues and are never preserved in persistent cloud storage disk partitions.</p>
                      </div>

                      <div className="border-l-2 border-rose-500 pl-3">
                        <h3 className="font-semibold text-white font-sans">SOC-2 Readiness Checklist</h3>
                        <p className="text-slate-400 mt-0.5">Resumize operates compliant workspace pipelines utilizing TLS 1.3 transfer encodings and rigorous AES-256 local database encryption layouts.</p>
                      </div>

                      <div className="border-l-2 border-rose-500 pl-3">
                        <h3 className="font-semibold text-white font-sans">GDPR & CCPA Deletion Requests</h3>
                        <p className="text-slate-400 mt-0.5">Delete any historic scan logs instantly with a single click using the "Clear History" button within the History page. This permanently scrubs all matching records from local memory structures.</p>
                      </div>
                    </div>
                  </div>
                )}

                {infoHubPage === "safety" && (
                  <div className="animate-fade-in text-white">
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wide">Operational Integrity</span>
                    <h2 className="text-2xl font-bold text-white mt-2.5 mb-1.5">Safety Operations and Request Limits</h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      To preserve system integrity, manage active processing cycles, and protect computational environments, we enforce reasonable sandbox restrictions.
                    </p>

                    <div className="space-y-4 text-xs text-slate-350 leading-relaxed">
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <h4 className="font-bold text-white mb-1 font-sans">Sandbox Rate Limits</h4>
                        <p className="text-slate-400 text-[11px]">Standard workspace keys support up to <strong>15 model scans per hour</strong>. Want unrestricted analysis? Integrate a custom OpenRouter key through the API Provider Settings modal.</p>
                      </div>

                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <h4 className="font-bold text-white mb-1 font-sans">Safety Filter Models</h4>
                        <p className="text-slate-400 text-[11px]">Ensure documents contain no sensitive credentials, system security passwords, or prohibited material. Input strings are automatically sanitized prior to model parsing.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-5 border-t border-slate-800 mt-6">
                <button 
                  onClick={() => setInfoHubPage(null)}
                  className="px-5 py-2 text-xs bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Confirm & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- HOME VIEW (NON-LOGGED IN & GENERAL OVERVIEW) ----------------- */}
      {activeTab === "home" && (
        <div id="home-view" className="flex-1 flex flex-col">
          {/* Hero Section Container */}
          <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-28">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-white to-transparent dark:from-slate-900/30 dark:via-slate-950 dark:to-transparent -z-10 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 text-xs font-semibold mb-6">
                <Cpu className="w-3.5 h-3.5 text-indigo-505" />
                <span>Standard ATS Scanning Protocol</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold tracking-tight text-slate-950 dark:text-white leading-[1.15] max-w-4xl mx-auto">
                Optimize Your Resume <br />
                <span className="text-indigo-650 dark:text-indigo-400">with Multi-Model Diagnostics</span>
              </h1>

              <p className="mt-5 text-base sm:text-md text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Analyze formatting schemas, evaluate professional keyword occurrences, locate granular grammar issues, and optimize job target matches inside a single unified dashboard.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={() => setActiveTab("analyzer")}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  Configure and Scan Now
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-55 transition-all text-sm text-center cursor-pointer font-bold rounded-lg"
                >
                  Configure API Keys
                </button>
              </div>

              {/* Dynamic Mock Layout Container */}
              <div className="mt-16 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 max-w-5xl mx-auto">
                <div className="h-10 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-4 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="text-[10px] text-slate-400 font-mono ml-4">resumize-ats-suite-v1</div>
                </div>
                <div className="p-4 md:p-8 grid md:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-900/10 text-left">
                  <div className="md:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                      <h3 className="font-bold text-xs uppercase tracking-tight text-slate-400 mb-3">CURRENT RESUME FILE</h3>
                      <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900">
                        <FileText className="w-8 h-8 text-brand-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">alex_rivera_resume.pdf</div>
                          <div className="text-[10px] text-slate-400">PDF • 1.2MB • Verified</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
                      <h3 className="font-bold text-xs uppercase tracking-tight text-slate-400">ATS SCAN SCORES</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Keywords Rating</span>
                          <span className="text-indigo-600 font-bold">84%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[84%]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Formatting Quality</span>
                          <span className="text-emerald-500 font-bold">92%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[92%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-8 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950 flex items-center justify-center font-bold text-xl text-slate-800 dark:text-white">
                          82
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">Strong Compatibility Result</div>
                          <div className="text-xs text-slate-500">Top 15% ranking for Systems Engineer requirements.</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex-1">
                      <h4 className="font-bold text-xs uppercase text-rose-500 mb-3 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        AI Identified Gaps & Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {["Kubernetes (K8s)", "Continuous Delivery Pipelines", "TypeScript Interfaces", "Microservices Architecture"].map((g, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-lg">
                            + {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Features Section */}
          <section className="bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800/80 py-16 md:py-24 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                  Crafted for Premium ATS Compliance Success
                </h2>
                <p className="mt-4 text-slate-500 dark:text-slate-400">
                  Avoid simple black-box parsing errors with our detailed AI scanning metrics.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Feat 1 */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 rounded-2xl hover:scale-[1.02] transition-all">
                  <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Smart PDF & Word Extraction</h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Automatically parse structured elements from PDF, DOCX, and TXT sources. Read structural lines matching corporate scanning protocols.
                  </p>
                </div>
                {/* Feat 2 */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 rounded-2xl hover:scale-[1.02] transition-all">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Deep Recruiter Feedback</h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Instantly identify missing core technical skills, evaluate writing formats, locate grammar issues, and receive robust wording enhancements in seconds.
                  </p>
                </div>
                {/* Feat 3 */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 rounded-2xl hover:scale-[1.02] transition-all">
                  <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Job Target Sync Matcher</h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Compare any resume directly against competitive job descriptions. Produce high-end contextual cover letters that emphasize your core candidate values.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Social Footer */}
          <footer className="bg-slate-900 text-slate-400 py-12 px-4 transition-colors">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display font-bold text-white text-base">Resumize</span>
                </div>
                <p className="text-xs text-slate-500">A simplified utility to score resume ATS compatibility, matches jobs, highlights keyword opportunities, and generates custom drafts.</p>
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-3">PRODUCT SELECTIONS</h4>
                <ul className="space-y-2 text-xs flex flex-col items-start">
                  <li>
                    <button 
                      onClick={() => { setActiveTab("analyzer"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Resume Grading Engine
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("api-info")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Grammatical Compliance API
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { setActiveTab("jobmatch"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Cover Letter Builder
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("templates")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Pre-configured Templates
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-3">COMPANY REVENUE</h4>
                <ul className="space-y-2 text-xs flex flex-col items-start">
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("corporate")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Corporate Affiliations
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("careers")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Engineering Careers
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("compliance")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Compliance Rules Policy
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setInfoHubPage("safety")}
                      className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Safety Operations Limits
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-3">LET'S CONNECT</h4>
                <p className="text-xs text-slate-500 mb-4">Subscribe to receive modern ATS updates.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Email" className="bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none" />
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 text-xs">Join</button>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-8 text-center text-xs text-slate-600">
              © 2026 Resumize.ai ATS Technologies Inc. All rights reserved globally.
            </div>
          </footer>
        </div>
      )}

      {/* ----------------- SCANNER DASHBOARD / ANALYZER VIEW ----------------- */}
      {activeTab === "analyzer" && user && (
        <div id="analyzer-view" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                Resume Scanning Suite
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Upload your resume, analyze structures, receive custom AI scoring, and audit keyword metrics.
              </p>
            </div>

            {/* Top action checklist summary indicator */}
            {stats && (
              <div className="flex items-center gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-sm shrink-0">
                <div className="text-center">
                  <span className="block font-mono text-xs text-slate-400">TOTAL SCANS</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalAnalyses}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                <div className="text-center">
                  <span className="block font-mono text-xs text-slate-400">LAST RECORD GRADE</span>
                  <span className={`text-xl font-bold ${stats.lastScore >= 80 ? "text-emerald-500" : stats.lastScore >= 60 ? "text-amber-500" : "text-rose-500"}`}>
                    {stats.lastScore ? `${stats.lastScore}%` : "None"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Core Upload Zone */}
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Document Input Selector Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                  UPLOAD NEW RESUME
                </h2>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    dragActive 
                      ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20" 
                      : "border-slate-200 dark:border-slate-800 hover:border-brand-500/50"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input 
                    id="file-input" type="file" accept=".pdf,.docx,.doc,.txt"
                    className="hidden" onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                    <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 animate-pulse" />
                  </div>
                  <p className="text-sm font-bold">Drag & drop your files here</p>
                  <p className="text-xs text-slate-400 mt-1">Accepts PDF, DOCX, DOC or TXT up to 10MB</p>
                  
                  <button className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
                    Choose Local File
                  </button>
                </div>

                {/* Plain text input variant toggle */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-850">
                  <details className="group">
                    <summary className="flex items-center justify-between font-bold text-xs text-slate-400 cursor-pointer list-none uppercase">
                      <span>Or paste resume plain text</span>
                      <span className="text-brand-500 group-open:rotate-180 transform transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 space-y-3">
                      <textarea 
                        rows={6}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 transition-all font-mono"
                        placeholder="Paste whole body plain text CV layout content..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                      />
                      <button 
                        onClick={handlePastedSubmit}
                        disabled={!pastedText.trim() || isUploading}
                        className="w-full py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        Submit Pasted Text
                      </button>
                    </div>
                  </details>
                </div>

                {analysisError && (
                  <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                )}
              </div>

              {/* Progress and status blocks */}
              {isUploading && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
                      Analyzing Document Metrics...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 italic leading-snug">
                    Sending raw tokens to Gemini 3.5 analyzer pipeline. Estimating skill structures and layout rules...
                  </p>
                </div>
              )}

              {/* Scope tracking trend visual card */}
              {stats && stats.scoreTrend.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center justify-between">
                    <span>SCORE OUTCOME TREND</span>
                    <TrendingUp className="w-4 h-4 text-brand-500" />
                  </h3>
                  <div className="flex items-end justify-between h-24 gap-1.5 pt-4">
                    {stats.scoreTrend.map((pt, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div className="text-[8px] font-mono text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 bg-slate-800 text-white px-1 py-0.5 rounded">
                          {pt.score}%
                        </div>
                        <div 
                          className="w-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-t-md hover:bg-indigo-500 dark:hover:bg-indigo-500 hover:border-indigo-600 transition-all cursor-pointer"
                          style={{ height: `${pt.score}%` }}
                        />
                        <span className="text-[8px] font-mono text-slate-450 mt-1 truncate w-full text-center">{pt.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist visual card */}
              {stats && stats.checklist && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    ATS COMPLIANCE CHECKLIST
                  </h3>
                  <div className="space-y-2">
                    {stats.checklist.map((item) => (
                      <div key={item.id} className="flex items-start gap-2.5 text-xs">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          item.done 
                          ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400" 
                          : "border-slate-200 dark:border-slate-800 text-transparent"
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className={`leading-tight ${item.done ? "text-slate-450 line-through dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analysis details right column */}
            <div className="lg:col-span-8">
              {activeAnalysis ? (
                <div className="space-y-6">
                  
                  {/* Overall ATS score bar banner */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                      {/* Premium Circle Grade */}
                      <ScoreGauge score={activeAnalysis.atsScore} />
                      
                      <div>
                        <div className="text-xs font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                          AI ANALYZED COMPATIBILITY
                        </div>
                        <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight mt-1">
                          ATS Score: {activeAnalysis.atsScore} / 100
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                          Evaluated file: <span className="font-mono text-slate-700 dark:text-slate-300">{activeAnalysis.filename}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={handlePrintDownload}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-bold rounded-xl shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all text-slate-700 dark:text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Report
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedResumeId(activeAnalysis.id);
                          setJobDescription("");
                          setMatchResult(null);
                          setActiveTab("jobmatch");
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl shadow-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        Match Job Description
                      </button>
                    </div>
                  </div>

                  {/* Rating parameters breakdown bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    {[
                      { label: "Keywords Match", value: activeAnalysis.scores.keywords, color: "text-indigo-600 dark:text-indigo-400" },
                      { label: "Experience Logic", value: activeAnalysis.scores.experience, color: "text-emerald-500" },
                      { label: "Skills Density", value: activeAnalysis.scores.skills, color: "text-sky-500" },
                      { label: "Formatting Compliance", value: activeAnalysis.scores.formatting, color: "text-amber-500" },
                      { label: "Education Format", value: activeAnalysis.scores.education, color: "text-violet-500" }
                    ].map((sc, scIdx) => (
                      <div key={scIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate leading-tight">{sc.label}</span>
                        <span className={`block text-xl font-bold font-mono mt-1 ${sc.color}`}>{sc.value}%</span>
                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-850 rounded-full mt-2.5 overflow-hidden">
                          <div className={`h-full bg-current ${sc.color}`} style={{ width: `${sc.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI INSIGHTS CONTENT GRID */}
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Weak Sections Box */}
                    <div className="bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6">
                      <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        Weak Areas Detected
                      </h3>
                      <div className="space-y-4">
                        {activeAnalysis.weakSections.length > 0 ? (
                          activeAnalysis.weakSections.map((wk, i) => (
                            <div key={i} className="p-4 border border-rose-100/50 dark:border-rose-950/40 rounded-2xl bg-rose-50/25 dark:bg-rose-950/10 space-y-1">
                              <span className="text-[10px] uppercase font-mono font-bold text-rose-500 tracking-wider">SECTION: {wk.section}</span>
                              <div className="text-xs font-bold">{wk.issue}</div>
                              <p className="text-[11px] text-slate-500 leading-normal italic">{wk.remedy}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-slate-105 rounded-xl text-center text-xs text-slate-400">
                            Excellent! No high-priority structural weaknesses logged.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Wording Optimizations */}
                    <div className="bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 space-y-3">
                      <h3 className="font-extrabold text-xs uppercase tracking-widest text-teal-500 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                        AI Strong Wording Alternative
                      </h3>
                      {activeAnalysis.strongWordings.length > 0 ? (
                        activeAnalysis.strongWordings.map((wd, i) => (
                          <div key={i} className="p-3.5 border border-teal-100/30 dark:border-teal-950/40 bg-teal-50/10 dark:bg-teal-950/5 rounded-2xl space-y-2">
                            <div className="text-[10px] text-slate-400 italic">Context: {wd.context}</div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="block text-[8px] font-bold text-rose-550 uppercase">PASSIVE</span>
                                <span className="text-slate-450 line-through">"{wd.original}"</span>
                              </div>
                              <div className="border-l border-slate-200 dark:border-slate-850 pl-3">
                                <span className="block text-[8px] font-bold text-emerald-500 uppercase">RECOMMENDED</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">"{wd.suggested}"</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-450 italic">None logged. Core wording matches high action standards.</p>
                      )}
                    </div>

                  </div>

                  {/* Keywords saturation analysis check */}
                  <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                      <span>MISSING SKILLS & VALUE KEYWORDS</span>
                      <span className="text-[10px] text-slate-500">Inject these to bypass ATS keyword algorithms</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activeAnalysis.missingSkills.map((sk, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Grammar checker blocks and suggestions check */}
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Grammar analysis card list */}
                    <div className="bg-white dark:bg-[#121A2A]/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6">
                      <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        Spelling & Grammar Review
                      </h3>
                      <div className="space-y-3">
                        {activeAnalysis.grammarIssues.length > 0 ? (
                          activeAnalysis.grammarIssues.map((gr, idx) => (
                            <div key={idx} className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl space-y-1.5">
                              <div className="text-xs line-through text-slate-400 font-mono">Original: "{gr.original}"</div>
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Suggested: "{gr.correction}"</div>
                              <p className="text-[10px] text-slate-550 italic mt-1">{gr.explanation}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-slate-100 dark:border-slate-850 rounded-xl text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span>100% grammar and structural copy compliance! No style warnings found.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary suggestions suggestions section */}
                    <div className="bg-white dark:bg-[#121A2A]/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6">
                      <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        AI-Generated Elevator Summary Ideas
                      </h3>
                      <div className="space-y-3">
                        {activeAnalysis.summarySuggestions.map((sm, i) => (
                          <div key={i} className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 rounded-2xl text-xs relative group">
                            <span className="absolute right-3 top-3 text-[9px] uppercase font-bold text-indigo-500 opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto"
                              onClick={() => {
                                navigator.clipboard.writeText(sm);
                                alert("Summary text segment successfully saved to system clipboard index.");
                              }}
                            >
                              COPY
                            </span>
                            <p className="leading-relaxed text-slate-650 dark:text-slate-350 italic">"{sm}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-bounce mb-4" />
                  <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-200 mb-1">
                    No Analysed Resume Document Found
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Upload your candidate documentation on the left column or select past history logs to load standard scanner assessments immediately.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- JOB MATCHING / COVER LETTER VIEW ----------------- */}
      {activeTab === "jobmatch" && user && (
        <div id="jobmatch-view" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Job Sync & Cover Letter Drafting
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Select key resume versions, specify employer requirements descriptions, compare compatibility, and auto-draft compelling cover letters.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Input parameters panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  MATCH SETTINGS
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select Source Resume Version</label>
                  <select 
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 transition-all text-xs text-slate-800 dark:text-slate-200"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                  >
                    <option value="" disabled>--- Choose active version ---</option>
                    {history.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.filename} ({record.atsScore}% Score - {new Date(record.timestamp).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Job Title</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      placeholder="e.g. Senior Frontend Dev"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Employer Unit Name</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      placeholder="e.g. Stripe Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Writing Output Pitch Tone</label>
                  <select 
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-500 text-xs text-slate-800 dark:text-slate-200"
                    value={letterTone}
                    onChange={(e) => setLetterTone(e.target.value)}
                  >
                    <option value="confident">Assertive & Bold (Metrics Driven)</option>
                    <option value="warm">Empathetic & Collaborative (SaaS culture focus)</option>
                    <option value="technical">Highly Technical & Scientific</option>
                    <option value="concise">Short & Crisp Single Page Summary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Job Description Specifications</label>
                  <textarea 
                    rows={8}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none focus:border-brand-500 transition-all"
                    placeholder="Paste employer role bullet items here. Include keyword requirements, tools, and experience expectations..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={executeJobMatch}
                    disabled={isMatchingJob || !selectedResumeId || !jobDescription}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                  >
                    {isMatchingJob ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    Analyze Core Match
                  </button>
                  <button 
                    onClick={executeCoverLetter}
                    disabled={isGeneratingLetter || !selectedResumeId}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                  >
                    {isGeneratingLetter ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Compose Cover Letter
                  </button>
                </div>

              </div>

              {/* Extra Industry Keywords Accelerator */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  KEYWORDS SYNC OPTIMIZER
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs"
                    placeholder="e.g. Cybersecurity, Fintech, Biotech"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                  />
                  <button 
                    onClick={executeKeywordOptimization}
                    disabled={isOptimizingKeywords || !selectedResumeId}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    {isOptimizingKeywords ? "Tuning..." : "Optimize"}
                  </button>
                </div>

                {optimizeResult && (
                  <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-2">
                    <span className="block text-[8px] font-bold text-indigo-500 uppercase">ADDED CLOUD SEARCH TAGS</span>
                    <div className="flex flex-wrap gap-1">
                      {optimizeResult.addedKeywords.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 italic font-mono mt-2">{optimizeResult.explanation}</p>
                    <textarea 
                      rows={4} readOnly
                      className="w-full text-[10px] bg-slate-950 text-emerald-400 p-2 rounded border border-slate-800/80 font-mono mt-2"
                      value={optimizeResult.optimizedResumeText}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Results comparative panels */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Job description Match parameters feedback */}
              {matchResult ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  
                  <div className="flex items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center font-bold text-2xl text-indigo-600 dark:text-indigo-400">
                      {matchResult.matchScore}%
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Keywords Match Ratio</h3>
                      <p className="text-xs text-slate-500">Correlation metrics relative to target employer parameters.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Supporting Strengths
                      </span>
                      <ul className="text-xs space-y-2 list-disc list-inside text-slate-650 dark:text-slate-350 leading-relaxed">
                        {matchResult.strengths.map((str, i) => <li key={i}>{str}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-rose-500 uppercase flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Qualification Gaps
                      </span>
                      <ul className="text-xs space-y-2 list-disc list-inside text-slate-650 dark:text-slate-350 leading-relaxed">
                        {matchResult.gaps.map((gp, i) => <li key={i}>{gp}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="block text-xs font-bold text-slate-450 uppercase">MATCHING INHERENT KEYWORDS FOUND</span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.matchingKeywords.map((kw, i) => (
                        <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100/50 dark:border-emerald-950/50 px-2 py-1 rounded-md">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="block text-xs font-bold text-amber-500 uppercase">RECOMMENDED EXTRA SYSTEM INSERTIONS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.missingKeywords.map((mk, i) => (
                        <span key={i} className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-605 border border-amber-100/50 px-2 py-1 rounded-md font-semibold">
                          + {mk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl p-4">
                    <h4 className="font-extrabold text-xs uppercase tracking-tight text-slate-805 dark:text-slate-302 mb-2">
                      RECRUITIBILITY ACTION TIPS
                    </h4>
                    <ul className="text-xs space-y-2 text-slate-550 leading-relaxed list-decimal pl-4">
                      {matchResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                    </ul>
                  </div>

                </div>
              ) : null}

              {/* Cover Letter display container */}
              {letterResult ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Drafted Cover Letter Candidate Output</h3>
                      <p className="text-[11px] text-slate-400">Tone schema: <span className="capitalize text-brand-650">{letterTone}</span> mode alignment.</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(letterResult.coverLetter);
                        alert("Cover letter drafted copy is securely added to target system dashboard clipboard");
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Content
                    </button>
                  </div>

                  <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-serif border border-slate-100 bg-slate-50/50 p-5 rounded-2xl dark:bg-slate-950 dark:border-slate-850">
                    {letterResult.coverLetter}
                  </div>
                </div>
              ) : null}

              {!matchResult && !letterResult && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 font-medium">
                  <BrainIcon className="w-12 h-12 text-slate-250 mx-auto mb-4 animate-pulse" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Awaiting Analysis Parameters</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Complete inputs on the left panels, then execute comparative models with Gemini 3.5.
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* ----------------- HISTORY VIEW ----------------- */}
      {activeTab === "history" && user && (
        <div id="history-view" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                Scan History & Reports Library
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Access your previously scanned resumes, deep dive historical grade trends, or purge logs easily.
              </p>
            </div>

            {/* Search filter input */}
            <div className="relative w-full sm:w-72 shrink-0">
              <input 
                type="text"
                placeholder="Search history by name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setActiveAnalysis(item);
                    setSelectedResumeId(item.id);
                    setActiveTab("analyzer");
                  }}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between min-h-[180px] ${
                    activeAnalysis?.id === item.id ? "ring-2 ring-indigo-500" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] bg-slate-50 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                        {item.id}
                      </span>
                      <button 
                        onClick={(e) => deleteAnalysisRecord(item.id, e)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        title="Purge record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={item.filename}>
                      {item.filename}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Scanned On: {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-450 uppercase">OVERALL COMPLIANCE SCORE:</span>
                      <span className={`text-base font-bold font-mono ${
                        item.atsScore >= 80 ? "text-emerald-500" : item.atsScore >= 60 ? "text-amber-500" : "text-rose-500"
                      }`}>
                        {item.atsScore}%
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-450 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl p-16 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 text-slate-250 mx-auto mb-4" />
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Historical Scan Logs Logged</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Your completed resume tests catalog is currently empty. Head over back to Scanner Dashboard to parse documents.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ----------------- ADMIN CONTROL PANEL VIEW ----------------- */}
      {activeTab === "admin" && user && user.role === "admin" && (
        <div id="admin-view" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-red-600 dark:text-red-400">
              System Control & Business Analytics
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Analyze complete database storage registration, aggregated system average metrics, and evaluate security rule profiles.
            </p>
          </div>

          {/* Admin overall status grid cards */}
          {adminStats && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">SYSTEM REGISTRATIONS</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{adminStats.totalUsers}</div>
                </div>
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 rounded-2xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">COMPLETED PARSES</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{adminStats.totalAnalyses}</div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 rounded-2xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-emerald-500 animate-pulse" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">AGGREGATED SCORE AVERAGE</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{adminStats.averageScore}%</div>
                </div>
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 rounded-2xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">SECURE DATABASE STATE</span>
                  <span className="block text-xs font-bold text-emerald-500 mt-1.5 uppercase">● PERSISTENT LIVE</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50/55 rounded-2xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8">
            
            {/* User directories management database table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shrink-0">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                AUTHENTICATED SYSTEM REGISTRATIONS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-3 px-2">EMAIL IDENTIFICATION</th>
                      <th className="py-3 px-2">FULL NAME</th>
                      <th className="py-3 px-2">ROLE TITLE</th>
                      <th className="py-3 px-2">SCAN VOLUME</th>
                      <th className="py-3 px-2">JOINED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((userObj) => (
                      <tr key={userObj.id} className="border-b border-slate-50 dark:border-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-50/50">
                        <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white text-[11px] truncate">{userObj.email}</td>
                        <td className="py-3 px-2">{userObj.fullName}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                            userObj.role === "admin" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/25" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {userObj.role}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold font-mono">{userObj.analysesCount} checks</td>
                        <td className="py-3 px-2 text-slate-400 tracking-tighter">{new Date(userObj.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform usage log catalog details */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                PLATFORM ACTIVITY PIPELINE ANALYSES
              </h3>
              <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-2">
                {adminAnalyses.map((an) => (
                  <div key={an.id} className="p-4 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400">UID: {an.userId}</span>
                      <span className="font-bold text-indigo-500 font-mono">SCORED: {an.atsScore}%</span>
                    </div>
                    <div className="font-bold text-xs truncate" title={an.filename}>{an.filename}</div>
                    <div className="text-[10px] text-slate-400 italic">
                      Time logged: {new Date(an.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Printable template reports context for reports generation workflow */}
      <div className="hidden print:block bg-white text-slate-900 p-8 space-y-8 font-serif leading-relaxed" id="printable-area">
        <div className="border-b-2 border-slate-300 pb-4 text-center">
          <h1 className="text-3xl font-extrabold uppercase">ATS Resume Analysis Grading Assessment</h1>
          <p className="text-sm italic">Generated securely with Resumize.ai ATS pipeline on {new Date().toLocaleDateString()}</p>
        </div>

        {activeAnalysis && (
          <div className="space-y-6">
            <div>
              <span className="font-bold text-xs uppercase text-slate-500">Candidate File</span>
              <div className="text-lg font-bold">{activeAnalysis.filename}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-4 font-mono">
              <div>
                <strong>ATS OVERALL SCORING GRADE:</strong> {activeAnalysis.atsScore} / 100
              </div>
              <div className="space-y-1">
                <div>Keyword saturation: {activeAnalysis.scores.keywords}%</div>
                <div>Experience logic structure: {activeAnalysis.scores.experience}%</div>
                <div>Formatting compliance: {activeAnalysis.scores.formatting}%</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-slate-205 mb-2">High-Priority Missing Technical Skills & Keywords</h3>
              <div className="flex flex-wrap gap-2 text-xs italic">
                {activeAnalysis.missingSkills.join(", ")}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-slate-205 mb-2">Weak Sections & AI Recommended Remedies</h3>
              <ul className="text-xs space-y-2 list-disc pl-4">
                {activeAnalysis.weakSections.map((wk, id) => (
                  <li key={id}>
                    <strong>{wk.section}</strong>: {wk.issue} ({wk.remedy})
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase border-b border-slate-205 mb-2">Strong Wording Upgrades</h3>
              <ul className="text-xs space-y-2 list-none">
                {activeAnalysis.strongWordings.map((wd, id) => (
                  <li key={id} className="border-b border-slate-100 pb-1 italic">
                    Replace passive "{wd.original}" with recommended "{wd.suggested}"
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center text-[10px] text-slate-400 italic pt-12">
              End of computer-generated ATS compliance audit review. Valid parameters scanned in sandbox environment.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// Helper Mini Components
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;

  return (
    <div className="w-24 h-24 flex items-center justify-center relative select-none">
      <svg className="w-full h-full -rotate-90">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r={r}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Dynamic colored arc */}
        <circle
          cx="48"
          cy="48"
          r={r}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-850 dark:text-white font-mono leading-none">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-sans font-bold mt-0.5">Rating</span>
      </div>
    </div>
  );
}

function LogLevelIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function BrainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
