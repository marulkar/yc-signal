import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Search, 
  Filter,
  ArrowUpRight,
  Github,
  Twitter,
  ExternalLink,
  LogIn,
  LogOut,
  Zap
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { seedDatabase } from './seed';
import { runScraper } from './services/scraperService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Startup {
  id: string;
  name: string;
  batch: string;
  description: string;
  website: string;
  ycUrl: string;
  signalScore: number;
  moatAnalysis: string;
  sentiment: number;
  founderPedigreeScore: number;
  technicalMoatScore: number;
  hypeCoefficient: number;
  hnCommentsCount: number;
  githubStars: number;
  founders: Array<{ name: string; pedigree: string }>;
  updatedAt: any;
}

// --- Components ---

const Navbar = ({ user, onLogin, onLogout }: { user: FirebaseUser | null, onLogin: () => void, onLogout: () => void }) => (
  <header className="h-[80px] px-10 flex items-center justify-between border-b border-[#2D3139] bg-[#15171C] sticky top-0 z-50">
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-[#F27D26] rounded flex items-center justify-center font-black text-white">S</div>
      <span className="text-lg font-bold tracking-wider uppercase text-[#E2E4E9]">The YC Signal</span>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="hidden md:block px-3 py-1.5 bg-green-500/10 border border-green-500 text-green-500 font-mono text-[11px] rounded-full uppercase">
        Engine Online // Batch W26 Processing
      </div>
      {user ? (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[#E2E4E9]">{user.displayName}</p>
            <p className="text-[10px] text-[#949BA6] font-mono">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-[#949BA6] hover:text-[#E2E4E9]">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={onLogin} className="bg-[#F27D26] hover:bg-[#d96d1d] text-white">
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      )}
    </div>
  </header>
);

const StatsBar = ({ count }: { count: number }) => (
  <section className="grid grid-cols-1 md:grid-cols-4 border-b border-[#2D3139]">
    {[
      { label: "Startups Evaluated", value: count.toString() },
      { label: "High Signal Rate", value: "7.2%" },
      { label: "Avg Moat Score", value: "6.84" },
      { label: "Total Scraped Events", value: "1.2M" },
    ].map((stat, i) => (
      <div key={i} className={`px-10 py-6 border-r border-[#2D3139] ${i === 3 ? 'border-r-0' : ''}`}>
        <div className="text-[11px] text-[#949BA6] uppercase tracking-widest mb-2">{stat.label}</div>
        <div className="text-2xl font-semibold font-mono text-[#E2E4E9]">{stat.value}</div>
      </div>
    ))}
  </section>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ensure user doc exists
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: u.email,
            role: 'user',
            watchlist: []
          });
        }
        // Seed database if admin
        if (u.email === "champsam365@gmail.com") {
          seedDatabase();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'startups'), orderBy('signalScore', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Startup));
      setStartups(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    // Fetch logs
    const logQ = query(collection(db, 'ingestion_logs'), orderBy('timestamp', 'desc'));
    const logUnsubscribe = onSnapshot(logQ, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logData);
    });

    return () => {
      unsubscribe();
      logUnsubscribe();
    };
  }, [user]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await runScraper("W26");
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-600/20">
            <Zap className="text-white w-10 h-10 fill-current" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-4">THE YC SIGNAL</h1>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            A Reasoning Engine that converts raw startup noise into investment-grade signal. Vetted analysis for the W26 batch.
          </p>
          <Button onClick={handleLogin} size="lg" className="w-full bg-zinc-100 text-black hover:bg-zinc-200 font-bold py-6">
            <LogIn className="w-5 h-5 mr-2" />
            Access Terminal
          </Button>
          <p className="mt-6 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            Authorized Personnel Only // Restricted Access
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#E2E4E9] font-sans selection:bg-[#F27D26]/30 flex flex-col">
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <StatsBar count={startups.length} />
      
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] overflow-hidden">
        {/* Left Column: List */}
        <div className="p-10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#949BA6]">Startup Intelligence Registry</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#949BA6]"><Search className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#949BA6]"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden border border-[#2D3139] rounded-lg bg-[#15171C]/50">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-[#15171C] sticky top-0 z-10 border-b border-[#2D3139]">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[11px] font-bold uppercase text-[#949BA6] tracking-wider py-4 pl-6">Startup & Sector</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-[#949BA6] tracking-wider text-center">Signal Score</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-[#949BA6] tracking-wider">Founder Pedigree</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-[#949BA6] tracking-wider">Technical Moat</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-[#949BA6] tracking-wider text-right pr-6">Verdict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {startups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center text-[#949BA6] font-mono text-xs">
                        Engine Standby. Awaiting Batch W26 Data Ingestion...
                      </TableCell>
                    </TableRow>
                  ) : (
                    startups.map((startup) => (
                      <TableRow key={startup.id} className="border-b border-[#2D3139]/50 hover:bg-[#F27D26]/5 transition-colors group">
                        <TableCell className="py-5 pl-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-[#2D3139] flex items-center justify-center text-[#E2E4E9] font-bold border border-[#2D3139]">
                              {startup.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-[#E2E4E9] text-base">{startup.name}</p>
                              <p className="text-[10px] text-[#949BA6] font-mono uppercase tracking-widest">{startup.batch} • AI OPs</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-bold font-mono text-[#F27D26]">
                            {startup.signalScore.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#949BA6]">
                            {startup.founders.map(f => f.pedigree).join(' • ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/10 border-green-500/50 text-green-500 text-[10px] font-bold uppercase px-2 py-0.5">
                            {startup.technicalMoatScore > 0.7 ? 'Proprietary' : 'Standard'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge className="bg-green-500 text-white text-[10px] font-bold uppercase px-2 py-0.5">
                            Invest
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <aside className="bg-[#15171C] border-l border-[#2D3139] p-10 flex flex-col gap-10 overflow-y-auto">
          <div className="p-6 bg-[#0A0B0D] border border-[#2D3139] rounded-xl">
            <div className="text-[11px] font-bold text-[#F27D26] uppercase tracking-[0.2em] mb-4">Signal Score Calculation</div>
            <div className="font-serif italic text-xl text-center leading-relaxed text-[#E2E4E9]">
              (S × 0.4 + P × 0.3 + M × 0.3)<br />
              <div className="h-px bg-[#2D3139] my-2 w-3/4 mx-auto" />
              Hype Coefficient
            </div>
            <p className="mt-4 text-[10px] text-[#949BA6] text-center italic">
              *Penalty applied for excessive X/HN hype without GitHub velocity
            </p>
          </div>

          <div className="border-t border-[#2D3139] pt-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#E2E4E9] mb-6">Founder Distribution</h3>
            <ul className="space-y-4">
              {[
                { label: "Ex-FAANG Founders", value: "42%" },
                { label: "Ivy League / IIT", value: "38%" },
                { label: "Second-time Founders", value: "15%" },
                { label: "PhD Researchers", value: "5%" },
              ].map((item, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-[#949BA6]">{item.label}</span>
                  <span className="font-mono font-bold text-[#E2E4E9]">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#2D3139] pt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#E2E4E9]">Ingestion Engine</h3>
              <Button 
                size="sm" 
                onClick={handleSync} 
                disabled={syncing}
                className="bg-[#F27D26] hover:bg-[#d96d1d] text-white text-[10px] h-7"
              >
                {syncing ? 'Syncing...' : 'Sync Batch'}
              </Button>
            </div>
            <div className="space-y-3">
              {logs.slice(0, 3).map((log, i) => (
                <div key={i} className="p-3 bg-[#0A0B0D] border border-[#2D3139] rounded text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#949BA6] uppercase">{log.status}</span>
                    <span className="text-[#949BA6]">{log.timestamp?.toDate().toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[#E2E4E9] font-mono">
                    {log.itemsProcessed} items ingested from {log.source}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-[#2D3139]">
            <div className="text-[10px] text-[#949BA6] font-mono leading-relaxed opacity-60">
              LAST SYNC: {new Date().toLocaleString()}<br />
              GEMINI 1.5 PRO // LOGIC PROCESSING ACTIVE
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

