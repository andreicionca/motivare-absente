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
    const cerereData = JSON.parse(event.body);

    // Calculează ore scăzute bazat pe tipul cererii
    const oreScazute = cerereData.tip_cerere === 'personal' ? cerereData.ore_solicitate : 0;

    // Adaugă ore_scazute la datele cererii
    const insertData = {
      ...cerereData,
      ore_scazute: oreScazute,
    };

    // Inserează cererea în baza de date
    const { error } = await supabase.from('cereri_invoire_scurta').insert(insertData);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Cererea a fost trimisă cu succes',
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
