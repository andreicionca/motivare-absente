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

    // Inserează motivarea în baza de date
    const { error } = await supabase.from('motivari').insert(motivareData);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Motivarea a fost trimisă cu succes',
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
