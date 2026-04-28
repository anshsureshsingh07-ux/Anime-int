/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Newspaper, 
  Users, 
  User as UserIcon, 
  Search, 
  Bell, 
  TrendingUp, 
  Play, 
  Share2, 
  Heart, 
  MessageSquare,
  Zap,
  Star,
  Settings,
  ChevronRight,
  LogOut,
  Mail,
  Lock,
  PlusCircle,
  X,
  ShieldCheck,
  Plus,
  ShieldAlert,
  Trophy,
  Activity,
  Award,
  Globe,
  Calendar,
  Eye,
  Hash,
  Image as ImageIcon
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile as updateAuthProfile,
  type User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  runTransaction,
  where,
  Timestamp,
  writeBatch,
  deleteDoc,
  getDocs,
  increment
} from 'firebase/firestore';
import Markdown from 'react-markdown';
import { auth, db } from './lib/firebase';
import { cn } from './lib/utils';

export interface ArticleItem {
  id: string;
  title: string;
  category: string;
  description: string;
  content?: string;
  image: string;
  imageUrl?: string;
  author: string;
  authorId: string;
  date: string;
  views: number | string;
  likes?: number;
  tags?: string[];
  createdAt?: any;
}

export interface PostItem {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorPhoto?: string;
  authorUsername: string;
  likes: number;
  replyCount: number;
  createdAt: any;
}

export interface ReplyItem {
  id: string;
  postId: string;
  content: string;
  author: string;
  authorId: string;
  authorPhoto?: string;
  authorUsername: string;
  createdAt: any;
}

export interface RecommendationItem {
  id: string;
  title: string;
  rating: number;
  image: string;
  imageUrl?: string;
  studio: string;
  createdAt?: any;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  image?: string;
  caption: string;
  author: string;
  authorId: string;
  authorUsername: string;
  likes: number;
  createdAt: any;
}

import { STORIES, RECOMMENDATIONS, DISCUSSIONS, ARTICLES } from './constants';

const ADMIN_EMAIL = 'anshsureshsingh07@gmail.com';

