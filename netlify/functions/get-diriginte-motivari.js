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
    const { clasa } = JSON.parse(event.body);

    // Încarcă toate motivările pentru clasa dirigintelui
    // În get-diriginte-motivari.js, înlocuiește query-ul:

    // Primul query - obține elevii din clasa dirigintelui
    const { data: elevi, error: eleviError } = await supabase
      .from('elevi')
      .select('id, nume, prenume')
      .eq('clasa', clasa);

    if (eleviError) throw eleviError;

    const eleviIds = elevi.map((e) => e.id);

    if (eleviIds.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      };
    }

    // Al doilea query - obține motivările pentru acești elevi
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
