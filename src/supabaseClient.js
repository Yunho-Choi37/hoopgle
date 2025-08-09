import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwggbjyuuhtnrxdhzofo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Z2dianl1dWh0bnJ4ZGh6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODgyMTYsImV4cCI6MjA2NzI2NDIxNn0.a0eIxwPj8GEZNChQxIIm5622bPIqRg7pTXeqTrX5riI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
