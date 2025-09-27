// js/config.js

// Configurări pentru deployment pe Netlify
// Valorile vor fi înlocuite automat cu Environment Variables
const SUPABASE_CONFIG = {
  url: 'SUPABASE_URL_PLACEHOLDER',
  anonKey: 'SUPABASE_ANON_KEY_PLACEHOLDER',
};

const CLOUDINARY_CONFIG = {
  cloudName: 'dwn9uyndj',
  uploadPreset: 'motivari_upload', // Fără API key/secret pentru securitate
};

// Configurări aplicație
const APP_CONFIG = {
  appName: 'Motivări Școlare',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'heic'],
  oreLucruZi: 6,
  oreLimitaPersonale: 42,
};

// Statusuri și tipuri (rămân la fel)
const STATUS_MOTIVARI = {
  IN_ASTEPTARE: 'in_asteptare',
  APROBATA: 'aprobata',
  RESPINSA: 'respinsa',
  FINALIZATA: 'finalizata',
};

const TIPURI_MOTIVARI = {
  MEDICALA: 'medicala',
  INVOIRE_SCURTA_PERSONAL: 'invoire_scurta_personal',
  INVOIRE_SCURTA_MEDICAL: 'invoire_scurta_medical',
  INVOIRE_LUNGA: 'invoire_lunga',
};

window.Config = {
  SUPABASE_CONFIG,
  CLOUDINARY_CONFIG,
  APP_CONFIG,
  STATUS_MOTIVARI,
  TIPURI_MOTIVARI,
};
