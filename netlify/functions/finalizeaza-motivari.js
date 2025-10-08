const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Funcție pentru a calcula zilele școlare reale (exclude weekend-uri și zile libere)
async function calculeazaZileScolare(dataInceput, dataSfarsit) {
  const start = new Date(dataInceput);
  const end = new Date(dataSfarsit);

  // Obține toate zilele libere din perioada respectivă
  const { data: zileLibereBD, error } = await supabase
    .from('zile_libere')
    .select('data_inceput, data_sfarsit')
    .or(
      `and(data_inceput.lte.${dataSfarsit},data_sfarsit.gte.${dataInceput}),and(data_inceput.lte.${dataSfarsit},data_sfarsit.is.null,data_inceput.gte.${dataInceput})`
    );

  if (error) {
    console.error('Eroare la obținerea zilelor libere:', error);
    // Continuă fără zile libere dacă e eroare
  }

  // Creează un Set cu toate zilele libere pentru verificare rapidă
  const zileLiberSet = new Set();
  if (zileLibereBD) {
    zileLibereBD.forEach((zl) => {
      const startLiber = new Date(zl.data_inceput);
      const endLiber = zl.data_sfarsit ? new Date(zl.data_sfarsit) : new Date(zl.data_inceput);

      for (let d = new Date(startLiber); d <= endLiber; d.setDate(d.getDate() + 1)) {
        zileLiberSet.add(d.toISOString().split('T')[0]);
      }
    });
  }

  // Numără zilele școlare (luni-vineri, exclus zile libere)
  let zileScolare = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ziua = d.getDay();
    const dataString = d.toISOString().split('T')[0];

    // Verifică dacă e zi lucrătoare (luni-vineri) ȘI nu e zi liberă
    if (ziua >= 1 && ziua <= 5 && !zileLiberSet.has(dataString)) {
      zileScolare++;
    }
  }

  return zileScolare;
}

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

    // Obține motivările selectate
    const { data: motivari, error: motivariError } = await supabase
      .from('motivari')
      .select('id, elev_id, tip_motivare, perioada_inceput, perioada_sfarsit, ore_scazute')
      .in('id', motivariIds);

    if (motivariError) throw motivariError;

    // Recalculează ore_scazute pentru fiecare motivare de tip invoire_lunga
    const motivariCuOreActualizate = await Promise.all(
      motivari.map(async (motivare) => {
        if (motivare.tip_motivare === 'invoire_lunga') {
          const zileScolare = await calculeazaZileScolare(
            motivare.perioada_inceput,
            motivare.perioada_sfarsit || motivare.perioada_inceput
          );
          return {
            ...motivare,
            ore_scazute: zileScolare * 6, // 6 ore pe zi
          };
        }
        return motivare;
      })
    );

    // Actualizează ore_scazute pentru fiecare motivare de tip invoire_lunga
    for (const motivare of motivariCuOreActualizate) {
      if (motivare.tip_motivare === 'invoire_lunga') {
        await supabase
          .from('motivari')
          .update({ ore_scazute: motivare.ore_scazute })
          .eq('id', motivare.id);
      }
    }

    // Actualizează statusul tuturor motivărilor selectate
    const { error: updateError } = await supabase
      .from('motivari')
      .update({
        status: 'finalizata',
        procesat_la: new Date().toISOString(),
      })
      .in('id', motivariIds);

    if (updateError) throw updateError;

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
