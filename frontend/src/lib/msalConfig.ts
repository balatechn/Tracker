import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '2b20a887-0260-4199-b6b0-ebca15d4475a';
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || '944d20e2-8841-46b8-9ba6-b0b8d086757b';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error('[MSAL]', message);
      },
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication | null {
  if (!clientId || !tenantId) return null;
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}
