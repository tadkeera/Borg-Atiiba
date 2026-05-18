import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { HOSPITAL_LOGO } from '../utils/constants';

export default function Layout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-teal-600 flex items-center justify-between px-8 text-white shadow-lg shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 font-bold text-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
            <img src={HOSPITAL_LOGO} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">نظام إدارة التسجيل | مستشفى برج الأطباء</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">{isAdmin ? 'مدير النظام (أدمن)' : 'موظف استقبال'}</span>
            <span className="text-xs opacity-80">{user?.username} - متصل الآن</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-500 border-2 border-teal-400 flex items-center justify-center text-xl">
            👤
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-4 shrink-0 overflow-y-auto hidden md:flex">
          <nav className="flex-1 flex flex-col gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">لوحة التحكم</span>
            </NavLink>

            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">الأطباء</span>
            </NavLink>

            <NavLink
              to="/schedules"
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">الجداول والسعة</span>
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
                  }`
                }
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">إعدادات واتساب</span>
              </NavLink>
            )}
          </nav>
          
          <div className="mt-4 flex flex-col gap-4">
             <button
               onClick={handleLogout}
               className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-500 hover:bg-slate-800 transition-colors text-sm font-medium"
             >
               <LogOut className="w-5 h-5" />
               <span>تسجيل الخروج</span>
             </button>
             
             <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
               <p className="text-xs text-slate-400 mb-2">حالة البوت (WhatsApp API)</p>
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                 <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">متصل</span>
               </div>
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden bg-slate-50">
          <div className="h-full overflow-y-auto pr-2">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Footer Bar */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-8 text-xs text-slate-500 shrink-0">
        <div>نظام إدارة التسجيل - برج الأطباء</div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> النظام متصل</span>
        </div>
      </footer>
    </div>
  );
}
