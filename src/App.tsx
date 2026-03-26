import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType,
  type FirebaseUser 
} from './firebase';
import { 
  Users, 
  Plane
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface UserProfile {
  uid: string;
  displayName: string;
}

interface AvailabilityData {
  userId: string;
  unavailableDates: string[];
}

// Components
const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#f5f5f0] z-50">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <Plane className="w-12 h-12 text-[#5A5A40] mx-auto mb-4 animate-bounce" />
      <h2 className="serif text-2xl font-bold text-[#5A5A40]">Trip Planner 2026</h2>
      <p className="text-sm text-[#5A5A40]/60 mt-2">Cargando tu viaje...</p>
    </motion.div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<any>({});
  const [allAvailability, setAllAvailability] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            setIsSettingUp(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setIsSettingUp(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Sync: All Profiles
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles: Record<string, UserProfile> = {};
      snapshot.forEach((doc) => {
        profiles[doc.id] = doc.data() as UserProfile;
      });
      setAllProfiles(profiles);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time Sync: All Availability
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'availability'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const availability: Record<string, string[]> = {};
      snapshot.forEach((doc) => {
        availability[doc.id] = (doc.data() as AvailabilityData).unavailableDates;
      });
      setAllAvailability(availability);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'availability');
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSetupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: displayName.trim(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      await setDoc(doc(db, 'availability', user.uid), {
        userId: user.uid,
        unavailableDates: []
      });
      setProfile(newProfile);
      setIsSettingUp(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const toggleDate = async (dateStr: string) => {
    if (!user || !profile) return;
    
    const currentDates = allAvailability[user.uid] || [];
    const newDates = currentDates.includes(dateStr)
      ? currentDates.filter(d => d !== dateStr)
      : [...currentDates, dateStr];

    try {
      await setDoc(doc(db, 'availability', user.uid), {
        userId: user.uid,
        unavailableDates: newDates
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `availability/${user.uid}`);
    }
  };

  const months = [
    new Date(2026, 5, 1), // June
    new Date(2026, 6, 1), // July
    new Date(2026, 7, 1), // August
    new Date(2026, 8, 1), // September
  ];

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[32px] p-12 shadow-xl text-center"
        >
          <Plane className="w-16 h-16 text-[#5A5A40] mx-auto mb-6" />
          <h1 className="serif text-4xl font-bold mb-4">Viaje 2026</h1>
          <p className="text-[#5A5A40]/70 mb-8">
            Coordina las fechas de tu próximo viaje con tus amigos. Regístrate para empezar.
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-[#5A5A40] text-white rounded-full py-4 font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Entrar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (isSettingUp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[32px] p-12 shadow-xl"
        >
          <h2 className="serif text-3xl font-bold mb-6 text-center">¡Bienvenido!</h2>
          <p className="text-[#5A5A40]/70 mb-8 text-center">
            Elige el nombre que verán tus amigos en el calendario.
          </p>
          <form onSubmit={handleSetupProfile} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5A40]/50 mb-2 ml-4">
                Tu Nombre
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#5A5A40] text-white rounded-full py-4 font-medium hover:bg-[#4A4A30] transition-colors"
            >
              Guardar y Continuar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 md:mb-20">
        <div>
          <h1 className="serif text-5xl md:text-7xl font-bold tracking-tight">Verano 2026</h1>
          <p className="text-[#5A5A40]/60 mt-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Planificando con {Object.keys(allProfiles).length} amigos
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm">
          <div className="w-12 h-12 bg-[#5A5A40] rounded-full flex items-center justify-center text-white font-bold text-xl">
            {profile?.displayName[0].toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight">{profile?.displayName}</p>
            <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Cerrar sesión</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Calendars */}
        <div className="lg:col-span-2 space-y-16">
          {months.map((monthDate) => (
            // @ts-ignore
            <MonthCalendar 
              key={monthDate.toISOString()}
              monthDate={monthDate}
              myAvailability={allAvailability[user.uid] || []}
              allAvailability={allAvailability}
              allProfiles={allProfiles}
              onToggleDate={toggleDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ))}
        </div>

        {/* Sidebar / Info */}
        <div className="space-y-8">
          {selectedDate ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/10 ring-2 ring-[#5A5A40]/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="serif text-2xl font-bold">
                  {format(new Date(selectedDate + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-[#5A5A40]/40 hover:text-[#5A5A40]"
                >
                  Cerrar
                </button>
              </div>
              
              <div className="space-y-4 mb-8">
                {Object.values(allProfiles as any).map((p: any) => {
                  const isUnavailable = (allAvailability[p.uid] || []).includes(selectedDate);
                  return (
                    <div key={p.uid} className="flex items-center justify-between p-3 rounded-2xl bg-[#f5f5f0]/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs",
                          isUnavailable ? "bg-red-400" : "bg-green-400"
                        )}>
                          {p.displayName[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{p.displayName}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        isUnavailable ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      )}>
                        {isUnavailable ? "Ocupado" : "Libre"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => toggleDate(selectedDate)}
                className={cn(
                  "w-full py-4 rounded-full font-medium transition-all",
                  (allAvailability[user.uid] || []).includes(selectedDate)
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-red-100 text-red-700 hover:bg-red-200"
                )}
              >
                {(allAvailability[user.uid] || []).includes(selectedDate)
                  ? "Marcar como LIBRE para mí"
                  : "Marcar como OCUPADO para mí"}
              </button>
            </motion.div>
          ) : (
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/5">
              <h3 className="serif text-2xl font-bold mb-6">Instrucciones</h3>
              <ul className="space-y-4 text-sm text-[#5A5A40]/70">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#5A5A40]/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span>Haz clic en un día para ver <b>quién puede ir</b> y quién no.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#5A5A40]/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span>Haz <b>doble clic</b> en un día para marcarlo como ocupado para ti.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0" />
                  <span>Los días en rojo son los que <b>tú</b> o <b>todos</b> estáis ocupados.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex-shrink-0" />
                  <span>Los días en verde son los que <b>todos</b> estáis libres.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-yellow-100 flex-shrink-0" />
                  <span>Los días en amarillo tienen a alguien ocupado.</span>
                </li>
              </ul>
            </div>
          )}

          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/5">
            <h3 className="serif text-2xl font-bold mb-6">Amigos</h3>
            <div className="space-y-4">
              {Object.values(allProfiles as any).map((p: any) => (
                <div key={p.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] font-bold text-xs">
                      {p.displayName[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{p.displayName} {p.uid === user.uid && "(Tú)"}</span>
                  </div>
                  <span className="text-xs text-[#5A5A40]/40">
                    {allAvailability[p.uid]?.length || 0} ocupados
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MonthCalendarProps {
  key?: string;
  monthDate: Date;
  myAvailability: string[];
  allAvailability: any;
  allProfiles: any;
  onToggleDate: (dateStr: string) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}

function MonthCalendar({ 
  monthDate, 
  myAvailability, 
  allAvailability, 
  allProfiles, 
  onToggleDate,
  selectedDate,
  onSelectDate
}: MonthCalendarProps) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm">
      <h2 className="serif text-3xl font-bold mb-8 capitalize">
        {format(monthDate, 'MMMM yyyy', { locale: es })}
      </h2>
      
      <div className="calendar-grid mb-4">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-[#5A5A40]/30 uppercase tracking-widest py-4">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isUnavailableForMe = myAvailability.includes(dateStr);
          
          // Calculate who is unavailable this day
          const unavailableFriends = Object.entries(allAvailability as any)
            .filter(([, dates]) => (dates as any).includes(dateStr))
            .map(([uid]) => (allProfiles as any)[uid]?.displayName)
            .filter((name): name is string => !!name);

          const totalFriends = Object.keys(allProfiles).length;
          const status = unavailableFriends.length === 0 
            ? 'available' 
            : unavailableFriends.length === totalFriends 
              ? 'unavailable' 
              : 'mixed';

          return (
            <div
              key={dateStr}
              onClick={() => isCurrentMonth && onSelectDate(dateStr)}
              onDoubleClick={() => isCurrentMonth && onToggleDate(dateStr)}
              className={cn(
                "day-cell",
                !isCurrentMonth && "other-month",
                isCurrentMonth && status === 'available' && "available",
                isCurrentMonth && status === 'unavailable' && "unavailable",
                isCurrentMonth && status === 'mixed' && "mixed",
                isUnavailableForMe && "me-unavailable",
                selectedDate === dateStr && "selected ring-4 ring-[#5A5A40] z-20"
              )}
            >
              <span className="text-lg font-medium">{format(day, 'd')}</span>
              
              {isCurrentMonth && unavailableFriends.length > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {unavailableFriends.slice(0, 3).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-current opacity-40" />
                  ))}
                  {unavailableFriends.length > 3 && <span className="text-[8px] opacity-40">+</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}