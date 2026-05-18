-- Supabase SQL Schema Definitions
-- You must run this entire file in your Supabase SQL Editor.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now())
);

-- Enable RLS for profiles (optional but good practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. doctors table
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    speciality TEXT,
    allow_second_week BOOLEAN DEFAULT false,
    limit_to_two_patients BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now())
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Admin write access for doctors" ON public.doctors FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. schedules table
-- Day of week integer: Saturday = 6, Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week IN (0, 1, 2, 3, 4, 6)), 
    shift TEXT NOT NULL CHECK (shift IN ('صباحية', 'مسائية')),
    max_capacity INTEGER NOT NULL DEFAULT 20,
    available_capacity INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now())
);

-- 4. bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    booking_date DATE NOT NULL,
    queue_number INTEGER NOT NULL,
    shift TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now()),
    UNIQUE(doctor_id, booking_date, patient_name)
);

-- 5. settings table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_api_token TEXT,
    whatsapp_phone_number_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now())
);

-- Default settings row
INSERT INTO public.settings (id) VALUES (uuid_generate_v4());

-- 6. bot_sessions table for state machine tracking
CREATE TABLE public.bot_sessions (
    phone_number TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'INIT',
    context JSONB DEFAULT '{}'::jsonb,
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Aden', now())
);

-- 7. Stored Procedure to Reset Weekly Schedules
CREATE OR REPLACE FUNCTION public.reset_weekly_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset available capacity to max capacity
    UPDATE public.schedules
    SET available_capacity = max_capacity;
END;
$$;
