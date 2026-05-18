import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Save, MessageCircle, UserPlus, Users, Trash2, Ban, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'users' | 'whatsapp'>('users');

  // WhatsApp State
  const [waLoading, setWaLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [waData, setWaData] = useState({ id: '', whatsapp_api_token: '', whatsapp_phone_number_id: '' });

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'receptionist' });
  const [userMsg, setUserMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    setWaLoading(true);
    const { data } = await supabase.from('settings').select('*').limit(1).single();
    if (data) setWaData(data);
    setWaLoading(false);
  };

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (!res.ok) {
         const text = await res.text();
         let errMsg = text;
         try {
            const errObj = JSON.parse(text);
            if (errObj.error) errMsg = errObj.error;
         } catch(e) {}
         if (errMsg.includes('<!DOCTYPE html>') || errMsg.includes('<html')) {
             errMsg = 'فشل الاتصال بالخادم. تأكد من إعداد المفاتيح (SUPABASE_SERVICE_ROLE_KEY) وتشغيل الخادم.';
         }
         throw new Error(errMsg);
      }
      
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    }
    setUsersLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUserMsg(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      
      if (!res.ok) {
         const text = await res.text();
         let errMsg = text;
         try {
            const errObj = JSON.parse(text);
            if (errObj.error) errMsg = errObj.error;
         } catch(e) {}
         if (errMsg.includes('<!DOCTYPE html>') || errMsg.includes('<html')) {
             errMsg = 'فشل الاتصال بالخادم. يرجى محاولة إعادة التشغيل.';
         }
         throw new Error(errMsg);
      }
      
      const data = await res.json();
      setUserMsg({ type: 'success', text: 'تمت إضافة المستخدم بنجاح' });
      setNewUser({ username: '', password: '', role: 'receptionist' });
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err.message || 'فشل في الإضافة' });
    }
    setSaving(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "خطأ أثناء تحديث حالة المستخدم");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "خطأ أثناء حذف المستخدم");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveWa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setWaMsg('');
    const { error } = await supabase.from('settings').update({
      whatsapp_api_token: waData.whatsapp_api_token,
      whatsapp_phone_number_id: waData.whatsapp_phone_number_id
    }).eq('id', waData.id);
    if (error) setWaMsg('حدث خطأ أثناء الحفظ');
    else setWaMsg('تم حفظ الإعدادات بنجاح');
    setSaving(false);
  };

  if (!isAdmin) return <div className="text-center py-10">غير مصرح لك بدخول هذه الصفحة.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">إعدادات النظام</h2>
        <p className="text-slate-500 text-sm mt-1">إدارة المستخدمين وإعدادات الربط</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-colors ${activeTab === 'users' ? 'border-teal-600 text-teal-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
        >
          <Users className="w-5 h-5" />
          إدارة المستخدمين
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 py-3 px-6 border-b-2 transition-colors ${activeTab === 'whatsapp' ? 'border-teal-600 text-teal-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
        >
          <MessageCircle className="w-5 h-5" />
          إعدادات الواتساب
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden h-fit">
             <div className="absolute top-0 right-0 w-1.5 h-full bg-teal-500"></div>
             <div className="flex items-center gap-3 text-teal-600 mb-6">
               <UserPlus className="w-6 h-6" />
               <h3 className="text-lg font-bold text-slate-800">إضافة مستخدم جديد</h3>
             </div>
             
             {userMsg && (
               <div className={`p-3 text-sm rounded-lg mb-4 border ${userMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                 {userMsg.text}
               </div>
             )}

             <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع الحساب</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-700"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="admin">مدير نظام</option>
                    <option value="receptionist">موظف استقبال</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">كلمة السر</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-left"
                    dir="ltr"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">يجب أن تتكون من 6 أحرف على الأقل</p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ المستخدم الجديد'}
                </button>
             </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">قائمة المستخدمين</h3>
            {usersLoading ? (
               <div className="text-center py-10 text-slate-500">جاري التحميل...</div>
            ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-right text-slate-600">
                   <thead className="text-xs text-slate-500 bg-slate-50 border-y border-slate-200">
                     <tr>
                       <th className="px-4 py-3 font-medium">اسم المستخدم</th>
                       <th className="px-4 py-3 font-medium">نوع الحساب</th>
                       <th className="px-4 py-3 font-medium">الحالة</th>
                       <th className="px-4 py-3 font-medium text-center">الإجراءات</th>
                     </tr>
                   </thead>
                   <tbody>
                     {users.map(u => (
                       <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 font-bold text-slate-800" dir="ltr">{u.username.split('@')[0]}</td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                             {u.role === 'admin' ? 'مدير نظام' : 'استقبال'}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           {u.is_active ? 
                             <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="w-4 h-4"/> نشط</span> : 
                             <span className="flex items-center gap-1 text-rose-600 font-medium"><Ban className="w-4 h-4"/> موقوف</span>
                           }
                         </td>
                         <td className="px-4 py-3 flex justify-center gap-2">
                           {user?.id !== u.id && ( // Prevent admin from deleting/suspending themselves
                             <>
                               <button 
                                 title={u.is_active ? "إيقاف الحساب" : "تنشيط الحساب"}
                                 onClick={() => handleToggleStatus(u.id, u.is_active)}
                                 className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                               >
                                 <Ban className={`w-4 h-4 ${u.is_active ? '' : 'text-emerald-600'}`}/>
                               </button>
                               <button 
                                 title="حذف الحساب"
                                 onClick={() => handleDeleteUser(u.id)}
                                 className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
                               >
                                 <Trash2 className="w-4 h-4"/>
                               </button>
                             </>
                           )}
                           {user?.id === u.id && (
                               <span className="text-xs text-slate-400">حسابك الحالي</span>
                           )}
                         </td>
                       </tr>
                     ))}
                     {users.length === 0 && (
                       <tr>
                         <td colSpan={4} className="text-center py-6 text-slate-500">لا يوجد مستخدمين.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-teal-500"></div>
          {waLoading ? (
            <div className="text-center py-4 text-slate-500">جاري التحميل...</div>
          ) : (
            <form onSubmit={handleSaveWa} className="space-y-6">
              {waMsg && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${waMsg.includes('خطأ') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                  {waMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp API Token</label>
                <textarea required rows={3} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-sm text-left" dir="ltr" value={waData.whatsapp_api_token || ''} onChange={e => setWaData({...waData, whatsapp_api_token: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number ID</label>
                <input type="text" required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-left" dir="ltr" value={waData.whatsapp_phone_number_id || ''} onChange={e => setWaData({...waData, whatsapp_phone_number_id: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-8 rounded-xl disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-5 h-5"/> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
