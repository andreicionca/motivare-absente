const { createClient } = require('@supabase/supabase-js');
const { calculateOrePersonale } = require('./utils/calculateOrePersonale');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { elevId, action, motivareId } = JSON.parse(event.body);

    // ❌ ȘTERGE - nu mai e nevoie, calculăm dinamic
    // if (action === 'get-user-data') { ... }

    if (action === 'get-motivari') {
      // Încarcă doar motivările (cu imagini)
      const { data, error } = await supabase
        .from('motivari')
        .select('*')
        .eq('elev_id', elevId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: data || [],
        }),
      };
    }

    if (action === 'get-all-data') {
      // Încarcă atât motivări cât și cereri
      const [motivariResult, cereriResult] = await Promise.all([
        supabase
          .from('motivari')
          .select('*')
          .eq('elev_id', elevId)
          .order('created_at', { ascending: false }),
        supabase
          .from('cereri_invoire_scurta')
          .select('*')
          .eq('elev_id', elevId)
          .order('created_at', { ascending: false }),
      ]);

      if (motivariResult.error) throw motivariResult.error;
      if (cereriResult.error) throw cereriResult.error;

      const motivari = motivariResult.data || [];
      const cereri = cereriResult.data || [];

      // ✅ CALCULEAZĂ ORE PERSONALE FOLOSITE
      const orePersonaleFolosite = calculateOrePersonale(motivari, cereri);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            motivari,
            cereri,
            orePersonaleFolosite, // ✅ Adaugă aici
          },
        }),
      };
    }

    if (action === 'delete-motivare') {
      const { error } = await supabase.from('motivari').delete().eq('id', motivareId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
        }),
      };
    }

    throw new Error('Acțiune necunoscută');
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
