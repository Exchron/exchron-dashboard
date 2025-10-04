// Descriptions for Kepler dataset features to provide educational context
export const keplerFeatureDescriptions: Record<string, string> = {
  'koi_disposition': 'Final disposition of the Kepler Object of Interest (CONFIRMED, CANDIDATE, FALSE POSITIVE)',
  'kepid': 'Kepler Input Catalog identifier for the host star',
  'kepoi_name': 'Kepler Object of Interest designation',
  'koi_pdisposition': 'Pipeline disposition of the KOI',
  'koi_score': 'Disposition score from 0 to 1, where 1 indicates high confidence',
  'koi_period': 'Orbital period of the planet candidate in days',
  'koi_impact': 'Sky-plane impact parameter - measure of how centered the transit is',
  'koi_duration': 'Transit duration in hours',
  'koi_depth': 'Transit depth in parts per million (ppm)',
  'koi_prad': 'Planetary radius in Earth radii',
  'koi_teq': 'Equilibrium temperature of the planet in Kelvin',
  'koi_insol': 'Insolation flux received by the planet (Earth = 1)',
  'koi_model_snr': 'Signal-to-noise ratio of the transit detection',
  'koi_steff': 'Stellar effective temperature in Kelvin',
  'koi_slogg': 'Stellar surface gravity (log g)',
  'koi_srad': 'Stellar radius in solar radii',
  'koi_kepmag': 'Kepler magnitude of the host star',
  'ra': 'Right ascension of the host star in degrees',
  'dec': 'Declination of the host star in degrees',
  'koi_time0bk': 'Transit epoch in Barycentric Kepler Julian Day',
  'koi_tce_plnt_num': 'Planet number for multi-planet systems',
  'is_confirmed': 'Binary flag indicating if the planet is confirmed (1) or not (0)',
  'any_false_positive_flag': 'Binary flag indicating presence of any false positive flags',
  'koi_period_log': 'Logarithm of the orbital period',
  'koi_prad_log': 'Logarithm of the planetary radius',
  'koi_teq_log': 'Logarithm of the equilibrium temperature',
  // False positive flags
  'koi_fpflag_nt': 'Not transit-like flag',
  'koi_fpflag_ss': 'Stellar eclipse flag', 
  'koi_fpflag_co': 'Centroid offset flag',
  'koi_fpflag_ec': 'Ephemeris match flag'
};

export const getFeatureDescription = (featureName: string): string => {
  return keplerFeatureDescriptions[featureName] || 'No description available for this feature';
};

export const getFeatureCategory = (featureName: string): string => {
  if (featureName.includes('koi_steff') || featureName.includes('koi_slogg') || featureName.includes('koi_srad') || featureName.includes('koi_kepmag')) {
    return 'Stellar Properties';
  }
  if (featureName.includes('koi_prad') || featureName.includes('koi_teq') || featureName.includes('koi_insol')) {
    return 'Planetary Properties';
  }
  if (featureName.includes('koi_period') || featureName.includes('koi_duration') || featureName.includes('koi_depth') || featureName.includes('koi_impact')) {
    return 'Orbital Properties';
  }
  if (featureName.includes('fpflag') || featureName.includes('disposition') || featureName.includes('score')) {
    return 'Detection Quality';
  }
  if (featureName.includes('ra') || featureName.includes('dec') || featureName.includes('time0bk')) {
    return 'Position & Timing';
  }
  return 'Other';
};