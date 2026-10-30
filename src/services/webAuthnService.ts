import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export const registerBiometric = async (options: any) => {
  const credential = await startRegistration(options);
  return credential;
};

export const authenticateBiometric = async (options: any) => {
  const assertion = await startAuthentication(options);
  return assertion;
};
