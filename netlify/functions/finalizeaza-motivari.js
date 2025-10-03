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

    if (!Array.isArray(motivariIds) || motivariIds.length === 0) {
      throw new Error('Lista de motivări este invalidă');
    }

    // Obține motivările selectate pentru a actualiza orele personale
    const { data: motivari, error: motivariError } = await supabase
      .from('motivari')
      .select('id, elev_id, tip_motivare, ore_scazute')
      .in('id', motivariIds);

    if (motivariError) throw motivariError;

    // Actualizează statusul tuturor motivărilor selectate
    const { error: updateError } = await supabase
      .from('motivari')
      .update({
        status: 'finalizata',
        procesat_la: new Date().toISOString(),
      })
      .in('id', motivariIds);

    if (updateError) throw updateError;

    // Actualizează ore_personale_folosite pentru fiecare elev
    // Doar pentru motivări de tip 'invoire_lunga' care scad din cele 42 ore
    const eleviMap = new Map();

    motivari.forEach((motivare) => {
      if (motivare.tip_motivare === 'invoire_lunga' && motivare.ore_scazute > 0) {
        if (eleviMap.has(motivare.elev_id)) {
          eleviMap.set(motivare.elev_id, eleviMap.get(motivare.elev_id) + motivare.ore_scazute);
        } else {
          eleviMap.set(motivare.elev_id, motivare.ore_scazute);
        }
      }
    });

    // Actualizează câmpul ore_personale_folosite pentru fiecare elev
    for (const [elevId, oreDeScos] of eleviMap) {
      // Obține valoarea curentă
      const { data: elev, error: elevError } = await supabase
        .from('elevi')
        .select('ore_personale_folosite')
        .eq('id', elevId)
        .single();

      if (elevError) throw elevError;

      // Actualizează cu noua valoare
      const { error: updateElevError } = await supabase
        .from('elevi')
        .update({
          ore_personale_folosite: (elev.ore_personale_folosite || 0) + oreDeScos,
        })
        .eq('id', elevId);

      if (updateElevError) throw updateElevError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${motivariIds.length} motivări au fost finalizate cu succes`,
      }),
    };
  } catch (error) {
    console.error('Eroare finalizare motivări:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
