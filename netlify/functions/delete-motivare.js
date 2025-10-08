// netlify/functions/delete-motivare.js

const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Funcție îmbunătățită pentru extragerea public_id
function extractPublicId(cloudinaryUrl) {
  // URL format: https://res.cloudinary.com/dwn9uyndj/image/upload/v1234567890/motivari/abc123.jpg
  const parts = cloudinaryUrl.split('/upload/');
  if (parts.length !== 2) return null;

  // Extrage tot după /upload/ (ex: "v1234567890/motivari/abc123.jpg")
  const pathWithVersion = parts[1];
  const pathParts = pathWithVersion.split('/');

  // Elimină versiunea (v1234567890) și reconstruiește path-ul
  const withoutVersion = pathParts.filter((p) => !p.startsWith('v'));

  // Dacă e în folder: ["motivari", "abc123.jpg"]
  if (withoutVersion.length > 1) {
    const folder = withoutVersion.slice(0, -1).join('/');
    const filename = withoutVersion[withoutVersion.length - 1].split('.')[0];
    return `${folder}/${filename}`; // Returnează "motivari/abc123"
  }

  // Dacă e direct fără folder: ["abc123.jpg"]
  return withoutVersion[0].split('.')[0]; // Returnează "abc123"
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { motivareId } = JSON.parse(event.body);

    // 1️⃣ Obține URL-ul imaginii ÎNAINTE de a șterge din DB
    const { data: motivare, error: fetchError } = await supabase
      .from('motivari')
      .select('url_imagine')
      .eq('id', motivareId)
      .single();

    if (fetchError) throw new Error('Motivarea nu a fost găsită');

    // 2️⃣ Șterge imaginea din Cloudinary
    if (motivare.url_imagine) {
      const publicId = extractPublicId(motivare.url_imagine);

      if (publicId) {
        try {
          const result = await cloudinary.uploader.destroy(publicId);
          console.log(`✅ Imagine ștearsă din Cloudinary:`, result);
        } catch (cloudinaryError) {
          console.error('⚠️ Eroare ștergere Cloudinary:', cloudinaryError);
          // Continuă cu ștergerea din DB chiar dacă Cloudinary eșuează
        }
      }
    }

    // 3️⃣ Șterge din Supabase
    const { error: deleteError } = await supabase.from('motivari').delete().eq('id', motivareId);

    if (deleteError) throw deleteError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Motivarea și imaginea au fost șterse cu succes',
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
