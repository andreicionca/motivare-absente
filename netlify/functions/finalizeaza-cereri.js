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
    const { cereriIds } = JSON.parse(event.body);

    if (!Array.isArray(cereriIds) || cereriIds.length === 0) {
      throw new Error('Lista de cereri este invalidă');
    }

    // Obține cererile selectate pentru a actualiza orele personale
    const { data: cereri, error: cereriError } = await supabase
      .from('cereri_invoire_scurta')
      .select('id, elev_id, tip_cerere, ore_scazute')
      .in('id', cereriIds);

    if (cereriError) throw cereriError;

    // Actualizează statusul cererilor la 'finalizata'
    const { error: updateError } = await supabase
      .from('cereri_invoire_scurta')
      .update({
        status: 'finalizata',
        acceptata_diriginte_la: new Date().toISOString(),
      })
      .in('id', cereriIds);

    if (updateError) throw updateError;

    // Actualizează ore_personale_folosite pentru fiecare elev
    // Doar pentru cereri de tip 'personal' care scad din cele 42 ore
    const eleviMap = new Map();

    cereri.forEach((cerere) => {
      if (cerere.tip_cerere === 'personal' && cerere.ore_scazute > 0) {
        if (eleviMap.has(cerere.elev_id)) {
          eleviMap.set(cerere.elev_id, eleviMap.get(cerere.elev_id) + cerere.ore_scazute);
        } else {
          eleviMap.set(cerere.elev_id, cerere.ore_scazute);
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
        message: `${cereriIds.length} cereri au fost finalizate cu succes`,
      }),
    };
  } catch (error) {
    console.error('Eroare finalizare cereri:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
