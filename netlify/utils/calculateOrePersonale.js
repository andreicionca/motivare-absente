function calculateOrePersonale(motivari, cereri) {
  const oreMotivari = motivari
    .filter((m) => m.tip_motivare === 'invoire_lunga' && m.status === 'finalizata')
    .reduce((total, m) => total + (m.ore_scazute || 0), 0);

  const oreCereri = cereri
    .filter((c) => c.tip_cerere === 'personal' && c.status === 'finalizata')
    .reduce((total, c) => total + (c.ore_scazute || 0), 0);

  return oreMotivari + oreCereri;
}

module.exports = { calculateOrePersonale };
