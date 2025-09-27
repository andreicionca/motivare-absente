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
    const motivareData = JSON.parse(event.body);

    // Validări obligatorii
    if (!motivareData.elev_id || !motivareData.tip_motivare || !motivareData.perioada_inceput) {
      throw new Error('Date incomplete pentru motivare');
    }

    if (!motivareData.url_imagine) {
      throw new Error('Documentul este obligatoriu pentru motivări');
    }

    // Pregătește datele pentru inserare
    const insertData = {
      elev_id: motivareData.elev_id,
      tip_motivare: motivareData.tip_motivare,
      perioada_inceput: motivareData.perioada_inceput,
      perioada_sfarsit: motivareData.perioada_sfarsit || null,
      motiv: motivareData.motiv || null,
      url_imagine: motivareData.url_imagine,
      trimis_de: motivareData.trimis_de,
      ore_scazute: motivareData.ore_scazute || 0,
      status: 'in_asteptare',
    };

    // Inserează motivarea în baza de date
    const { data, error } = await supabase.from('motivari').insert(insertData).select().single();

    if (error) {
      throw new Error(`Eroare inserare motivare: ${error.message}`);
    }

    // Actualizează orele personale folosite DOAR pentru invoirile lungi
    if (insertData.ore_scazute > 0 && insertData.tip_motivare === 'invoire_lunga') {
      // Citește orele curente ale elevului
      const { data: elevData, error: fetchError } = await supabase
        .from('elevi')
        .select('ore_personale_folosite')
        .eq('id', motivareData.elev_id)
        .single();

      if (fetchError) {
        console.error('Eroare citire ore elev:', fetchError);
      } else {
        // Calculează noile ore
        const oreActuale = elevData.ore_personale_folosite || 0;
        const oreNoi = oreActuale + insertData.ore_scazute;

        // Actualizează orele în baza de date
        const { error: updateError } = await supabase
          .from('elevi')
          .update({ ore_personale_folosite: oreNoi })
          .eq('id', motivareData.elev_id);

        if (updateError) {
          console.error('Eroare actualizare ore elev:', updateError);
          // Nu aruncăm eroare aici pentru că motivarea s-a salvat deja
        } else {
          console.log(
            `Ore actualizate pentru elevul ${motivareData.elev_id}: ${oreActuale} -> ${oreNoi}`
          );
        }
      }
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
