import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Doctors() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', speciality: '', allow_second_week: false, limit_to_two_patients: false });

  const [toastMsg, setToastMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const showToast = (type: 'success'|'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchDoctors = async () => {
    setLoading(true);
    const { data } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
    if (data) setDoctors(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    let resError = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (formData.id) {
         const res = await fetch(`/api/admin/doctors/${formData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(formData)
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الحفظ');
      } else {
         const res = await fetch(`/api/admin/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(formData)
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch(e: any) {
       resError = e;
    }
    
    if (resError) {
      console.error(resError);
      showToast('error', resError.message || 'حدث خطأ أثناء الحفظ');
    } else {
      showToast('success', 'تم الحفظ بنجاح');
      setIsModalOpen(false);
      fetchDoctors();
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('هل أنت متأكد من حذف حساب الطبيب؟ سيتم حذف جميع الجداول والحجوزات المرتبطة به.')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/admin/doctors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('حدث خطأ أثناء الحذف');
        fetchDoctors();
      } catch(e: any) {
        showToast('error', e.message);
      }
    }
  };

  const openModal = (doc: any = null) => {
    if (!isAdmin) return;
    if (doc) {
      setFormData(doc);
    } else {
      setFormData({ id: '', name: '', speciality: '', allow_second_week: false, limit_to_two_patients: false });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 ${toastMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} animate-in slide-in-from-top-4`}>
          {toastMsg.text}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة الأطباء</h2>
          <p className="text-slate-500 text-sm mt-1">كشف بأسماء الأطباء وإعدادات الحجز الخاصة بهم</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            إضافة طبيب جديد
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full text-center py-8">جاري التحميل...</div>
        ) : doctors.length === 0 ? (
           <div className="col-span-full text-center py-8 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">لا يوجد أطباء مضافين حالياً</div>
        ) : (
          doctors.map(doc => (
            <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-teal-500"></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">د. {doc.name}</h3>
              <p className="text-sm text-teal-600 font-medium mb-4">{doc.speciality}</p>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className={`w-2 h-2 rounded-full ${doc.allow_second_week ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  السماح للحجز للأسبوع الثاني: <span className="font-medium">{doc.allow_second_week ? 'نعم' : 'لا'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className={`w-2 h-2 rounded-full ${doc.limit_to_two_patients ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  منع تسجيل الرقم لأكثر من مريضين: <span className="font-medium">{doc.limit_to_two_patients ? 'نعم' : 'لا'}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <button onClick={() => openModal(doc)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-sm font-medium flex justify-center items-center gap-1 transition-colors">
                    <Edit2 className="w-4 h-4" /> تعديل
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-sm font-medium flex justify-center items-center gap-1 transition-colors">
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold mb-6 text-slate-800">{formData.id ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطبيب</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التخصص</label>
                <input
                  type="text"
                  required
                  value={formData.speciality}
                  onChange={(e) => setFormData({...formData, speciality: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                />
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_second_week}
                    onChange={(e) => setFormData({...formData, allow_second_week: e.target.checked})}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">السماح للحجز للأسبوع الثاني</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.limit_to_two_patients}
                    onChange={(e) => setFormData({...formData, limit_to_two_patients: e.target.checked})}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">منع رقم الهاتف من تسجيل أكثر من مريضين لنفس الطبيب</span>
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-bold shadow-sm hover:bg-teal-700 transition-colors">
                  حفظ البيانات
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
