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

// Statusuri motivări (cu imagine)
const STATUS_MOTIVARI = {
  IN_ASTEPTARE: 'in_asteptare',
  APROBATA: 'aprobata',
  RESPINSA: 'respinsa',
  FINALIZATA: 'finalizata',
};

// Statusuri cereri învoire scurtă (formular)
const STATUS_CERERI = {
  CERERE_TRIMISA: 'cerere_trimisa',
  APROBATA_PARINTE: 'aprobata_parinte',
  ACCEPTATA_DIRIGINTE: 'acceptata_diriginte',
  RESPINSA: 'respinsa',
  FINALIZATA: 'finalizata',
};

// Tipuri motivări (cu imagine)
const TIPURI_MOTIVARI = {
  MEDICALA_CLASICA: 'medicala_clasica',
  INVOIRE_LUNGA: 'invoire_lunga',
  ALTE_MOTIVE: 'alte_motive',
};

// Tipuri cereri învoire scurtă (formular)
const TIPURI_CERERI = {
  PERSONAL: 'personal',
  MEDICAL_URGENT: 'medical_urgent',
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
  STATUS_CERERI,
  TIPURI_MOTIVARI,
  TIPURI_CERERI,
  CLOUDINARY_CONFIG,
};
