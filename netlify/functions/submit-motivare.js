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
    const motivareData = JSON.parse(event.body);

    // Validări obligatorii
    if (!motivareData.elev_id || !motivareData.tip_motivare || !motivareData.perioada_inceput) {
      throw new Error('Date incomplete pentru motivare');
    }

    if (!motivareData.url_imagine) {
      throw new Error('Documentul este obligatoriu pentru motivări');
    }

    // Calculează ore_scazute corect pe backend
    let oreScazute = 0;
    if (motivareData.tip_motivare === 'invoire_lunga') {
      const zileScolare = await calculeazaZileScolare(
        motivareData.perioada_inceput,
        motivareData.perioada_sfarsit || motivareData.perioada_inceput
      );
      oreScazute = zileScolare * 6; // 6 ore pe zi
    }
    // Pentru medicala_clasica și alte_motive, ore_scazute = 0

    // Pregătește datele pentru inserare
    const insertData = {
      elev_id: motivareData.elev_id,
      tip_motivare: motivareData.tip_motivare,
      perioada_inceput: motivareData.perioada_inceput,
      perioada_sfarsit: motivareData.perioada_sfarsit || null,
      motiv: motivareData.motiv || null,
      url_imagine: motivareData.url_imagine,
      trimis_de: motivareData.trimis_de,
      ore_scazute: oreScazute,
      status: 'in_asteptare',
    };

    // Inserează motivarea în baza de date
    const { data, error } = await supabase.from('motivari').insert(insertData).select().single();

    if (error) {
      throw new Error(`Eroare inserare motivare: ${error.message}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Motivarea a fost trimisă cu succes',
        data: data,
      }),
    };
  } catch (error) {
    console.error('Eroare submit motivare:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
