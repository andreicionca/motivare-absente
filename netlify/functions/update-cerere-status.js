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
    const { cerereId, status } = JSON.parse(event.body);

    const updateData = {
      status: status,
    };

    if (status === 'acceptata_diriginte') {
      updateData.acceptata_diriginte_la = new Date().toISOString();
    }

    const { error } = await supabase
      .from('cereri_invoire_scurta')
      .update(updateData)
      .eq('id', cerereId);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Status cerere actualizat cu succes',
      }),
    };
  } catch (error) {
    console.error('Eroare actualizare status cerere:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
