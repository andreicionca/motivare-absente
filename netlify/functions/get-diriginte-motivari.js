const { createClient } = require('@supabase/supabase-js');
const { calculateOrePersonale } = require('./utils/calculateOrePersonale'); // ✅ ADAUGĂ

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { clasa, action } = JSON.parse(event.body);

    // ✅ Șterge ore_personale_folosite din SELECT
    const { data: elevi, error: eleviError } = await supabase
      .from('elevi')
      .select('id, nume, prenume') // ✅ FĂRĂ ore_personale_folosite
      .eq('clasa', clasa)
      .order('nume', { ascending: true });

    if (eleviError) throw eleviError;

    const eleviIds = elevi.map((e) => e.id);

    if (eleviIds.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data:
            action === 'get-all-data'
              ? { motivari: [], cereri: [] }
              : action === 'get-elevi'
              ? { elevi: [] }
              : [],
        }),
      };
    }

    // Acțiune: get-elevi
    if (action === 'get-elevi') {
      // ✅ Ia TOATE motivările și cererile pentru calcul
      const [motivariResult, cereriResult] = await Promise.all([
        supabase.from('motivari').select('*').in('elev_id', eleviIds),
        supabase.from('cereri_invoire_scurta').select('*').in('elev_id', eleviIds),
      ]);

      if (motivariResult.error) throw motivariResult.error;
      if (cereriResult.error) throw cereriResult.error;

      // ✅ Calculează ore_personale_folosite pentru fiecare elev
      const eleviCuOre = elevi.map((elev) => {
        const motivariElev = motivariResult.data.filter((m) => m.elev_id === elev.id);
        const cereriElev = cereriResult.data.filter((c) => c.elev_id === elev.id);

        return {
          ...elev,
          ore_personale_folosite: calculateOrePersonale(motivariElev, cereriElev),
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            elevi: eleviCuOre, // ✅ Trimite cu ore calculate
          },
        }),
      };
    }

    // Acțiune: get-all-data
    if (action === 'get-all-data') {
      const [motivariResult, cereriResult] = await Promise.all([
        supabase
          .from('motivari')
          .select('*')
          .in('elev_id', eleviIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('cereri_invoire_scurta')
          .select('*')
          .in('elev_id', eleviIds)
          .order('created_at', { ascending: false }),
      ]);

      if (motivariResult.error) throw motivariResult.error;
      if (cereriResult.error) throw cereriResult.error;

      const formattedMotivari = motivariResult.data.map((motivare) => {
        const elev = elevi.find((e) => e.id === motivare.elev_id);
        return {
          ...motivare,
          elev_nume: elev.nume,
          elev_prenume: elev.prenume,
        };
      });

      const formattedCereri = cereriResult.data.map((cerere) => {
        const elev = elevi.find((e) => e.id === cerere.elev_id);
        return {
          ...cerere,
          elev_nume: elev.nume,
          elev_prenume: elev.prenume,
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            motivari: formattedMotivari,
            cereri: formattedCereri,
          },
        }),
      };
    }
  } catch (error) {
    console.error('Eroare get-diriginte-motivari:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
