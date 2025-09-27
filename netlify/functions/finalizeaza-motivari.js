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
    const { motivariIds } = JSON.parse(event.body);

    // Actualizează statusul tuturor motivărilor selectate
    const { error } = await supabase
      .from('motivari')
      .update({
        status: 'finalizata',
        procesat_la: new Date().toISOString(),
      })
      .in('id', motivariIds);

    if (error) throw error;

    // Actualizează și orele personale folosite pentru elevii afectați
    // Încarcă motivările finalizate pentru a calcula orele
    const { data: motivari, error: motivariError } = await supabase
      .from('motivari')
      .select('elev_id, ore_scazute')
      .in('id', motivariIds);

    if (motivariError) throw motivariError;

    // Grupează pe elev și calculează totalul de ore scăzute
    const orePerElev = {};
    motivari.forEach((motivare) => {
      if (!orePerElev[motivare.elev_id]) {
        orePerElev[motivare.elev_id] = 0;
      }
      orePerElev[motivare.elev_id] += motivare.ore_scazute || 0;
    });

    // Actualizează orele pentru fiecare elev
    for (const [elevId, oreScazute] of Object.entries(orePerElev)) {
      if (oreScazute > 0) {
        const { error: updateError } = await supabase.rpc('increment_ore_personale', {
          elev_id: parseInt(elevId),
          ore_amount: oreScazute,
        });

        if (updateError) {
          console.error('Eroare actualizare ore pentru elevul', elevId, updateError);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${motivariIds.length} motivări au fost finalizate`,
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
