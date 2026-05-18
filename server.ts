import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { format, addDays } from "date-fns";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import dotenv from "dotenv";

dotenv.config();

// We must bypass local limits if we don't have these, but let's assume they are provided in env.
const supabaseUrl = process.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // ========== ADMIN USER MANAGEMENT ROUTES ==========
  
  // Middleware to authenticate and authorize admin
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) return res.status(401).json({ error: "Invalid token" });
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') {
         return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
         return res.status(500).json({ error: "مفتاح SUPABASE_SERVICE_ROLE_KEY غير موجود. لا يمكن جلب المستخدمين." });
      }
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      // Fetch profiles to get roles and usernames
      const { data: profiles } = await supabase.from('profiles').select('*');
      
      const users = data.users.map(u => {
         const p = profiles?.find(prof => prof.id === u.id);
         return {
           id: u.id,
           email: u.email,
           username: p?.username || u.email,
           role: p?.role || 'receptionist',
           is_active: u.banned_until == null,
           last_sign_in_at: u.last_sign_in_at
         };
      });
      res.json(users);
    } catch (e: any) {
      next(e);
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if service role key is configured (meaning it's different from the anon key, or explicitly set)
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
         return res.status(500).json({ 
            error: "مفتاح SUPABASE_SERVICE_ROLE_KEY غير موجود في إعدادات البيئة (Environment Variables). يجب إضافته لتمكين الإدارة." 
         });
      }

      const email = username.includes('@') ? username : `${username}@borg.local`;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) throw error;
      
      if (data.user) {
         // Create profile
         await supabase.from('profiles').insert([{
            id: data.user.id,
            username: username,
            role: role
         }]);
      }
      res.json({ success: true, user: data.user });
    } catch (e: any) {
      next(e);
    }
  });

  app.put("/api/admin/users/:id/status", requireAdmin, async (req, res, next) => {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
         return res.status(500).json({ error: "مفتاح SUPABASE_SERVICE_ROLE_KEY غير موجود." });
      }
      const { id } = req.params;
      const { is_active } = req.body;
      const banDuration = is_active ? 'none' : '87600h'; // 10 years ban
      const { data, error } = await supabase.auth.admin.updateUserById(id, { ban_duration: banDuration });
      if (error) throw error;
      res.json({ success: true });
    } catch(e: any) {
      next(e);
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
         return res.status(500).json({ error: "مفتاح SUPABASE_SERVICE_ROLE_KEY غير موجود." });
      }
      const { id } = req.params;
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e: any) {
      next(e);
    }
  });

  // ========== WHATSAPP WEBHOOK ROUTE ==========
  // Verify token
  app.get("/api/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // This should match the meta app verification token
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "12345";

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // Handle incoming messages
  app.post("/api/webhook/whatsapp", async (req, res) => {
    // Quickly acknowledge receipt to avoid Meta retries
    res.sendStatus(200);

    const body = req.body;
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // sender phone
        const msg_body = body.entry[0].changes[0].value.messages[0].text?.body;
        const msg_type = body.entry[0].changes[0].value.messages[0].type;
        
        // Fetch Settings for token
        const { data: settings } = await supabase.from('settings').select('*').single();
        const token = process.env.WHATSAPP_API_TOKEN || (settings?.whatsapp_api_token);

        if (!token) {
           console.error("No WhatsApp Token configured.");
           return;
        }

        // Send Message Helper
        const sendWhatsAppMessage = async (to: string, text: string) => {
            try {
               await fetch(`https://graph.facebook.com/v17.0/${phone_number_id}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: text }
                  })
               });
            } catch (err) {
               console.error("Failed to send WA message:", err);
            }
        };

        if (msg_type !== 'text') {
            await sendWhatsAppMessage(from, "عذراً، لم أتمكن من فهم طلبك. الرجاء إرسال نص فقط.");
            return;
        }

        // --- Session Management ---
        const { data: session, error: sessionErr } = await supabase
            .from('bot_sessions')
            .select('*')
            .eq('phone_number', from)
            .single();

        let currentState = session?.state || 'INIT';
        let context = session?.context || {};
        
        // Check timeout (10 mins)
        if (session && session.last_interaction_at) {
             const lastInt = new Date(session.last_interaction_at).getTime();
             const nowTimestamp = new Date().getTime();
             if ((nowTimestamp - lastInt) > 10 * 60 * 1000) {
                 currentState = 'INIT';
                 context = {};
                 await sendWhatsAppMessage(from, "عذراً، انتهت مدة الجلسة. الرجاء إرسال كلمة 'تسجيل' للبدء من جديد.");
             }
        }

        const msg_text = msg_body.trim().toLowerCase();

        if (msg_text === 'تسجيل' || msg_text === 'الغاء' || msg_text === 'رجوع') {
            currentState = 'INIT';
            context = {};
        }

        // --- State Machine ---
        if (currentState === 'INIT') {
            if (msg_text === 'تسجيل') {
                const { data: doctors } = await supabase.from('doctors').select('*');
                if (!doctors || doctors.length === 0) {
                   await sendWhatsAppMessage(from, "لا يوجد أطباء متاحين حالياً.");
                   return;
                }
                
                let docList = "أهلاً بك في مستشفى برج الأطباء.\nالرجاء إرسال رقم الطبيب الذي تريد التسجيل لديه:\n\n";
                doctors.forEach((d: any, idx: number) => {
                    docList += `${idx + 1}- د. ${d.name} (${d.speciality})\n`;
                });
                
                await supabase.from('bot_sessions').upsert({
                    phone_number: from,
                    state: 'EXPECTING_DOCTOR',
                    context: { doctors: doctors },
                    last_interaction_at: new Date().toISOString()
                });
                
                await sendWhatsAppMessage(from, docList);
            }
        } 
        else if (currentState === 'EXPECTING_DOCTOR') {
            const docIndex = parseInt(msg_text) - 1;
            const docs = context.doctors;
            if (isNaN(docIndex) || docIndex < 0 || docIndex >= docs.length) {
                await sendWhatsAppMessage(from, "رقم غير صحيح، الرجاء اختيار رقم الطبيب من القائمة.");
                return;
            }
            
            const selectedDoc = docs[docIndex];
            const { data: shifts } = await supabase.from('schedules').select('shift').eq('doctor_id', selectedDoc.id);
            
            const uniqueShifts = Array.from(new Set(shifts?.map(s => s.shift) || []));
            context.selectedDoctor = selectedDoc;
            context.shifts = uniqueShifts;

            if (uniqueShifts.length > 1) {
                await supabase.from('bot_sessions').update({
                    state: 'EXPECTING_SHIFT',
                    context: context,
                    last_interaction_at: new Date().toISOString()
                }).eq('phone_number', from);
                
                let shiftText = "الطبيب متاح في فترتين، يرجى اختيار الفترة:\n";
                uniqueShifts.forEach((s: any, idx: number) => {
                     shiftText += `${idx + 1}. ${s}\n`;
                });
                await sendWhatsAppMessage(from, shiftText);
            } else if (uniqueShifts.length === 1) {
                context.selectedShift = uniqueShifts[0];
                await supabase.from('bot_sessions').update({
                    state: 'EXPECTING_DAY',
                    context: context,
                    last_interaction_at: new Date().toISOString()
                }).eq('phone_number', from);
                await sendWhatsAppMessage(from, "الرجاء اختيار يوم الحجز. مثال: السبت, الاحد...");
            } else {
                await sendWhatsAppMessage(from, "لا يوجد جدول متاح لهذا الطبيب حالياً.");
            }
        }
        else if (currentState === 'EXPECTING_SHIFT') {
            const shiftIndex = parseInt(msg_text) - 1;
            if (isNaN(shiftIndex) || shiftIndex < 0 || shiftIndex >= (context.shifts?.length || 0)) {
                await sendWhatsAppMessage(from, "اختيار غير صحيح.");
                return;
            }
            context.selectedShift = context.shifts[shiftIndex];
            await supabase.from('bot_sessions').update({
                state: 'EXPECTING_DAY',
                context: context,
                last_interaction_at: new Date().toISOString()
            }).eq('phone_number', from);
            await sendWhatsAppMessage(from, "الرجاء اختيار يوم الحجز. يمكنك كتابة اليوم كـ 'السبت، الاحد، الاثنين...'");
        }
        else if (currentState === 'EXPECTING_DAY') {
            // Map day string to integer and date...
            // Note: Simplification for demonstration. A robust solution needs NLP or exact matching.
            const validDays: any = { "الاحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الاربعاء": 3, "الخميس": 4, "الجمعة": 5, "السبت": 6, "الأحد": 0, "الإثنين": 1 };
            
            let selectedDayNum = validDays[msg_text];
            if (selectedDayNum === undefined) {
                 await sendWhatsAppMessage(from, "عذراً، الرجاء اختيار يوم صحيح.");
                 return;
            }

            const { data: schedule } = await supabase.from('schedules')
                 .select('*')
                 .eq('doctor_id', context.selectedDoctor.id)
                 .eq('shift', context.selectedShift)
                 .eq('day_of_week', selectedDayNum)
                 .single();

            if (!schedule) {
                 await sendWhatsAppMessage(from, "عذراً، الرجاء اختيار يوم من الأيام المحددة لعيادة الطبيب.");
                 return;
            }

            if (schedule.available_capacity <= 0) {
                 await sendWhatsAppMessage(from, "اكتمل التسجيل في هذا اليوم، الرجاء اختيار يوم آخر.");
                 return;
            }

            // Anti Spam Check
            if (context.selectedDoctor.limit_to_two_patients) {
                 const { data: existingBookings } = await supabase.from('bookings')
                     .select('id')
                     .eq('doctor_id', context.selectedDoctor.id)
                     .eq('phone_number', from);
                 if (existingBookings && existingBookings.length >= 2) {
                     await sendWhatsAppMessage(from, "نعتذر، لقد وصلت للحد الأقصى المسموح به للتسجيل من هذا الرقم لهذا الطبيب.");
                     return; 
                 }
            }

            // Calculate date
            const today = new Date();
            let targetDate = new Date(today);
            targetDate.setDate(today.getDate() + ((selectedDayNum + 7 - today.getDay()) % 7));
            if (targetDate < today && targetDate.getDay() !== today.getDay()) {
                targetDate.setDate(targetDate.getDate() + 7);
            }
            
            context.scheduleId = schedule.id;
            context.bookingDate = format(targetDate, 'yyyy-MM-dd');
            context.dayName = msg_text;

            await supabase.from('bot_sessions').update({
                state: 'EXPECTING_NAME',
                context: context,
                last_interaction_at: new Date().toISOString()
            }).eq('phone_number', from);

            await sendWhatsAppMessage(from, "يوجد متسع، الرجاء كتابة اسم المريض الرباعي لتأكيد الحجز.");
        }
        else if (currentState === 'EXPECTING_NAME') {
            const patientName = msg_body.trim();
            
            // Check Duplicate for exactly same doctor / same date
            const { data: dupCheck } = await supabase.from('bookings')
                .select('id')
                .eq('doctor_id', context.selectedDoctor.id)
                .eq('booking_date', context.bookingDate)
                .eq('patient_name', patientName)
                .single();
                
            if (dupCheck) {
                await sendWhatsAppMessage(from, "هذا الاسم مسجل مسبقاً، يرجى كتابة الاسم الثلاثي أو إضافة اللقب.");
                return;
            }

            // Assign Queue Number
            const { data: currentSchedule } = await supabase.from('schedules').select('max_capacity, available_capacity').eq('id', context.scheduleId).single();
            const queueNumber = (currentSchedule?.max_capacity || 20) - (currentSchedule?.available_capacity || 20) + 1;

            // Save Booking
            const yemenTimeNow = toZonedTime(new Date(), 'Asia/Aden');
            const deadline = addDays(yemenTimeNow, 2);

            const { error: insertErr } = await supabase.from('bookings').insert({
                doctor_id: context.selectedDoctor.id,
                schedule_id: context.scheduleId,
                patient_name: patientName,
                phone_number: from,
                booking_date: context.bookingDate,
                queue_number: queueNumber,
                shift: context.selectedShift,
                deadline_date: deadline.toISOString()
            });

            if (insertErr) {
                 console.error(insertErr);
                 await sendWhatsAppMessage(from, "حدث خطأ أثناء حفظ الحجز. الرجاء المحاولة لاحقاً.");
                 return;
            }

            // Decrement Capacity
            await supabase.rpc('decrement_capacity', { row_id: context.scheduleId });
            // Or simpler direct update if rpc is not there:
            await supabase.from('schedules').update({ available_capacity: currentSchedule!.available_capacity - 1 }).eq('id', context.scheduleId);

            // Number enclosed icon map 
            const circleNumbers = ["⓪","❶","❷","❸","❹","❺","❻","❼","❽","❾","❿","⓫","⓬","⓭","⓮","⓯","⓰","⓱","⓲","⓳","⓴"];
            const qStr = queueNumber <= 20 ? circleNumbers[queueNumber] : `*${queueNumber}*`;

            const confirmText = `تم تأكيد الحجز بنجاح،
الاسم: ${patientName}
رقمك هو: ${qStr}
الفترة: ${context.selectedShift}
موعدك هو: ( ${context.dayName} ) ( ${context.bookingDate} )
نتمنى لكم دوام الصحة والعافية. 

(يرجى تأكيد الحجز بواسطة دفع رسوم التسجيل خلال يومين من هذا التاريخ ${formatTz(deadline, 'yyyy-MM-dd HH:mm', { timeZone: 'Asia/Aden' })}، وإلا سيعتبر الحجز لاغياً، وشكراً).`;

            await sendWhatsAppMessage(from, confirmText);

            // Cleanup session
            await supabase.from('bot_sessions').delete().eq('phone_number', from);
        }
      }
    }
  });

  // ========== CRON ENDPOINTS ==========
  app.get("/api/cron/reset-weekly", async (req, res) => {
     // Expected to be called by cron-jobs.org or vercel cron on Thursday 10:00 PM
     const { error } = await supabase.rpc('reset_weekly_schedules');
     if (error) return res.status(500).json({ error: error.message });
     res.json({ success: true, message: "Weekly schedules reset." });
  });

  app.get("/api/cron/cleanup-bookings", async (req, res) => {
      const now = new Date().toISOString();
      const { data: bookings } = await supabase.from('bookings').select('*').eq('payment_status', 'pending').lt('deadline_date', now);
      
      if (bookings && bookings.length > 0) {
          for (let b of bookings) {
              await supabase.from('bookings').update({ payment_status: 'cancelled' }).eq('id', b.id);
              // Increment capacity
              const { data: sched } = await supabase.from('schedules').select('available_capacity').eq('id', b.schedule_id).single();
              if (sched) {
                  await supabase.from('schedules').update({ available_capacity: sched.available_capacity + 1 }).eq('id', b.schedule_id);
              }
          }
      }
      res.json({ success: true, count: bookings?.length || 0 });
  });

  app.get("/api/test-error", (req, res, next) => {
    next(new Error("Test error"));
  });

  // Global Error Handler for API routes
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error("API Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Catch-all for unhandled API routes (prevents HTML fallback)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
