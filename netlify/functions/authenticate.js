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
    const { role, credentials } = JSON.parse(event.body);

    if (role === 'diriginte') {
      // Autentificare diriginte cu email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      // Verifică dacă e diriginte în baza de date
      const { data: diriginte, error: diriginteError } = await supabase
        .from('diriginti')
        .select('*')
        .eq('email', credentials.email)
        .single();

      if (diriginteError || !diriginte) {
        throw new Error('Nu sunteți înregistrat ca diriginte');
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: 'diriginte',
            nume: diriginte.nume,
            prenume: diriginte.prenume,
            clasa: diriginte.clasa,
          },
        }),
      };
    } else {
      // Autentificare elev/părinte cu nume + cod
      let userData;

      if (role === 'elev') {
        const { data, error } = await supabase
          .from('elevi')
          .select('*')
          .eq('nume', credentials.nume)
          .eq('cod_personal', credentials.cod)
          .single();

        if (error || !data) {
          throw new Error('Date de autentificare incorecte');
        }
        userData = data;
      } else {
        const { data, error } = await supabase
          .from('parinti')
          .select(
            `
                        *,
                        elev:elevi(id, nume, prenume, clasa)
                    `
          )
          .eq('nume', credentials.nume)
          .eq('cod_personal', credentials.cod)
          .single();

        if (error || !data) {
          throw new Error('Date de autentificare incorecte');
        }
        userData = data;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            id: userData.id,
            role: role,
            nume: userData.nume,
            prenume: userData.prenume,
            clasa: role === 'elev' ? userData.clasa : userData.elev.clasa,
            elevId: role === 'parinte' ? userData.elev_id : userData.id,
          },
        }),
      };
    }
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
