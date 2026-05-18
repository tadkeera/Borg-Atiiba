import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { format } from 'date-fns';
import { Search, Filter, Trash2, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bookings, setBookings] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDoc, setFilterDoc] = useState('all');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, [filterDoc, filterDate]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch doctors for filter
    const { data: docs } = await supabase.from('doctors').select('*');
    if (docs) setDoctors(docs);

    let query = supabase.from('bookings').select('*, doctors(name, speciality)');
    
    if (filterDoc !== 'all') {
      query = query.eq('doctor_id', filterDoc);
    }
    if (filterDate) {
      query = query.eq('booking_date', filterDate);
    }

    const { data } = await query.order('queue_number', { ascending: true });
    setBookings(data || []);
    setLoading(false);
  };

  const handlePayment = async (id: string, status: string) => {
    if (!isAdmin) return;
    await supabase.from('bookings').update({ payment_status: status }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id: string, scheduleId: string) => {
    if (!isAdmin) return;
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;
    
    // Increment capacity when deleting
    const { data: sched } = await supabase.from('schedules').select('available_capacity').eq('id', scheduleId).single();
    if (sched) {
       await supabase.from('schedules').update({ available_capacity: sched.available_capacity + 1 }).eq('id', scheduleId);
    }

    await supabase.from('bookings').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">حجوزات المرضى</h2>
          <p className="text-gray-500 text-sm mt-1">سجل الحجوزات والمواعيد لجميع العيادات</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 mb-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">تصفية بالطبيب</label>
          <select 
            className="w-full border-slate-200 bg-slate-50 outline-none rounded-xl text-sm focus:ring-1 focus:ring-teal-500 border p-2.5 transition-shadow"
            value={filterDoc}
            onChange={(e) => setFilterDoc(e.target.value)}
          >
            <option value="all">جميع الأطباء</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>د. {d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">التاريخ</label>
          <input 
            type="date" 
            className="w-full border-slate-200 bg-slate-50 outline-none rounded-xl text-sm focus:ring-1 focus:ring-teal-500 border p-2.5 transition-shadow"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats/Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-teal-500">
           <p className="text-slate-500 text-xs mb-1">إجمالي الحجوزات</p>
           <h3 className="text-2xl font-bold text-slate-800">{bookings.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-blue-500">
           <p className="text-slate-500 text-xs mb-1">تم الدفع</p>
           <h3 className="text-2xl font-bold text-slate-800">{bookings.filter(b => b.payment_status === 'paid').length}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-amber-500">
           <p className="text-slate-500 text-xs mb-1">بانتظار الدفع</p>
           <h3 className="text-2xl font-bold text-slate-800">{bookings.filter(b => b.payment_status === 'pending').length}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-purple-500">
           <p className="text-slate-500 text-xs mb-1">أطباء متاحون</p>
           <h3 className="text-2xl font-bold text-slate-800">{doctors.length}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-slate-600">
            <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0">
              <tr>
                <th className="p-4 font-medium">الرقم</th>
                <th className="p-4 font-medium">المريض</th>
                <th className="p-4 font-medium">رقم الهاتف</th>
                <th className="p-4 font-medium">الطبيب</th>
                <th className="p-4 font-medium">الفترة</th>
                <th className="p-4 font-medium">حالة الدفع</th>
                {isAdmin && <th className="p-4 font-medium text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">جاري التحميل...</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">لا توجد حجوزات مطابقة</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-teal-600 font-bold">
                       {booking.queue_number <= 20 ? `#${["⓪","❶","❷","❸","❹","❺","❻","❼","❽","❾","❿","⓫","⓬","⓭","⓮","⓯","⓰","⓱","⓲","⓳","⓴"][booking.queue_number]}` : `#${booking.queue_number}`}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{booking.patient_name}</td>
                    <td className="p-4" dir="ltr">{booking.phone_number}</td>
                    <td className="p-4 text-slate-600">د. {booking.doctors?.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">{booking.shift}</span>
                    </td>
                    <td className="p-4">
                      {booking.payment_status === 'paid' ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-4 h-4"/> مؤكد ومسدد</span>
                      ) : booking.payment_status === 'cancelled' ? (
                        <span className="text-rose-500 text-xs font-medium">ملغي</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-400 italic text-xs font-medium">⏳ انتظار الدفع</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {booking.payment_status === 'pending' && (
                            <button
                              onClick={() => handlePayment(booking.id, 'paid')}
                              className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors"
                              title="تأكيد الدفع"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(booking.id, booking.schedule_id)}
                            className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-colors"
                            title="حذف الحجز"
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
    </div>
  );
}