// --- Auth Context Mock/Hook ---
export interface ProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  role: 'user' | 'admin';
  createdAt: any;
  exp: number;
  totalScans: number;
  lastDailyUplink?: any;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Listen to Firestore profile
        const unsubProfile = onSnapshot(doc(db, 'users', u.uid), (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ uid: u.uid, ...snapshot.data() } as ProfileData);
          } else {
            setProfile({
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'GUEST_USER',
              photoURL: u.photoURL || '',
              username: u.email?.split('@')[0] || 'ANON',
              role: u.email === ADMIN_EMAIL ? 'admin' : 'user',
              createdAt: serverTimestamp(),
              exp: 0,
              totalScans: 0
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  return { user, profile, loading, isAdmin };
};

// --- Sub-Components ---

const DEFAULT_ANIME_IMAGE = "https://images.unsplash.com/photo-1578632738908-4844da38986d?q=80&w=2070&auto=format&fit=crop";

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (isOpen && auth.currentUser && !auth.currentUser.emailVerified) {
      setVerificationEmail(auth.currentUser.email);
    }
  }, [isOpen]);

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setVerificationEmail(null);
    try {
      const userCred = await signInWithPopup(auth, new GoogleAuthProvider());
      
      // Pattern 3: setDoc with merge: true (Ensures Google users have a Firestore profile)
      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        displayName: userCred.user.displayName || "GUEST_USER",
        name: userCred.user.displayName || "GUEST_USER", // Added to match user snippet
        email: userCred.user.email,
        photoURL: userCred.user.photoURL || "",
        role: userCred.user.email === ADMIN_EMAIL ? 'admin' : 'user',
        username: userCred.user.email?.split('@')[0] || 'ANON',
        exp: 0,
        totalScans: 0,
        createdAt: serverTimestamp()
      }, { merge: true });

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          if (!userCred.user.emailVerified) {
            setVerificationEmail(email);
          } else {
            onClose();
          }
        } catch (err: any) {
          setError("Email or password is incorrect");
        }
      } else {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          
          // Pattern 1: setDoc (Initial Profile Creation)
          await setDoc(doc(db, "users", userCred.user.uid), {
            uid: userCred.user.uid,
            displayName: "New Operative",
            name: "New Operative", // Added specifically to match user snippet
            email: email,
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: serverTimestamp(),
            photoURL: "",
            username: email.split('@')[0],
            exp: 0,
            totalScans: 0
          });

          await sendEmailVerification(userCred.user);
          setVerificationEmail(email);
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            setError("User already exists. Please sign in");
          } else {
            setError(err.message);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setResendStatus('loading');
    try {
      await sendEmailVerification(auth.currentUser);
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch (err: any) {
      console.error("Resend error:", err);
      setResendStatus('error');
      setError("Failed to resend. Ensure the domain is authorized in Firebase Console.");
    }
  };

  const resetAuth = async () => {
    await signOut(auth);
    setVerificationEmail(null);
    setIsLogin(true);
    setError('');
    setResendStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cyber-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-sm p-8 rounded-3xl theme-border-orange relative shadow-2xl"
      >
        {!verificationEmail && (
          <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
            <X size={20} />
          </button>
        )}

        {verificationEmail ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-theme-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-theme-orange/20">
              <Mail className="text-theme-orange" size={32} />
            </div>
            <h2 className="text-xl font-display font-bold mb-4 theme-text-orange italic tracking-tighter uppercase">
              UPLINK_VERIFICATION
            </h2>
            <p className="text-xs text-white/60 mb-6 leading-relaxed italic">
              We have sent you a verification email to <span className="text-theme-orange font-bold font-mono">{verificationEmail}</span>. Please verify it and log in.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={handleResend}
                disabled={resendStatus === 'loading' || resendStatus === 'sent'}
                className="w-full py-2 text-[10px] text-white/40 hover:text-theme-orange uppercase font-bold tracking-widest border border-white/5 rounded-xl transition-colors disabled:opacity-50"
              >
                {resendStatus === 'loading' ? 'TRANSMITTING...' : 
                 resendStatus === 'sent' ? 'EMAIL_SENT_SUCCESSFULLY' : 
                 resendStatus === 'error' ? 'RETRY_UPLINK' : 'RESEND_VERIFICATION_EMAIL'}
              </button>

              <button 
                onClick={resetAuth}
                className="w-full theme-btn theme-btn-orange font-bold uppercase tracking-widest italic"
              >
                INITIALIZE LOGIN
              </button>
            </div>

            <div className="mt-8 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tight leading-tight">
                PRO TIP: If you don't receive emails, ensure this domain is added to 'Authorized Domains' in your Firebase Console.
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-display font-bold mb-2 theme-text-orange italic tracking-tighter">
              {isLogin ? 'SECURE_LOGIN' : 'INITIALIZE_OPS'}
            </h2>
            <p className="text-[10px] text-white/40 tracking-widest uppercase mb-8">Access the Intelligence Hub</p>

            {error && <p className="text-theme-red text-[10px] mb-6 font-bold uppercase p-3 bg-theme-red/5 border border-theme-red/20 rounded-xl">{error}</p>}

            <form onSubmit={handleAuth} className="space-y-4 mb-6">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-white/20" size={18} />
                  <input 
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="EMAIL_OPERATIVE"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:theme-border-orange outline-none"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-white/20" size={18} />
                  <input 
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="ACCESS_CIPHER"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:theme-border-orange outline-none"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full theme-btn theme-btn-orange font-bold uppercase tracking-widest italic"
              >
                {loading ? 'SYNCHRONIZING...' : (isLogin ? 'AUTHORIZE_UPLINK' : 'CREATE_OPERATIVE')}
              </button>
            </form>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-white/20 font-bold">OR_AUTH_VIA</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button 
                onClick={handleGoogle}
                disabled={loading}
                className="w-full glass-card py-4 flex items-center justify-center gap-4 text-sm font-bold hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 group border border-white/10"
              >
                <div className="bg-white p-2 rounded-lg">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                </div>
                <span className="uppercase tracking-widest italic">GOOGLE_SYNC_UPLINK</span>
              </button>
              
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="w-full text-center text-[10px] text-white/40 hover:text-theme-orange uppercase font-bold tracking-widest"
              >
                {isLogin ? "Terminate local record? Signup" : "Already verified? Login"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const PostArticleModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FEATURED');
  const [desc, setDesc] = useState('');
  const [content, setContent] = useState('');
  const [img, setImg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const finalImg = img || `https://picsum.photos/seed/anime_${Math.random()}/800/450`;
      
      console.log('Saving Article:', { title, imageUrl: finalImg, image: finalImg });

      await addDoc(collection(db, 'articles'), {
        title,
        category,
        description: desc,
        content,
        image: finalImg,
        imageUrl: finalImg,
        author: auth.currentUser?.displayName || 'Admin',
        authorId: auth.currentUser?.uid || 'unknown',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        views: 0,
        likes: 0,
        tags: [category.toLowerCase()],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
      setTitle(''); setDesc(''); setContent(''); setImg('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Uplink failure: Connection to database rejected.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-cyber-black/95 backdrop-blur-xl overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-2xl p-8 rounded-none theme-border-red my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold theme-text-red">PUBLISH ARTICLE</h2>
          <button onClick={onClose} className="text-white/40"><X size={20} /></button>
        </div>
        {error && (
          <div className="p-3 bg-theme-red/10 border border-theme-red/30 text-theme-red text-[10px] mb-4 font-bold uppercase tracking-wider">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="ARTICLE TITLE" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-red" />
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-cyber-black border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-red">
                <option value="ANIME_INTEL">ANIME_INTEL</option>
                <option value="MOU_REPORTS">MOU_REPORTS</option>
                <option value="CULTURE_SYNAPSE">CULTURE_SYNAPSE</option>
                <option value="TECH_BLUR">TECH_BLUR</option>
              </select>
            </div>
            <div className="space-y-4">
              <input value={img} onChange={e => setImg(e.target.value)} placeholder="IMAGE URL" className="w-full bg-white/5 border border-white/10 rounded-none px-3 py-2 text-xs outline-none focus:theme-border-red" />
            </div>
          </div>
          <textarea required value={desc} onChange={e => setDesc(e.target.value)} placeholder="SHORT DESCRIPTION (EXCERPT)" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-red min-h-[80px]" />
          <textarea required value={content} onChange={e => setContent(e.target.value)} placeholder="ARTICLE CONTENT (MARKDOWN SUPPORTED)" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-red min-h-[300px] font-mono text-white" />
          
          <div className="flex justify-end gap-4 mt-4">
             <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">CANCEL</button>
             <button type="submit" disabled={loading} className="theme-btn theme-btn-red !px-10">
              {loading ? 'TRANSMITTING...' : 'PUBLISH ARTICLE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AIRecommendation = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const getRecommendation = async () => {
    if (!prompt) return;
    setLoading(true);
    setSuggestion(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as a high-tech data extraction unit. Search for the anime: "${prompt}". 
        Retrieve the following data points in JSON format:
        - title: The official name.
        - synopsis: A concise 2-sentence summary.
        - studio: The main production studio.
        - year: The release year.
        - neuralRating: A score out of 10.0 (e.g., 9.2).
        - imageUrl: A verified high-quality image URL of this anime (e.g. from anilist, myanimelist, or unsplash).
        Return ONLY valid JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              synopsis: { type: Type.STRING },
              studio: { type: Type.STRING },
              year: { type: Type.STRING },
              neuralRating: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING }
            },
            required: ["title", "synopsis", "studio", "year", "neuralRating", "imageUrl"]
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      setSuggestion(data);

      // Grant EXP and increment scans
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          totalScans: increment(1),
          exp: increment(50)
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-none my-6 theme-border-orange bg-theme-orange/5 relative overflow-hidden">
      {/* Scanning Line Effect */}
      {loading && (
        <motion.div 
          initial={{ top: '-10%' }}
          animate={{ top: '110%' }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-[2px] bg-theme-orange/50 shadow-[0_0_15px_#F27D26] z-10"
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-theme-orange animate-pulse" />
          <h3 className="text-sm font-display font-bold text-theme-orange italic tracking-tighter">AI DATA ORACLE // NEURAL LINK</h3>
        </div>
        {loading && (
          <span className="text-[8px] font-mono text-theme-orange animate-bounce uppercase">Streaming Packets...</span>
        )}
      </div>

      <div className="flex gap-2 relative z-20">
        <div className="flex-1 relative">
          <input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'ENTER' && getRecommendation()}
            placeholder="ENTER ANIME SIGNATURE..."
            className="w-full bg-cyber-black/80 border border-white/10 rounded-none px-3 py-2 text-xs focus:theme-border-orange outline-none font-mono text-theme-orange placeholder:text-white/20"
          />
          <div className="absolute top-0 right-2 h-full flex items-center">
             <span className="text-[8px] font-mono text-white/20">CTRL+S</span>
          </div>
        </div>
        <button 
          onClick={getRecommendation}
          disabled={loading}
          className="theme-btn theme-btn-orange !py-1 !px-4 text-[10px] disabled:opacity-50 font-display italic font-bold"
        >
          {loading ? 'NEURAL LINKING...' : 'SYNC'}
        </button>
      </div>

      <AnimatePresence>
        {suggestion && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 border-t border-white/10 pt-4"
          >
            <div className="bg-cyber-black/40 border border-theme-orange/20 p-3 relative overflow-hidden group">
              <div className="flex gap-4">
                <div className="w-24 h-32 shrink-0 border border-white/10 overflow-hidden relative">
                  <img 
                    src={suggestion.imageUrl || DEFAULT_ANIME_IMAGE} 
                    alt={suggestion.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    onError={(e) => (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE}
                  />
                  <div className="absolute top-0 left-0 bg-theme-orange text-[8px] font-bold px-1 uppercase italic">extracted</div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-display font-bold theme-text-orange uppercase italic leading-none truncate">{suggestion.title}</h4>
                    <div className="text-right">
                      <div className="text-[12px] font-mono text-theme-red font-bold leading-none">{suggestion.neuralRating}</div>
                      <div className="text-[6px] text-white/30 uppercase font-bold">score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-[7px] text-white/40 uppercase font-bold">Studio</div>
                      <div className="text-[10px] font-bold truncate text-white/80">{suggestion.studio}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-white/40 uppercase font-bold">Period</div>
                      <div className="text-[10px] font-bold text-white/80">{suggestion.year}</div>
                    </div>
                  </div>

                  <div className="border-l border-theme-orange/30 pl-2 mt-2">
                    <div className="text-[7px] text-white/40 uppercase font-bold mb-1">Synopsis // Data Excerpt</div>
                    <p className="text-[9px] text-white/70 leading-relaxed font-mono line-clamp-3">{suggestion.synopsis}</p>
                  </div>
                </div>
              </div>

              {/* Decorative Tech Elements */}
              <div className="absolute bottom-0 right-0 p-1 opacity-20 pointer-events-none">
                <Globe size={32} className="text-theme-orange rotate-12" />
              </div>
              <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-theme-orange to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ArticleCard = ({ article, onClick }: { article: ArticleItem, onClick?: () => void }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group glass-panel rounded-3xl overflow-hidden mb-6 relative hover:bg-white/[0.05] transition-all cursor-pointer border border-white/10"
    onClick={onClick}
  >
    <div className="relative h-56 overflow-hidden">
      <img 
        src={article.imageUrl || article.image || DEFAULT_ANIME_IMAGE} 
        alt={article.title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-cyber-black/20 to-transparent" />
      <div className="absolute top-4 left-4">
        <span className="px-3 py-1 bg-theme-red/80 backdrop-blur-md text-white text-[10px] font-bold tracking-widest italic uppercase rounded-full border border-white/20">
          {article.category}
        </span>
      </div>
    </div>
    <div className="p-5">
      <h3 className="text-xl font-display font-bold leading-tight mb-2 group-hover:text-theme-orange transition-colors tracking-tight italic">{article.title}</h3>
      <p className="text-white/60 text-xs mb-4 line-clamp-2 leading-relaxed">{article.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
          <span className="text-theme-orange">{article.author}</span>
          <span>/</span>
          <span>{new Date(article.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-white/30 hover:text-theme-red transition-colors">
            <Heart size={14} />
            <span className="text-[10px]">{article.likes || 0}</span>
          </div>
          <Share2 size={14} className="text-white/30 hover:text-theme-orange transition-colors" />
        </div>
      </div>
    </div>
  </motion.div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="flex items-center justify-between mb-4 mt-8 border-b border-white/10 pb-3">
    <div className="flex items-center gap-2">
      <div className="p-1 rounded-lg bg-theme-red/10 text-theme-red">
        <Icon size={16} />
      </div>
      <h2 className="text-lg font-bold font-display uppercase tracking-tight">{title}</h2>
    </div>
    <button className="text-[9px] font-bold text-theme-orange hover:text-white transition-colors flex items-center gap-1 group tracking-widest uppercase">
      ARCHIVES <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
    </button>
  </div>
);

// --- Views ---

const ArticleDetailView = ({ article, allArticles, onBack, onArticleClick }: { article: ArticleItem, allArticles: ArticleItem[], onBack: () => void, onArticleClick: (a: ArticleItem) => void }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likes || 0);

  const recommendations = allArticles
    .filter(a => a.id !== article.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);

  const handleLike = async () => {
    if (liked) return;
    try {
      await updateDoc(doc(db, 'articles', article.id), {
        likes: increment(1)
      });
      setLiked(true);
      setLikeCount(prev => (typeof prev === 'number' ? prev : 0) + 1);
    } catch (err) {
      console.error("Transmission breakdown during like sync:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="min-h-screen bg-cyber-black pb-24"
    >
      <div className="relative h-[40vh] md:h-64 lg:h-96 overflow-hidden">
        <img 
          src={article.imageUrl || article.image || DEFAULT_ANIME_IMAGE} 
          alt={article.title} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-cyber-black/20 to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-12 left-6 w-10 h-10 glass-panel rounded-2xl flex items-center justify-center text-white border border-white/20"
        >
          <ChevronRight size={24} className="rotate-180" />
        </button>
      </div>

      <div className="px-6 -mt-12 relative z-10">
        <span className="px-3 py-1 bg-theme-red text-white text-[10px] font-bold tracking-widest italic uppercase shadow-[4px_4px_0_rgba(0,0,0,1)] inline-block mb-4">
          {article.category}
        </span>
        <h1 className="text-3xl font-display font-bold leading-tight mb-4 italic tracking-tight">{article.title}</h1>
        
        <div className="flex items-center gap-4 py-4 border-y border-white/10 mb-6">
          <div className="w-10 h-10 rounded-none bg-theme-orange/20 border border-theme-orange/40 flex items-center justify-center">
            <UserIcon size={20} className="text-theme-orange" />
          </div>
          <div>
            <p className="text-xs font-bold text-theme-orange uppercase tracking-widest">{article.author}</p>
            <p className="text-[10px] text-white/30 font-medium">PUBLISHED: {new Date(article.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none prose-sm font-sans text-white/80 leading-relaxed space-y-4">
          <Markdown>{article.content || article.description}</Markdown>
        </div>

        <div className="mt-12 flex gap-6 border-t border-white/10 pt-6">
          <button 
            onClick={handleLike}
            disabled={liked}
            className={cn(
              "flex items-center gap-2 group transition-all",
              liked ? "text-theme-red" : "text-white/30 hover:text-theme-red"
            )}
          >
            <Heart size={20} className={cn(liked && "fill-theme-red")} />
            <span className="text-sm font-bold">{likeCount}</span>
          </button>
          <button className="flex items-center gap-2 group">
            <Share2 size={20} className="text-white/30 group-hover:text-theme-orange transition-colors" />
            <span className="text-sm font-bold italic tracking-wider">SHARE TRANSMISSION</span>
          </button>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-2 mb-6 border-l-4 border-theme-orange pl-4">
              <TrendingUp size={18} className="text-theme-orange" />
              <h3 className="text-lg font-display font-bold tracking-tighter uppercase italic">You May Also Like</h3>
            </div>
            <div className="space-y-6">
              {recommendations.map(rec => (
                <div 
                  key={rec.id} 
                  onClick={() => onArticleClick(rec)}
                  className="flex gap-4 group cursor-pointer"
                >
                  <div className="w-24 h-16 shrink-0 overflow-hidden rounded-xl border border-white/10 group-hover:border-theme-orange/50 transition-colors">
                    <img 
                      src={rec.imageUrl || rec.image || DEFAULT_ANIME_IMAGE} 
                      alt={rec.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-theme-orange transition-colors mb-1">{rec.title}</h4>
                    <span className="text-[10px] text-white/40 uppercase font-bold">{rec.category} // {new Date(rec.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const HomeView = ({ isAdmin, onArticleClick, articles, recommendations }: { 
  isAdmin: boolean, 
  onArticleClick: (a: ArticleItem) => void,
  articles: ArticleItem[],
  recommendations: RecommendationItem[]
}) => {
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isRecOpen, setIsRecOpen] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const allArticles = [...articles, ...(ARTICLES as any)];
  const allRecommendations = recommendations.length > 0 ? recommendations : (RECOMMENDATIONS as any);

  const showNotification = () => {
    setNotification("Uplink Secure. No new security alerts detected.");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="pb-24">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-50 glass-panel p-3 border-theme-orange bg-theme-orange/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-theme-orange" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest italic">{notification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tighter theme-text-orange italic">Anime Int</h1>
        </div>
        <div className="flex gap-4">
          {isAdmin && (
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={() => setIsPostOpen(true)}
              className="w-10 h-10 glass-panel rounded-none flex items-center justify-center text-theme-red theme-border-red"
            >
              <PlusCircle size={20} />
            </motion.button>
          )}
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={showNotification}
            className="w-10 h-10 glass-panel rounded-none flex items-center justify-center text-white/60 relative"
          >
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-theme-red rounded-none border border-cyber-black" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showMaintenance && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 mt-4 overflow-hidden"
          >
            <div className="glass-panel p-3 border-theme-red/50 bg-theme-red/5 relative group">
              <div className="absolute inset-0 bg-theme-red/5 animate-pulse pointer-events-none" />
              <div className="flex gap-3 items-start pr-8">
                <div className="shrink-0 mt-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-theme-red animate-pulse" />
                    <span className="text-[10px] font-black text-theme-red tracking-widest italic animate-pulse">STABLE_LINK_OFFLINE</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/80 leading-relaxed font-mono">
                    <span className="text-theme-red font-black">SYSTEM NOTICE:</span> Neural image rendering and posters are currently undergoing recalibration. Some visuals may be temporarily invisible to all operatives. Team Anime Int is working on a full restoration. <span className="italic text-theme-orange">The future is loading...</span>
                  </p>
                </div>
                <button 
                  onClick={() => setShowMaintenance(false)}
                  className="absolute top-2 right-2 text-white/20 hover:text-theme-red transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 opacity-10 pointer-events-none overflow-hidden text-theme-red">
                 <div className="absolute top-4 left-4 w-12 h-12 border border-current rotate-45" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4">
        <AIRecommendation />
        <SectionHeader title="Hot Headlines" icon={Zap} />
        {allArticles.length > 0 && <ArticleCard article={allArticles[0]} onClick={() => onArticleClick(allArticles[0])} />}
        
        <div className="flex items-center justify-between mb-4 mt-8 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div className="text-theme-red">
              <Star size={16} />
            </div>
            <h2 className="text-lg font-bold font-display uppercase tracking-widest italic">Priority Ops</h2>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsRecOpen(true)}
              className="text-[9px] font-bold text-theme-orange flex items-center gap-1 group tracking-widest uppercase italic"
            >
              ADD RECOMMENDATION <PlusCircle size={12} className="group-hover:rotate-90 transition-transform" />
            </button>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
          {allRecommendations.map((rec: any) => (
            <motion.div 
              key={rec.id}
              className="w-40 shrink-0 group cursor-pointer"
              whileHover={{ y: -5 }}
            >
              <div className="relative aspect-[2/3] rounded-3xl overflow-hidden mb-2 border border-white/5 group-hover:border-theme-orange transition-colors">
                <img 
                  src={rec.imageUrl || rec.image || DEFAULT_ANIME_IMAGE} 
                  alt={rec.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE;
                  }}
                />
                <div className="absolute inset-0 bg-cyber-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-2 right-2 glass-panel p-1 rounded-xl flex items-center gap-1 border-theme-orange">
                  <Star size={10} className="fill-theme-orange text-theme-orange" />
                  <span className="text-[10px] font-bold">{rec.rating}</span>
                </div>
              </div>
              <h5 className="text-xs font-bold truncate uppercase italic tracking-tighter">{rec.title}</h5>
              <p className="text-[9px] text-white/40 font-medium tracking-widest">{rec.studio}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <PostArticleModal isOpen={isPostOpen} onClose={() => setIsPostOpen(false)} />
      <PostRecommendationModal isOpen={isRecOpen} onClose={() => setIsRecOpen(false)} />
    </div>
  );
};

const PostRecommendationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState('8.5');
  const [studio, setStudio] = useState('');
  const [img, setImg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalImg = img || `https://picsum.photos/seed/anime_rec_${Math.random()}/300/450`;
      console.log('Saving Recommendation:', { title, imageUrl: finalImg, image: finalImg });

      await addDoc(collection(db, 'recommendations'), {
        title,
        rating: parseFloat(rating),
        studio,
        image: finalImg,
        imageUrl: finalImg,
        createdAt: serverTimestamp()
      });
      onClose();
      setTitle(''); setStudio(''); setImg(''); setRating('8.5');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-cyber-black/95 backdrop-blur-xl overflow-y-auto font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-md p-8 rounded-none theme-border-orange my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold theme-text-orange tracking-tight uppercase italic">New Priority Op</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Anime Title</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CYBERPUNK: EDGERUNNERS" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-orange text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Rating (0-10)</label>
              <input required type="number" step="0.1" min="0" max="10" value={rating} onChange={e => setRating(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-orange text-white" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Studio</label>
              <input required value={studio} onChange={e => setStudio(e.target.value)} placeholder="e.g. Studio Trigger" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-orange text-white" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Poster URL</label>
            <input value={img} onChange={e => setImg(e.target.value)} placeholder="IMAGE URL (OPTIONAL)" className="w-full bg-white/5 border border-white/10 rounded-none p-3 text-sm outline-none focus:theme-border-orange text-white" />
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
             <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">Abort</button>
             <button type="submit" disabled={loading} className="theme-btn theme-btn-orange !px-10">
              {loading ? 'UPLOADING...' : 'DEPLOY OPERATIVE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const CommunityView = ({ profile }: { profile: ProfileData | null }) => {
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostItem)));
    }, (error) => {
      console.error("Community Feed error:", error);
    });
  }, []);

  const handleCreatePost = async () => {
    if (!newPost || !profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        author: profile.displayName,
        authorId: profile.uid,
        authorUsername: profile.username || 'unknown',
        authorPhoto: profile.photoURL || '',
        isAdmin: profile.role === 'admin',
        likes: 0,
        replyCount: 0,
        createdAt: serverTimestamp()
      });
      setNewPost('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-24">
      <h1 className="text-3xl font-display font-bold tracking-tighter mb-6 theme-text-red italic">COMMUNITY</h1>
      
      {profile ? (
        <div className="glass-panel p-4 rounded-none mb-6 theme-border-orange bg-theme-orange/5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-none bg-cyber-black flex items-center justify-center border border-white/20 overflow-hidden">
              {profile.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon size={24} className="text-white/40" />}
            </div>
            <div className="flex-1">
              <textarea 
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Broadcast your status..."
                className="w-full bg-transparent border-none text-white placeholder:text-white/30 text-sm resize-none focus:ring-0 font-medium italic"
                rows={2}
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                <div className="flex gap-3 text-white/40">
                  <Play size={16} />
                  <Share2 size={16} />
                </div>
                <button 
                  onClick={handleCreatePost}
                  disabled={loading}
                  className="theme-btn theme-btn-orange !py-1 !px-4 text-[10px] disabled:opacity-50"
                >
                  {loading ? 'SENDING...' : 'TRANSMIT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-none mb-6 border-theme-red/30 bg-theme-red/5 text-center">
          <p className="text-[10px] font-bold text-theme-red uppercase tracking-widest italic mb-2">ACCESS DENIED</p>
          <p className="text-xs text-white/50 italic mb-4">Initialize uplink to join the network discussion.</p>
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} profile={profile} />
        ))}
      </div>
    </div>
  );
};

const PostCard = ({ post, profile }: { post: PostItem, profile: ProfileData | null }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'replies'), where('postId', '==', post.id), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReplyItem)));
    }, (error) => {
      console.error("Reply sync error:", error);
    });
  }, [post.id]);

  const handleReply = async () => {
    if (!replyText || !profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'replies'), {
        postId: post.id,
        content: replyText,
        author: profile.displayName,
        authorId: profile.uid,
        authorUsername: profile.username || 'unknown',
        authorPhoto: profile.photoURL || '',
        isAdmin: profile.role === 'admin',
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setIsReplying(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-4 rounded-none border-t-2 border-theme-red/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-none bg-theme-red/20 border border-theme-red/40 overflow-hidden shrink-0">
          {post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-cyber-black" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-theme-red italic uppercase tracking-wider truncate">{post.author}</p>
            {(post as any).isAdmin && (
               <span className="text-[8px] bg-theme-red text-white px-1 font-black italic">ADMIN</span>
            )}
            <span className="text-[10px] text-theme-orange/50 normal-case font-mono ml-1 truncate">@{post.authorUsername}</span>
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">NODE_REF: {post.id.slice(0, 8)}</p>
        </div>
      </div>
      <p className="text-sm text-white/80 leading-relaxed mb-4 font-medium italic">"{post.content}"</p>
      
      <div className="flex gap-6 mb-4">
        <button className="flex items-center gap-1.5 text-white/40 hover:text-theme-red transition-colors group">
          <Heart size={16} className="group-hover:fill-theme-red group-hover:text-theme-red" />
          <span className="text-[10px] font-bold">{post.likes}</span>
        </button>
        <button 
          onClick={() => setIsReplying(!isReplying)}
          className="flex items-center gap-1.5 text-white/40 hover:text-theme-orange transition-colors"
        >
          <MessageSquare size={16} />
          <span className="text-[10px] font-bold">{replies.length} REPLIES</span>
        </button>
      </div>

      <AnimatePresence>
        {isReplying && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pb-4"
          >
            <div className="border-l-2 border-white/10 pl-4 py-2 flex flex-col gap-2">
              <input 
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response..."
                className="bg-cyber-black/50 border border-white/10 px-3 py-2 text-xs rounded-none outline-none focus:theme-border-orange italic"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsReplying(false)} className="text-[10px] text-white/30 uppercase font-black px-2 hover:text-white transition-colors">Abort</button>
                <button 
                  onClick={handleReply}
                  disabled={loading}
                  className="px-4 py-1 bg-theme-orange text-cyber-black text-[10px] font-black uppercase italic disabled:opacity-50"
                >
                  {loading ? '...' : 'LINK REPLY'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {replies.length > 0 && (
        <div className="space-y-3 mt-2 border-l border-white/10 pl-4">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-none bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                {reply.authorPhoto ? <img src={reply.authorPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-cyber-black" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold theme-text-orange italic">@{reply.authorUsername}</span>
                  {(reply as any).isAdmin && (
                    <span className="text-[8px] bg-theme-orange text-cyber-black px-1 font-black italic mr-1">ADMIN</span>
                  )}
                  <span className="text-[8px] text-white/20 uppercase tracking-widest font-black italic">Transmission Received</span>
                </div>
                <p className="text-[11px] text-white/60 leading-tight italic">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const EditProfileModal = ({ profile, isOpen, onClose }: { profile: ProfileData, isOpen: boolean, onClose: () => void }) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [username, setUsername] = useState(profile.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        displayName: displayName,
        name: displayName,
        photoURL: photoURL,
        username: username.toLowerCase()
      });

      await updateAuthProfile(auth.currentUser!, {
        displayName: displayName,
        photoURL: photoURL
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-cyber-black/80 backdrop-blur-md" 
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm glass-panel p-6 rounded-none border-t-4 border-theme-orange"
      >
        <h2 className="text-xl font-display font-bold theme-text-orange mb-6 italic tracking-tight uppercase">Update Operative Data</h2>
        {error && <div className="p-3 bg-theme-red/10 border border-theme-red/30 text-theme-red text-[10px] mb-4 font-bold italic tracking-wider">{error}</div>}
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Callsign (Name)</label>
            <input 
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-cyber-black border border-white/10 px-4 py-2 rounded-none text-sm focus:theme-border-orange outline-none"
              placeholder="Your public name"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Unique Handle (Username)</label>
            <input 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
              className="w-full bg-cyber-black border border-white/10 px-4 py-2 rounded-none text-sm focus:theme-border-orange outline-none"
              placeholder="user_id_02"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase font-black mb-1 block italic tracking-widest">Avatar URL</label>
            <div className="flex gap-4 items-center">
              <input 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full bg-cyber-black border border-white/10 px-4 py-2 rounded-none text-sm focus:theme-border-orange outline-none font-mono"
                placeholder="https://..."
              />
              <div className="w-16 h-16 bg-white/5 border border-white/10 shrink-0 overflow-hidden relative">
                <img 
                  src={photoURL || 'https://picsum.photos/seed/placeholder/200/200'} 
                  className="w-full h-full object-cover" 
                  alt="Preview"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full theme-btn theme-btn-orange mt-4 uppercase italic tracking-[0.2em] font-black py-4"
          >
            {loading ? 'SYNCHRONIZING_DATA...' : 'COMMIT_CHANGES_&_SAVE'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProfileView = ({ user, profile, isAdmin, onLoginRequest }: { user: User | null, profile: ProfileData | null, isAdmin: boolean, onLoginRequest: () => void }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  // --- Progression Calculations ---
  const calculateProgression = () => {
    if (!profile) return null;
    const createdAt = profile.createdAt?.seconds ? profile.createdAt.seconds * 1000 : 
                      (profile.createdAt ? new Date(profile.createdAt).getTime() : Date.now());
    const daysSinceUplink = Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));
    const timeExp = daysSinceUplink * 10;
    const totalExp = (profile.exp || 0) + timeExp;
    const level = Math.floor(totalExp / 500) + 1;
    const expInLevel = totalExp % 500;
    const levelProgress = (expInLevel / 500) * 100;
    let rank = 'Novice';
    let color = 'text-white/40';
    if (totalExp >= 100) { rank = 'Operative'; color = 'text-theme-orange'; }
    if (totalExp >= 500) { rank = 'Elite'; color = 'text-theme-red'; }
    if (totalExp >= 1500) { rank = 'Legend'; color = 'text-purple-400'; }
    if (isAdmin) { rank = 'SYSTEM_ADMIN'; color = 'text-theme-red shadow-[0_0_10px_#F84444]'; }
    return { level, totalExp, levelProgress, rank, color, daysSinceUplink, createdAt };
  };

  const prog = calculateProgression();

  const stats = [
    { label: 'Level', value: prog?.level || '0', icon: Trophy, color: 'text-yellow-400' },
    { label: 'Rank', value: prog?.rank || 'Unknown', icon: Award, color: prog?.color || 'text-theme-orange' },
    { label: 'Total EXP', value: prog?.totalExp.toLocaleString() || '0', icon: Activity, color: 'text-blue-400' },
  ];

  const details = [
    { label: 'Neural Link Established', value: prog?.createdAt ? new Date(prog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pending...', icon: Calendar },
    { label: 'Operational ID', value: user?.uid.slice(0, 8).toUpperCase() || 'N/A', icon: Hash },
    { label: 'Days Since Uplink', value: prog?.daysSinceUplink !== undefined ? prog.daysSinceUplink : '0', icon: Globe },
    { label: 'Total Scans', value: profile?.totalScans || '0', icon: Eye },
  ];

  return (
    <div className="pb-32 min-h-screen">
      {/* Header Background */}
      <div className="h-64 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-theme-orange/40 via-theme-red/30 to-cyber-black" />
        
        {/* Profile Info Overlay - Updated layout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-cyber-black to-transparent">
          <div className="flex items-end gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              onClick={() => profile && setIsEditOpen(true)}
              className="relative group cursor-pointer"
            >
              <div className="w-24 h-24 rounded-3xl glass-panel p-1 border border-white/20 overflow-hidden shadow-2xl relative z-10">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={48} className="text-white/20 w-full h-full p-6" />
                )}
              </div>
            </motion.div>
            
            <div className="mb-2">
              <h2 className="text-3xl font-display font-bold text-white tracking-tight mb-1 uppercase italic">
                {profile?.displayName || 'GUEST_USER'}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-theme-orange/80 text-sm font-medium"> @{profile?.username || 'ANON'}</p>
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 border ${prog?.color.includes('text-theme-red') ? 'border-theme-red text-theme-red' : 'border-theme-orange text-theme-orange'} italic`}>
                  {prog?.rank}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-6">
        {!profile ? (
          <div className="glass-panel p-8 text-center bg-white/5">
            <h2 className="text-xl font-display font-bold text-white mb-2">ACCESS RESTRICTED</h2>
            <p className="text-white/40 text-xs mb-8 uppercase tracking-widest">Connect your neural link to view full profile data</p>
            <button 
              onClick={onLoginRequest}
              className="theme-btn theme-btn-orange w-full"
            >
              INITIALIZE UPLINK
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map((s, i) => (
                <div key={i} className="glass-card flex flex-col items-center justify-center py-4 text-center">
                  <s.icon size={18} className={cn("mb-2", s.color)} />
                  <span className="text-lg font-bold text-white leading-tight font-display">{s.value}</span>
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-black italic">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Level Progress */}
            <div className="glass-card">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest font-black italic">Neural Synchronization</span>
                </div>
                <span className="text-[10px] font-bold text-white/40 italic">{Math.round(prog?.levelProgress || 0)}% to level {prog ? prog.level + 1 : '?'}</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-none overflow-hidden p-[1px] border border-white/10 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${prog?.levelProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-theme-orange to-theme-red relative z-10"
                />
                <div className="absolute inset-0 bg-theme-orange/5 animate-pulse" />
              </div>
            </div>

            {/* Operational Data */}
            <div className="glass-panel p-4">
              <h3 className="text-xs font-display font-bold text-white/20 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-2">Technical Dossier</h3>
              <div className="space-y-4">
                {details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 border border-white/10"><d.icon size={14} className="text-theme-orange" /></div>
                      <span className="text-[10px] text-white/40 uppercase font-black tracking-widest italic">{d.label}</span>
                    </div>
                    <span className="text-xs font-mono text-white/80 font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-4 border-t border-white/10">
                <button onClick={async () => { await signOut(auth); onLoginRequest(); }} className="w-full flex items-center justify-between p-3 rounded-none bg-theme-red/5 border border-theme-red/20 hover:bg-theme-red/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <LogOut className="text-theme-red group-hover:animate-pulse" size={16} />
                    <span className="text-[10px] font-bold text-theme-red uppercase tracking-widest italic">Terminate Terminal Connection</span>
                  </div>
                  <ChevronRight size={14} className="text-theme-red/40" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {profile && <EditProfileModal profile={profile} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />}
    </div>
  );
};

// --- Bottom Navigation ---

const GalleryView = ({ profile }: { profile: ProfileData | null }) => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
    }, (error) => {
      console.error("Gallery sync error:", error);
    });
  }, []);

  return (
    <div className="px-4 pt-12 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tighter theme-text-orange italic uppercase">MEDIA_ARCHIVE</h1>
          <p className="text-[10px] text-white/40 tracking-widest uppercase font-black italic">Visual intelligence feed // decrypting...</p>
        </div>
        {profile && (
          <button 
            onClick={() => setIsSubmitOpen(true)}
            className="w-10 h-10 glass-panel rounded-none flex items-center justify-center text-theme-orange border-theme-orange hover:bg-theme-orange/10 transition-colors"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {images.map((img) => (
          <motion.div 
            key={img.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-none overflow-hidden theme-border-orange bg-theme-orange/5 group"
          >
            <div className="aspect-square relative overflow-hidden">
              <img 
                src={img.imageUrl || img.image || DEFAULT_ANIME_IMAGE} 
                alt={img.caption} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_ANIME_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-cyber-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                 <p className="text-[10px] text-white font-bold italic text-center uppercase tracking-tighter line-clamp-3 leading-tight">{img.caption}</p>
              </div>
            </div>
            <div className="p-2 flex items-center justify-between border-t border-white/10">
              <span className="text-[9px] text-theme-orange font-bold italic truncate">@{img.authorUsername}</span>
              <div className="flex items-center gap-1 text-white/30 group-hover:text-theme-red transition-colors">
                <Heart size={10} />
                <span className="text-[9px] font-mono">{img.likes || 0}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="py-20 text-center">
          <ImageIcon size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-xs text-white/40 italic uppercase tracking-widest">No transmissions found in archive.</p>
        </div>
      )}

      <GallerySubmitModal profile={profile} isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} />
    </div>
  );
};

const GallerySubmitModal = ({ profile, isOpen, onClose }: { profile: ProfileData | null, isOpen: boolean, onClose: () => void }) => {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      console.log('Saving Gallery Item:', { imageUrl: url, caption });
      await addDoc(collection(db, 'gallery'), {
        imageUrl: url,
        caption: caption,
        author: profile.displayName,
        authorId: profile.uid,
        authorUsername: profile.username || 'unknown',
        likes: 0,
        createdAt: serverTimestamp()
      });
      setUrl('');
      setCaption('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cyber-black/90 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative glass-panel w-full max-w-sm p-6 rounded-none theme-border-orange">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold theme-text-orange italic uppercase tracking-tight">ADD_TRANSMISSION</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase font-black italic tracking-widest">Visual Input (Image URL)</label>
            <input 
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-cyber-black border border-white/10 p-3 text-xs outline-none focus:theme-border-orange font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/40 uppercase font-black italic tracking-widest">ENCRYPTED_CAPTION</label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Visual data description..."
              className="w-full bg-cyber-black border border-white/10 p-3 text-xs outline-none focus:theme-border-orange italic min-h-[80px]"
            />
          </div>

          {url && (
            <div className="aspect-video border border-white/10 bg-white/5 overflow-hidden">
              <img src={url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setError('Invalid image URL')} />
            </div>
          )}

          {error && <p className="text-[9px] text-theme-red font-bold uppercase italic">{error}</p>}

          <button 
            type="submit"
            disabled={loading || !url}
            className="w-full theme-btn theme-btn-orange italic font-black uppercase tracking-widest py-4 disabled:opacity-30"
          >
            {loading ? 'ARCHIVING...' : 'SUBMIT_TO_GALLERY'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const BottomNav = ({ active, setTab }: { active: string, setTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home, color: 'text-theme-orange' },
    { id: 'news', icon: Newspaper, color: 'text-theme-red' },
    { id: 'gallery', icon: ImageIcon, color: 'text-theme-orange' },
    { id: 'community', icon: Users, color: 'text-theme-orange' },
    { id: 'profile', icon: UserIcon, color: 'text-white' }
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 glass-panel flex items-center justify-around px-4 z-50 border-t border-t-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`relative p-2 transition-all duration-300 ${active === tab.id ? `${tab.color} scale-125` : 'text-white/20'}`}
        >
          <tab.icon size={20} />
          {active === tab.id && (
            <motion.div 
              layoutId="nav-glow"
              className={`absolute inset-0 blur-xl opacity-20 ${tab.color.replace('text-', 'bg-')}`}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { user, profile, loading, isAdmin } = useAuth();
  const [realArticles, setRealArticles] = useState<ArticleItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  useEffect(() => {
    if (user && !user.emailVerified && !isAuthOpen) {
      setIsAuthOpen(true);
    }
  }, [user, isAuthOpen]);

  useEffect(() => {
    const getFilterTime = () => Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(collection(db, 'articles'), where('createdAt', '>', getFilterTime()), orderBy('createdAt', 'desc'));
    
    const unsubArticles = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArticleItem));
      setRealArticles(data);
    }, (error) => {
      console.error("Articles sync error:", error);
    });

    const rq = query(collection(db, 'recommendations'), orderBy('createdAt', 'desc'));
    const unsubRecs = onSnapshot(rq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecommendationItem));
      setRecommendations(data);
    }, (error) => {
      console.error("Recommendations sync error:", error);
    });

    return () => {
      unsubArticles();
      unsubRecs();
    };
  }, []);

  // Combined cleanup and profile sync effects removed to avoid Firestore usage
  /*
  useEffect(() => {
    if (!isAdmin) return;
    ...
  }, [isAdmin]);
  */

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-black flex-col gap-4">
      <div className="w-12 h-12 border-4 border-theme-orange border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,107,0,0.3)]" />
      <p className="text-[10px] font-accent text-theme-orange animate-pulse font-bold tracking-[0.2em]">ESTABLISHING SECURE UPLINK...</p>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-theme-orange/30 bg-cyber-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-theme-orange/[0.07] blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-theme-red/[0.07] blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/[0.05] blur-[120px] rounded-full animate-pulse [animation-delay:4s]" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto min-h-screen border-x border-white/5">
        <AnimatePresence mode="wait">
          {selectedArticle ? (
            <ArticleDetailView 
              key="detail"
              article={selectedArticle} 
              allArticles={[...realArticles, ...(ARTICLES as any)]}
              onBack={() => setSelectedArticle(null)} 
              onArticleClick={(a) => {
                setSelectedArticle(null);
                setTimeout(() => setSelectedArticle(a), 50);
              }}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <motion.div 
                  key="home" 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <HomeView 
                    isAdmin={isAdmin} 
                    onArticleClick={setSelectedArticle} 
                    articles={realArticles}
                    recommendations={recommendations}
                  />
                </motion.div>
              )}
              {activeTab === 'news' && (
                <motion.div 
                  key="news" 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="px-4 pt-12 pb-24"
                >
                  <h1 className="text-3xl font-display font-bold tracking-tighter mb-6 theme-text-orange italic uppercase">GLOBAL STREAM</h1>
                  <div className="space-y-4">
                    {[...realArticles, ...(ARTICLES as any)].map(n => (
                      <ArticleCard key={n.id} article={n} onClick={() => setSelectedArticle(n)} />
                    ))}
                  </div>
                </motion.div>
              )}
              {activeTab === 'gallery' && (
                <motion.div 
                  key="gallery" 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GalleryView profile={profile} />
                </motion.div>
              )}
              {activeTab === 'community' && (
                <motion.div 
                  key="community" 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CommunityView profile={profile} />
                </motion.div>
              )}
              {activeTab === 'profile' && (
                <motion.div 
                  key="profile" 
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <ProfileView user={user} profile={profile} isAdmin={isAdmin} onLoginRequest={() => setIsAuthOpen(true)} />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {!selectedArticle && <BottomNav active={activeTab} setTab={setActiveTab} />}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
