/**
 * Generates a unique institute ID in the format: CDIDBYFG34GD
 * Format: 12 characters, alphanumeric, uppercase
 */
export const generateInstituteId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

