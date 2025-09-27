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

    // Actualizează statusul cererilor la 'finalizata'
    const { error } = await supabase
      .from('cereri_invoire_scurta')
      .update({
        status: 'finalizata',
        acceptata_diriginte_la: new Date().toISOString(),
      })
      .in('id', cereriIds);

    if (error) throw error;

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
