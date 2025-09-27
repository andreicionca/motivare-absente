// js/config.js

// Configurări aplicație
const APP_CONFIG = {
  appName: 'Motivări Școlare',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'heic'],
  oreLucruZi: 6,
  oreLimitaPersonale: 42,
  apiBase: '/.netlify/functions', // Base URL pentru functions
};

// Statusuri motivări
const STATUS_MOTIVARI = {
  IN_ASTEPTARE: 'in_asteptare',
  APROBATA: 'aprobata',
  RESPINSA: 'respinsa',
  FINALIZATA: 'finalizata',
};

// Tipuri motivări
const TIPURI_MOTIVARI = {
  MEDICALA: 'medicala',
  INVOIRE_SCURTA_PERSONAL: 'invoire_scurta_personal',
  INVOIRE_SCURTA_MEDICAL: 'invoire_scurta_medical',
  INVOIRE_LUNGA: 'invoire_lunga',
};

// Cloudinary (public, safe în browser)
const CLOUDINARY_CONFIG = {
  cloudName: 'dwn9uyndj',
  uploadPreset: 'motivari_upload',
};

// Export global
window.Config = {
  APP_CONFIG,
  STATUS_MOTIVARI,
  TIPURI_MOTIVARI,
  CLOUDINARY_CONFIG,
};
