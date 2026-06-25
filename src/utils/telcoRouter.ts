export const identifyTelco = (phoneNumber: string): 'MSPACE' | 'IDEAMART' => {
  // Strip spaces and common prefixes
  let formattedNumber = phoneNumber.replace(/\s+/g, '');
  
  if (formattedNumber.startsWith('+94')) {
    formattedNumber = '0' + formattedNumber.substring(3);
  } else if (formattedNumber.startsWith('94')) {
    formattedNumber = '0' + formattedNumber.substring(2);
  } else if (!formattedNumber.startsWith('0')) {
    formattedNumber = '0' + formattedNumber;
  }

  // Ensure it's a valid 10-digit number format before extracting prefix
  if (formattedNumber.length !== 10) {
    throw new Error('Unsupported or invalid Sri Lankan mobile number');
  }

  const prefix = formattedNumber.substring(0, 3);

  const mspacePrefixes = ['071', '070'];
  const ideamartPrefixes = ['077', '076', '074', '078', '072', '075'];

  if (mspacePrefixes.includes(prefix)) {
    return 'MSPACE';
  } else if (ideamartPrefixes.includes(prefix)) {
    return 'IDEAMART';
  }

  throw new Error('Unsupported or invalid Sri Lankan mobile number');
};
