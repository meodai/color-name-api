import { createClient } from '@supabase/supabase-js';

let supabase;

export function initDatabase(supabaseUrl, supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export async function addResponseToTable({ paletteTitle, list, parsedColors }) {
  try {
    const { error } = await supabase
      .from('colorAPILiveResponses')
      .insert([{ paletteTitle, colorList: list, colors: parsedColors }]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.log('⚠️ Failed to update the table');
    console.log(error.message);
  }
}
