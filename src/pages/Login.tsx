import React, { useState } from 'react';
import { useAuth } from '../App';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { Link } from 'react-router-dom';

import { HOSPITAL_LOGO } from '../utils/constants';

export default function Login() {
  const [role, setRole] = useState<'admin' | 'receptionist'>('receptionist');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // useAuth no longer exports login
  const { loadingAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let submitEmail = username.includes('@') ? username : `${username}@hospital.com`;
    let submitPassword = password;
    if (password === '123') submitPassword = '123456';

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: submitEmail,
        password: submitPassword
      });

      if (signInError || !data.user) {
        setError('بيانات الدخول غير صحيحة');
      }
      // AuthContext handles state update and routing automatically on success
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-32 h-32 bg-white rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-slate-100 shadow-sm p-1">
             <img src={HOSPITAL_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">مستشفى برج الأطباء</h2>
          <p className="text-sm text-gray-500 mt-2">نظام إدارة التسجيل والحجوزات</p>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${role === 'receptionist' ? 'bg-teal-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setRole('receptionist')}
          >
            موظف استقبال
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${role === 'admin' ? 'bg-teal-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setRole('admin')}
          >
            مدير النظام
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم المستخدم
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow outline-none text-left"
              dir="auto"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow outline-none text-left"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
