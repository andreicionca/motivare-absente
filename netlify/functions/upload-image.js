const cloudinary = require('cloudinary').v2;
// ❌ ȘTERGE: const formidable = require('formidable'); - Nu e folosit!

// Configurare Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event, context) => {
  // Doar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parsează imaginea din body (base64)
    const { image, filename } = JSON.parse(event.body);

    if (!image) {
      throw new Error('Nicio imagine trimisă');
    }

    // Upload la Cloudinary cu optimizări automate
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'motivari-scolare', // Organizează într-un folder
      resource_type: 'auto',

      // 🔥 OPTIMIZĂRI AUTOMATE
      quality: 'auto:eco', // Compresia automată (reduce 50-70%)
      format: 'jpg', // Convertește tot în JPG (inclusiv HEIC)

      // Limitează dimensiunea maximă
      transformation: [
        {
          width: 1920,
          height: 1920,
          crop: 'limit',
          quality: 70,
          flags: 'progressive',
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes,
      }),
    };
  } catch (error) {
    console.error('❌ Eroare upload Cloudinary:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Eroare upload imagine',
      }),
    };
  }
};
