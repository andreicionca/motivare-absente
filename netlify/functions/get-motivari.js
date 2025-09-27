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
    const { elevId, action } = JSON.parse(event.body);

    if (action === 'get-user-data') {
      // Încarcă datele elevului
      const { data: elevData, error } = await supabase
        .from('elevi')
        .select('ore_personale_folosite')
        .eq('id', elevId)
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: elevData,
        }),
      };
    }

    if (action === 'get-motivari') {
      // Încarcă motivările
      const { data, error } = await supabase
        .from('motivari')
        .select('*')
        .eq('elev_id', elevId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: data || [],
        }),
      };
    }

    if (action === 'delete-motivare') {
      const { motivareId } = JSON.parse(event.body);

      const { error } = await supabase.from('motivari').delete().eq('id', motivareId);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
        }),
      };
    }

    throw new Error('Acțiune necunoscută');
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
