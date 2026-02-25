'use strict';

const { SSOManager } = require('../../lib/enterprise/sso');

/** Helper: create a minimal JWT with given payload */
function makeJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = Buffer.from('fake-signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

/** Helper: create a minimal SAML assertion */
function makeSAML(nameId, issuer, attrs = {}) {
  let xml = `<saml:Assertion><saml:Issuer>${issuer}</saml:Issuer>`;
  xml += `<saml:Subject><saml:NameID>${nameId}</saml:NameID></saml:Subject>`;
  for (const [name, value] of Object.entries(attrs)) {
    xml += `<saml:Attribute Name="${name}"><saml:AttributeValue>${value}</saml:AttributeValue></saml:Attribute>`;
  }
  xml += `</saml:Assertion>`;
  return Buffer.from(xml).toString('base64');
}

describe('SSOManager', () => {
  let sso;

  beforeEach(() => {
    sso = new SSOManager();
  });

  test('starts with no providers or sessions', () => {
    expect(sso.listProviders()).toEqual([]);
    expect(sso.getActiveSessionCount()).toBe(0);
  });

  test('registerProvider adds OIDC provider', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta', issuer: 'https://okta.example.com', clientId: 'abc' });
    expect(sso.listProviders().length).toBe(1);
    expect(sso.getProvider('okta').name).toBe('Okta');
  });

  test('registerProvider adds SAML provider', () => {
    sso.registerProvider({ id: 'azure', type: 'saml', name: 'Azure AD', issuer: 'https://login.microsoft.com' });
    expect(sso.listProviders().length).toBe(1);
  });

  test('registerProvider rejects invalid type', () => {
    expect(() => sso.registerProvider({ id: 'x', type: 'ldap', name: 'X' })).toThrow('Unsupported');
  });

  test('registerProvider rejects missing id/type', () => {
    expect(() => sso.registerProvider({ name: 'X' })).toThrow('must have id and type');
  });

  test('removeProvider deletes a provider', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta' });
    expect(sso.removeProvider('okta')).toBe(true);
    expect(sso.getProvider('okta')).toBeNull();
  });

  test('validateOIDCToken validates correct JWT', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta', issuer: 'https://okta.com', clientId: 'myapp' });
    const token = makeJWT({
      sub: 'user123', iss: 'https://okta.com', aud: 'myapp',
      email: 'user@test.com', name: 'Test User', exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = sso.validateOIDCToken(token, 'okta');
    expect(result.valid).toBe(true);
    expect(result.claims.sub).toBe('user123');
    expect(result.claims.email).toBe('user@test.com');
  });

  test('validateOIDCToken rejects expired token', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta' });
    const token = makeJWT({ sub: 'user', iss: 'x', exp: 1000 }); // Expired long ago
    const result = sso.validateOIDCToken(token, 'okta');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  test('validateOIDCToken rejects issuer mismatch', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta', issuer: 'https://okta.com' });
    const token = makeJWT({ sub: 'user', iss: 'https://other.com' });
    const result = sso.validateOIDCToken(token, 'okta');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Issuer mismatch');
  });

  test('validateOIDCToken rejects invalid format', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta' });
    const result = sso.validateOIDCToken('not-a-jwt', 'okta');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JWT format');
  });

  test('validateOIDCToken rejects disabled provider', () => {
    sso.registerProvider({ id: 'okta', type: 'oidc', name: 'Okta', enabled: false });
    const token = makeJWT({ sub: 'user', iss: 'x' });
    const result = sso.validateOIDCToken(token, 'okta');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('disabled');
  });

  test('validateSAMLAssertion validates correct assertion', () => {
    sso.registerProvider({ id: 'azure', type: 'saml', name: 'Azure', issuer: 'https://azure.com' });
    const assertion = makeSAML('user@azure.com', 'https://azure.com', { email: 'user@azure.com', name: 'Azure User' });
    const result = sso.validateSAMLAssertion(assertion, 'azure');
    expect(result.valid).toBe(true);
    expect(result.claims.sub).toBe('user@azure.com');
  });

  test('validateSAMLAssertion rejects issuer mismatch', () => {
    sso.registerProvider({ id: 'azure', type: 'saml', name: 'Azure', issuer: 'https://azure.com' });
    const assertion = makeSAML('user', 'https://other.com');
    const result = sso.validateSAMLAssertion(assertion, 'azure');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Issuer mismatch');
  });

  test('createSession and getSession', () => {
    const session = sso.createSession({ sub: 'user1', email: 'u@t.com', name: 'User', roles: ['dev'] }, 'okta');
    expect(session.id).toBeDefined();
    expect(session.userId).toBe('user1');

    const fetched = sso.getSession(session.id);
    expect(fetched).not.toBeNull();
    expect(fetched.userId).toBe('user1');
  });

  test('getSession returns null for expired session', () => {
    sso.setSessionTTL(1); // 1ms TTL
    const session = sso.createSession({ sub: 'u', roles: [] }, 'p');
    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) {} // Busy wait 5ms
    expect(sso.getSession(session.id)).toBeNull();
  });

  test('destroySession removes session', () => {
    const session = sso.createSession({ sub: 'u', roles: [] }, 'p');
    expect(sso.destroySession(session.id)).toBe(true);
    expect(sso.getSession(session.id)).toBeNull();
  });

  test('getActiveSessionCount', () => {
    sso.createSession({ sub: 'u1', roles: [] }, 'p');
    sso.createSession({ sub: 'u2', roles: [] }, 'p');
    expect(sso.getActiveSessionCount()).toBe(2);
  });
});
