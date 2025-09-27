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
    const { motivareId, status } = JSON.parse(event.body);

    // Actualizează statusul motivării
    const { error } = await supabase
      .from('motivari')
      .update({
        status: status,
        procesat_la: new Date().toISOString(),
      })
      .eq('id', motivareId);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Motivarea a fost ${status === 'aprobata' ? 'aprobată' : 'respinsă'}`,
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
