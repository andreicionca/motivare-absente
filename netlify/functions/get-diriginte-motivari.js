const { createClient } = require('@supabase/supabase-js');

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

    // Obține elevii din clasa dirigintelui
    const { data: elevi, error: eleviError } = await supabase
      .from('elevi')
      .select('id, nume, prenume, ore_personale_folosite')
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

    // Acțiune: get-elevi - returnează lista de elevi
    if (action === 'get-elevi') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            elevi: elevi,
          },
        }),
      };
    }

    // Acțiune: get-all-data - returnează motivări și cereri
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

      // Combină datele cu informațiile elevilor
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
    } else {
      // Compatibilitate cu versiunea veche - doar motivări
      const { data: motivari, error: motivariError } = await supabase
        .from('motivari')
        .select('*')
        .in('elev_id', eleviIds)
        .order('created_at', { ascending: false });

      if (motivariError) throw motivariError;

      // Combină datele
      const formattedData = motivari.map((motivare) => {
        const elev = elevi.find((e) => e.id === motivare.elev_id);
        return {
          ...motivare,
          elev_nume: elev.nume,
          elev_prenume: elev.prenume,
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: formattedData,
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
