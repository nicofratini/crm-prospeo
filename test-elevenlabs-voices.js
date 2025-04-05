import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testListVoices() {
  try {
    console.log('Testing list-elevenlabs-voices function...');
    
    const { data, error } = await supabase.functions.invoke('list-elevenlabs-voices');

    if (error) {
      console.error('Error invoking function:', error);
      return;
    }

    console.log('Response:', data);
    
    if (!data.voices || !Array.isArray(data.voices)) {
      console.error('Invalid response format - expected voices array');
      return;
    }

    console.log(`Successfully retrieved ${data.voices.length} voices`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testListVoices();