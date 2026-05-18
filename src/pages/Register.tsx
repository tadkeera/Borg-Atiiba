import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

import { HOSPITAL_LOGO } from '../utils/constants';

export default function Register() {
  const [role, setRole] = useState<'admin' | 'receptionist'>('receptionist');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let submitEmail = username.includes('@') ? username : `${username}@hospital.com`;
    let submitPassword = password;
    if (password === '123') submitPassword = '123456';

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: submitEmail,
        password: submitPassword,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            username: username,
            role: role
          }
        ]);

        if (profileError) {
          setError('Account created, but profile mapping failed. ' + profileError.message);
        } else {
            // Success
            // If email confirmation is disabled, user is immediately signed in
            // and AuthContext will navigate them.
            // But if it requires email confirmation, we must tell them:
            if (data.session === null) {
                setError('Account registered successfully! Please check your email to confirm if email confirmations are enabled.');
            }
        }
      }
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
          <h2 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h2>
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

        <form onSubmit={handleRegister} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم المستخدم أو الإيميل
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
            <p className="text-xs text-slate-500 mt-1">يمكنك استخدام اسم المستخدم وسيتم تحويله تلقائياً لبريد إلكتروني</p>
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
              placeholder="123"
            />
            <p className="text-xs text-slate-500 mt-1">يجب أن تتكون من 6 أحرف على الأقل (ستتجاوز لو أدخلت 123)</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب جديد'}
          </button>
        </form>

        <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                لديك حساب بالفعل؟ تسجيل الدخول
            </Link>
        </div>
      </div>
    </div>
  );
}
