import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 6, name: 'السبت' },
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الاثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' }
];

export default function Schedules() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [schedules, setSchedules] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', doctor_id: '', day_of_week: 6, shift: 'صباحية', max_capacity: 20 });
  
  // Inline edit state
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editCapacityValue, setEditCapacityValue] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: docs } = await supabase.from('doctors').select('*');
    if (docs) setDoctors(docs);

    const { data: scheds } = await supabase.from('schedules').select('*, doctors(name)');
    if (scheds) {
       // Sort by doctor name then day
       scheds.sort((a, b) => {
          if (a.doctor_id === b.doctor_id) return a.day_of_week - b.day_of_week;
          return a.doctors.name.localeCompare(b.doctors.name);
       });
       setSchedules(scheds);
    }
    setLoading(false);
  };

  const getDayName = (id: number) => DAYS_OF_WEEK.find(d => d.id === id)?.name || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (formData.id) {
       // Just standard full edit logic if needed, but we mostly edit capacity inline.
    } else {
       await supabase.from('schedules').insert({
          doctor_id: formData.doctor_id,
          day_of_week: formData.day_of_week,
          shift: formData.shift,
          max_capacity: formData.max_capacity,
          available_capacity: formData.max_capacity
       });
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
       await supabase.from('schedules').delete().eq('id', id);
       fetchData();
    }
  };

  const saveInlineCapacity = async (schedule: any) => {
      if (!isAdmin) return;
      
      const newMax = editCapacityValue;
      if (newMax < 0) return;

      const diff = newMax - schedule.max_capacity;
      const newAvailable = Math.max(0, schedule.available_capacity + diff);

      await supabase.from('schedules').update({
         max_capacity: newMax,
         available_capacity: newAvailable
      }).eq('id', schedule.id);

      setEditingCapacityId(null);
      fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">جداول الأطباء</h2>
          <p className="text-slate-500 text-sm mt-1">إدارة أيام العمل والفترات والسعة الاستيعابية</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              setFormData({ id: '', doctor_id: doctors[0]?.id || '', day_of_week: 6, shift: 'صباحية', max_capacity: 20 });
              setIsModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] shadow-sm text-sm font-medium disabled:opacity-50 disabled:hover:scale-100"
            disabled={doctors.length === 0}
          >
            <Plus className="w-4 h-4" />
            إضافة جدول عمل
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-slate-600">
            <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0">
              <tr>
                <th className="p-4 font-medium">الطبيب</th>
                <th className="p-4 font-medium">اليوم</th>
                <th className="p-4 font-medium">الفترة</th>
                <th className="p-4 font-medium">السعة القصوى (مرضى)</th>
                <th className="p-4 font-medium">المقاعد المتاحة</th>
                {isAdmin && <th className="p-4 font-medium text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">جاري التحميل...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">لا توجد جداول مضافة</td>
                </tr>
              ) : (
                schedules.map((sched) => (
                  <tr key={sched.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">د. {sched.doctors?.name}</td>
                    <td className="p-4 text-teal-600 font-medium">{getDayName(sched.day_of_week)}</td>
                    <td className="p-4">{sched.shift}</td>
                    <td className="p-4">
                       {editingCapacityId === sched.id ? (
                          <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                min="1"
                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-center bg-slate-50 outline-none focus:ring-2 focus:ring-teal-500"
                                value={editCapacityValue}
                                onChange={(e) => setEditCapacityValue(parseInt(e.target.value))}
                             />
                             <button onClick={() => saveInlineCapacity(sched)} className="text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">حفظ</button>
                             <button onClick={() => setEditingCapacityId(null)} className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors">إلغاء</button>
                          </div>
                       ) : (
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-slate-800">{sched.max_capacity}</span>
                             {isAdmin && (
                                <button 
                                  onClick={() => { setEditingCapacityId(sched.id); setEditCapacityValue(sched.max_capacity); }}
                                  className="text-teal-600 hover:text-teal-800 text-xs flex gap-1 items-center bg-teal-50 px-2 py-1 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3 h-3"/> تعديل
                                </button>
                             )}
                          </div>
                       )}
                    </td>
                    <td className="p-4 font-bold text-emerald-600">{sched.available_capacity}</td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center">
                          <button
                            onClick={() => handleDelete(sched.id)}
                            className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-colors"
                            title="حذف الجدول"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold mb-6 text-slate-800">إضافة جدول عمل للطبيب</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اختر الطبيب</label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                >
                  <option value="" disabled>-- اختيار الطبيب --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اليوم</label>
                <select
                  required
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                >
                  {DAYS_OF_WEEK.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الفترة</label>
                <select
                  required
                  value={formData.shift}
                  onChange={(e) => setFormData({...formData, shift: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                >
                  <option value="صباحية">صباحية</option>
                  <option value="مسائية">مسائية</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السعة اليومية للمرضى</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({...formData, max_capacity: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 outline-none rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-bold shadow-sm hover:bg-teal-700 transition-colors">
                  إضافة الجدول
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
