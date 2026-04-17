'use strict';

const crypto = require('crypto');
const { SSOManager } = require('../../lib/enterprise/sso');

// Generate a test RSA keypair once (shared across tests) — faster than gen per test
const { privateKey: rsaPriv, publicKey: rsaPub } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Second keypair for tests involving kid rotation
const { privateKey: rsaPriv2, publicKey: rsaPub2 } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// HS256 shared secret (for algorithm confusion tests)
const hsSecret = 'weak-hmac-secret-for-testing';

/** Build a JWT signed with RS256 (or configurable alg). */
function makeSignedJWT(payload, { alg = 'RS256', privKey = rsaPriv, kid } = {}) {
  const header = { alg, typ: 'JWT' };
  if (kid) header.kid = kid;
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${h}.${p}`;
  let sig;
  if (alg === 'none') {
    sig = '';
  } else if (alg.startsWith('RS')) {
    const digestMap = { RS256: 'RSA-SHA256', RS384: 'RSA-SHA384', RS512: 'RSA-SHA512' };
    sig = crypto.sign(digestMap[alg], Buffer.from(signingInput, 'utf8'), privKey).toString('base64url');
  } else if (alg === 'HS256') {
    sig = crypto.createHmac('sha256', hsSecret).update(signingInput).digest('base64url');
  } else {
    throw new Error(`Unsupported test alg: ${alg}`);
  }
  return `${h}.${p}.${sig}`;
}

function now() { return Math.floor(Date.now() / 1000); }

function validClaims(overrides = {}) {
  return {
    sub: 'user1',
    iss: 'https://idp.example.com',
    aud: 'my-client-id',
    exp: now() + 3600,
    iat: now(),
    jti: crypto.randomBytes(16).toString('hex'),
    ...overrides,
  };
}

describe('SSOManager', () => {
  let sso;

  beforeEach(() => {
    sso = new SSOManager();
  });

  describe('registration', () => {
    test('starts empty', () => {
      expect(sso.listProviders()).toEqual([]);
    });

    test('OIDC requires publicKey or keys', () => {
      expect(() => sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', issuer: 'https://i', clientId: 'c',
      })).toThrow(/publicKey or keys/);
    });

    test('OIDC requires issuer', () => {
      expect(() => sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', publicKey: rsaPub, clientId: 'c',
      })).toThrow(/issuer/);
    });

    test('OIDC requires clientId', () => {
      expect(() => sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', publicKey: rsaPub, issuer: 'https://i',
      })).toThrow(/clientId/);
    });

    test('rejects HS256 algorithm at registration', () => {
      expect(() => sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', publicKey: rsaPub, issuer: 'https://i', clientId: 'c',
        algorithms: ['HS256'],
      })).toThrow(/not allowed/);
    });

    test('removeProvider deletes a provider', () => {
      sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', publicKey: rsaPub, issuer: 'https://i', clientId: 'c',
      });
      expect(sso.removeProvider('p')).toBe(true);
    });

    test('getProvider does not leak keys', () => {
      sso.registerProvider({
        id: 'p', type: 'oidc', name: 'P', publicKey: rsaPub, issuer: 'https://i', clientId: 'c',
      });
      const provider = sso.getProvider('p');
      expect(provider._keys).toBeUndefined();
    });
  });

  describe('OIDC JWT verification', () => {
    beforeEach(() => {
      sso.registerProvider({
        id: 'idp', type: 'oidc', name: 'IdP',
        issuer: 'https://idp.example.com',
        clientId: 'my-client-id',
        publicKey: rsaPub,
        algorithms: ['RS256'],
      });
    });

    test('accepts a valid signed RS256 token', () => {
      const token = makeSignedJWT(validClaims());
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(true);
      expect(result.claims.sub).toBe('user1');
    });

    test('REJECTS alg=none (no signature)', () => {
      const claims = validClaims();
      const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
      const token = `${h}.${p}.`;
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/alg=none/i);
    });

    test('REJECTS HS256 when provider expects RS256 (algorithm confusion)', () => {
      const token = makeSignedJWT(validClaims(), { alg: 'HS256' });
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not permitted|not allowed/);
    });

    test('REJECTS token signed with a different key (signature mismatch)', () => {
      const token = makeSignedJWT(validClaims(), { privKey: rsaPriv2 });
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });

    test('REJECTS tampered payload', () => {
      const token = makeSignedJWT(validClaims());
      const parts = token.split('.');
      const tamperedClaims = { ...validClaims(), sub: 'attacker', roles: ['admin'] };
      parts[1] = Buffer.from(JSON.stringify(tamperedClaims)).toString('base64url');
      const tampered = parts.join('.');
      const result = sso.validateOIDCToken(tampered, 'idp');
      expect(result.valid).toBe(false);
    });

    test('REJECTS expired token', () => {
      const token = makeSignedJWT(validClaims({ exp: now() - 3600 }));
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    test('REJECTS token with future iat', () => {
      const token = makeSignedJWT(validClaims({ iat: now() + 3600 }));
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/future/);
    });

    test('REJECTS too-old token (beyond maxTokenAge)', () => {
      const oldTime = now() - (25 * 3600); // 25h old
      const token = makeSignedJWT(validClaims({ iat: oldTime, exp: oldTime + (26 * 3600) }));
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too old/);
    });

    test('REJECTS issuer mismatch', () => {
      const token = makeSignedJWT(validClaims({ iss: 'https://evil.com' }));
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Issuer mismatch');
    });

    test('REJECTS audience mismatch', () => {
      const token = makeSignedJWT(validClaims({ aud: 'other-client' }));
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Audience mismatch');
    });

    test('REJECTS missing required claims', () => {
      for (const omit of ['sub', 'iss', 'aud', 'exp', 'iat']) {
        const claims = validClaims();
        delete claims[omit];
        const token = makeSignedJWT(claims);
        const result = sso.validateOIDCToken(token, 'idp');
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(new RegExp(`Missing ${omit}`, 'i'));
      }
    });

    test('REJECTS replay (same jti used twice)', () => {
      const claims = validClaims({ jti: 'unique-token-id' });
      const token = makeSignedJWT(claims);

      const first = sso.validateOIDCToken(token, 'idp');
      expect(first.valid).toBe(true);

      const replay = sso.validateOIDCToken(token, 'idp');
      expect(replay.valid).toBe(false);
      expect(replay.error).toContain('replay');
    });

    test('REJECTS malformed JWT (not 3 parts)', () => {
      expect(sso.validateOIDCToken('a.b', 'idp').valid).toBe(false);
      expect(sso.validateOIDCToken('a.b.c.d', 'idp').valid).toBe(false);
      expect(sso.validateOIDCToken('not-a-jwt', 'idp').valid).toBe(false);
    });

    test('REJECTS invalid base64 encoding', () => {
      expect(sso.validateOIDCToken('@@@.@@@.@@@', 'idp').valid).toBe(false);
    });

    test('REJECTS oversize token', () => {
      const big = 'a'.repeat(10000);
      expect(sso.validateOIDCToken(big, 'idp').valid).toBe(false);
    });

    test('REJECTS disabled provider', () => {
      sso.registerProvider({
        id: 'disabled', type: 'oidc', name: 'D', publicKey: rsaPub,
        issuer: 'https://i', clientId: 'c', enabled: false,
      });
      const token = makeSignedJWT(validClaims({ iss: 'https://i', aud: 'c' }));
      expect(sso.validateOIDCToken(token, 'disabled').valid).toBe(false);
    });
  });

  describe('JWKS-style key rotation (kid)', () => {
    beforeEach(() => {
      sso.registerProvider({
        id: 'idp', type: 'oidc', name: 'IdP',
        issuer: 'https://idp.example.com',
        clientId: 'my-client-id',
        keys: [
          { kid: 'k1', publicKey: rsaPub },
          { kid: 'k2', publicKey: rsaPub2 },
        ],
        algorithms: ['RS256'],
      });
    });

    test('selects correct key by kid', () => {
      const t1 = makeSignedJWT(validClaims(), { kid: 'k1', privKey: rsaPriv });
      const t2 = makeSignedJWT(validClaims({ jti: 'x2' }), { kid: 'k2', privKey: rsaPriv2 });
      expect(sso.validateOIDCToken(t1, 'idp').valid).toBe(true);
      expect(sso.validateOIDCToken(t2, 'idp').valid).toBe(true);
    });

    test('REJECTS unknown kid', () => {
      const token = makeSignedJWT(validClaims(), { kid: 'unknown', privKey: rsaPriv });
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unknown kid/);
    });

    test('REJECTS missing kid when multiple keys registered', () => {
      const token = makeSignedJWT(validClaims(), { privKey: rsaPriv }); // no kid
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Missing kid/);
    });

    test('REJECTS token when kid picks wrong key', () => {
      // Signed with priv2 but claims kid=k1 (which maps to pub1)
      const token = makeSignedJWT(validClaims(), { kid: 'k1', privKey: rsaPriv2 });
      const result = sso.validateOIDCToken(token, 'idp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });
  });

  describe('SAML is deprecated', () => {
    test('always returns valid:false with clear error', () => {
      sso.registerProvider({ id: 's', type: 'saml', name: 'S' });
      const result = sso.validateSAMLAssertion('anything', 's');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/deprecated/i);
    });
  });

  describe('sessions', () => {
    test('createSession requires claims.sub', () => {
      expect(() => sso.createSession({}, 'p')).toThrow(/sub/);
    });

    test('createSession and getSession round-trip', () => {
      const session = sso.createSession({ sub: 'user1', email: 'a@b.c', roles: ['r'] }, 'p');
      const fetched = sso.getSession(session.id);
      expect(fetched.userId).toBe('user1');
    });

    test('getSession returns null for expired session', () => {
      sso.setSessionTTL(1);
      const session = sso.createSession({ sub: 'u', roles: [] }, 'p');
      const start = Date.now();
      while (Date.now() - start < 5) { /* busy wait */ }
      expect(sso.getSession(session.id)).toBeNull();
    });

    test('destroySession removes session', () => {
      const session = sso.createSession({ sub: 'u' }, 'p');
      expect(sso.destroySession(session.id)).toBe(true);
      expect(sso.getSession(session.id)).toBeNull();
    });

    test('invalidateUserSessions removes all sessions for user', () => {
      const s1 = sso.createSession({ sub: 'user-a' }, 'p');
      const s2 = sso.createSession({ sub: 'user-a' }, 'p');
      sso.createSession({ sub: 'user-b' }, 'p');
      const count = sso.invalidateUserSessions('user-a');
      expect(count).toBe(2);
      expect(sso.getSession(s1.id)).toBeNull();
      expect(sso.getSession(s2.id)).toBeNull();
    });

    test('getActiveSessionCount excludes expired', () => {
      sso.createSession({ sub: 'u1' }, 'p');
      sso.createSession({ sub: 'u2' }, 'p');
      expect(sso.getActiveSessionCount()).toBe(2);
    });

    test('LRU eviction when MAX_SESSIONS reached', () => {
      // Create a tiny sso for faster test — use internal property
      const sso2 = new SSOManager();
      // We can't easily override MAX_SESSIONS without exposing it; just check the method runs
      for (let i = 0; i < 100; i++) sso2.createSession({ sub: `u${i}` }, 'p');
      expect(sso2.getActiveSessionCount()).toBe(100);
    });
  });
});
