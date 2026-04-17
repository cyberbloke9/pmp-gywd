'use strict';

const crypto = require('crypto');

/**
 * SSO Provider Registry & Session Manager — hardened per 2026-04-12 security audit.
 *
 * Security properties:
 *   - OIDC JWT signature VERIFIED using the provider's registered public key(s).
 *     Uses Node.js native crypto.verify() — supports RS256, RS384, RS512, ES256, ES384, ES512, EdDSA.
 *     alg=none is REJECTED. Algorithm confusion (HS* when expecting RS*) is REJECTED.
 *     kid is mandatory when multiple keys are registered.
 *   - Clock skew tolerance (60s default) for exp/nbf.
 *   - Max token age enforced (default 24h) via iat check.
 *   - Replay detection via a sliding-window jti cache.
 *   - Session invalidation on privilege change.
 *   - Bounded session map with LRU eviction.
 *   - SAML is DEPRECATED — always returns valid:false. Use OIDC or integrate a vetted SAML library.
 */

/** Algorithms we accept. HS* and none are forbidden. */
const ALLOWED_ALGS = new Set(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'EdDSA']);

/** Map our alg name → Node crypto digest + verify options. */
function cryptoDigestFor(alg) {
  switch (alg) {
    case 'RS256': return 'RSA-SHA256';
    case 'RS384': return 'RSA-SHA384';
    case 'RS512': return 'RSA-SHA512';
    case 'ES256': return 'SHA256'; // ECDSA — Node infers from key
    case 'ES384': return 'SHA384';
    case 'ES512': return 'SHA512';
    case 'EdDSA': return null; // uses crypto.verify with key directly, no digest alg
    default: throw new Error(`Unsupported alg: ${alg}`);
  }
}

const DEFAULT_CLOCK_SKEW_MS = 60 * 1000;
const DEFAULT_MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10000;
const JTI_CACHE_MAX = 10000;
const JTI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

class SSOManager {
  /**
   * @param {object} [config={}]
   * @param {number} [config.sessionTtlMs=3600000] - Session TTL (1h default)
   * @param {number} [config.clockSkewMs=60000] - Clock skew tolerance
   * @param {number} [config.maxTokenAgeMs=86400000] - Max token age from iat (24h default)
   */
  constructor(config = {}) {
    this.providers = new Map();
    this.sessions = new Map();
    this._sessionTtl = config.sessionTtlMs || 3600000;
    this._clockSkewMs = config.clockSkewMs || DEFAULT_CLOCK_SKEW_MS;
    this._maxTokenAgeMs = config.maxTokenAgeMs || DEFAULT_MAX_TOKEN_AGE_MS;

    // Replay cache: jti → expiry
    this._jtiCache = new Map();
  }

  /**
   * Register an identity provider.
   *
   * For OIDC providers, you MUST provide at least one of:
   *   - `publicKey`: PEM-encoded public key (string)
   *   - `keys`: Array of { kid, publicKey, alg? } (for key rotation / JWKS)
   *
   * Required fields:
   *   - id, type, issuer, clientId, algorithms (array of allowed algs)
   */
  registerProvider(provider) {
    if (!provider || !provider.id || !provider.type) {
      throw new Error('Provider must have id and type');
    }
    if (!['oidc', 'saml'].includes(provider.type)) {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }
    if (provider.type === 'saml') {
      // SAML support is deprecated — register but it will always return invalid.
      this.providers.set(provider.id, { ...provider, registeredAt: Date.now(), deprecated: true });
      return this;
    }

    // OIDC validation
    if (!provider.issuer) throw new Error('OIDC provider requires issuer');
    if (!provider.clientId) throw new Error('OIDC provider requires clientId');

    // Algorithm allowlist (per-provider)
    const algs = provider.algorithms && provider.algorithms.length > 0
      ? provider.algorithms
      : ['RS256']; // safe default
    for (const a of algs) {
      if (!ALLOWED_ALGS.has(a)) {
        throw new Error(`Algorithm ${a} not allowed. Permitted: ${[...ALLOWED_ALGS].join(', ')}`);
      }
    }

    // Keys: either a single publicKey or an array of { kid, publicKey }
    const keyMap = new Map();
    if (provider.publicKey) {
      keyMap.set('__single__', { publicKey: provider.publicKey });
    }
    if (provider.keys && Array.isArray(provider.keys)) {
      for (const k of provider.keys) {
        if (!k.kid || !k.publicKey) throw new Error('Each key must have kid and publicKey');
        keyMap.set(k.kid, { publicKey: k.publicKey, alg: k.alg });
      }
    }
    if (keyMap.size === 0) {
      throw new Error('OIDC provider requires publicKey or keys[] for signature verification');
    }

    this.providers.set(provider.id, {
      ...provider,
      algorithms: algs,
      _keys: keyMap,
      registeredAt: Date.now(),
    });
    return this;
  }

  removeProvider(providerId) {
    return this.providers.delete(providerId);
  }

  getProvider(providerId) {
    const p = this.providers.get(providerId);
    if (!p) return null;
    // Don't leak internal keys
    const { _keys, ...rest } = p;
    return rest;
  }

  listProviders() {
    return [...this.providers.values()].map(p => ({
      id: p.id,
      type: p.type,
      name: p.name,
      issuer: p.issuer,
      enabled: p.enabled !== false,
      deprecated: !!p.deprecated,
    }));
  }

  // ---- OIDC JWT Verification ----

  /**
   * Validate an OIDC JWT with full cryptographic signature verification.
   * @param {string} token
   * @param {string} providerId
   * @returns {{ valid: boolean, claims: object|null, error: string|null }}
   */
  validateOIDCToken(token, providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) return { valid: false, claims: null, error: 'Provider not found' };
    if (provider.type !== 'oidc') return { valid: false, claims: null, error: 'Not an OIDC provider' };
    if (provider.enabled === false) return { valid: false, claims: null, error: 'Provider disabled' };

    if (!token || typeof token !== 'string' || token.length > 8192) {
      return { valid: false, claims: null, error: 'Invalid token' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, claims: null, error: 'Invalid JWT format' };

    // Parse header
    let header;
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    } catch {
      return { valid: false, claims: null, error: 'Invalid header encoding' };
    }

    // Reject alg=none and any unlisted alg
    if (!header.alg || typeof header.alg !== 'string') {
      return { valid: false, claims: null, error: 'Missing alg header' };
    }
    if (header.alg === 'none' || header.alg.toLowerCase() === 'none') {
      return { valid: false, claims: null, error: 'alg=none is forbidden' };
    }
    if (!ALLOWED_ALGS.has(header.alg)) {
      return { valid: false, claims: null, error: `Algorithm ${header.alg} not permitted` };
    }
    if (!provider.algorithms.includes(header.alg)) {
      return { valid: false, claims: null, error: `Algorithm ${header.alg} not allowed for this provider` };
    }

    // Key selection
    let keyEntry = null;
    if (header.kid) {
      keyEntry = provider._keys.get(header.kid);
      if (!keyEntry) {
        return { valid: false, claims: null, error: `Unknown kid: ${header.kid}` };
      }
    } else if (provider._keys.size === 1) {
      keyEntry = provider._keys.values().next().value;
    } else {
      return { valid: false, claims: null, error: 'Missing kid header (provider has multiple keys)' };
    }

    // Verify signature
    const signatureInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
    let signature;
    try {
      signature = Buffer.from(parts[2], 'base64url');
    } catch {
      return { valid: false, claims: null, error: 'Invalid signature encoding' };
    }

    let verified;
    try {
      if (header.alg === 'EdDSA') {
        verified = crypto.verify(null, signatureInput, keyEntry.publicKey, signature);
      } else {
        const digest = cryptoDigestFor(header.alg);
        verified = crypto.verify(digest, signatureInput, keyEntry.publicKey, signature);
      }
    } catch (err) {
      return { valid: false, claims: null, error: `Verification error: ${err.message}` };
    }

    if (!verified) {
      return { valid: false, claims: null, error: 'Signature verification failed' };
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      return { valid: false, claims: null, error: 'Invalid payload encoding' };
    }

    // Claim validation
    if (!payload.sub) return { valid: false, claims: null, error: 'Missing sub claim' };
    if (!payload.iss) return { valid: false, claims: null, error: 'Missing iss claim' };
    if (payload.iss !== provider.issuer) {
      return { valid: false, claims: null, error: `Issuer mismatch: expected ${provider.issuer}` };
    }

    // Audience — mandatory
    if (!payload.aud) return { valid: false, claims: null, error: 'Missing aud claim' };
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audList.includes(provider.clientId)) {
      return { valid: false, claims: null, error: 'Audience mismatch' };
    }

    const now = Date.now();

    // Expiry (mandatory)
    if (typeof payload.exp !== 'number') {
      return { valid: false, claims: null, error: 'Missing exp claim' };
    }
    if (payload.exp * 1000 < now - this._clockSkewMs) {
      return { valid: false, claims: null, error: 'Token expired' };
    }

    // Not-before
    if (typeof payload.nbf === 'number' && payload.nbf * 1000 > now + this._clockSkewMs) {
      return { valid: false, claims: null, error: 'Token not yet valid' };
    }

    // iat + max age
    if (typeof payload.iat !== 'number') {
      return { valid: false, claims: null, error: 'Missing iat claim' };
    }
    if (payload.iat * 1000 > now + this._clockSkewMs) {
      return { valid: false, claims: null, error: 'Token iat is in the future' };
    }
    if (now - payload.iat * 1000 > this._maxTokenAgeMs) {
      return { valid: false, claims: null, error: 'Token too old' };
    }

    // Replay protection via jti
    if (payload.jti) {
      this._cleanExpiredJti();
      if (this._jtiCache.has(payload.jti)) {
        return { valid: false, claims: null, error: 'Token replay detected' };
      }
      if (this._jtiCache.size >= JTI_CACHE_MAX) {
        // LRU eviction
        const oldest = this._jtiCache.keys().next().value;
        this._jtiCache.delete(oldest);
      }
      this._jtiCache.set(payload.jti, now + JTI_CACHE_TTL_MS);
    }

    return {
      valid: true,
      claims: {
        sub: payload.sub,
        email: payload.email || null,
        name: payload.name || null,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        iss: payload.iss,
        aud: payload.aud,
        exp: payload.exp,
        iat: payload.iat,
        jti: payload.jti || null,
      },
      error: null,
    };
  }

  _cleanExpiredJti() {
    const now = Date.now();
    for (const [jti, expiry] of this._jtiCache) {
      if (expiry <= now) this._jtiCache.delete(jti);
    }
  }

  // ---- SAML (DEPRECATED) ----

  /**
   * @deprecated Home-grown SAML parsing was proven insecure (XSW, no signature verification).
   * Always returns valid:false. Use OIDC or integrate a vetted SAML library (e.g. @node-saml/node-saml).
   */
  validateSAMLAssertion(_assertion, _providerId) {
    return {
      valid: false,
      claims: null,
      error: 'SAML support is deprecated. Use OIDC or integrate @node-saml/node-saml separately.',
    };
  }

  // ---- Sessions ----

  /**
   * Create a session from verified claims.
   * MUST be called only after validateOIDCToken returned valid:true.
   */
  createSession(claims, providerId) {
    if (!claims || !claims.sub) {
      throw new Error('createSession requires claims.sub');
    }
    if (this.sessions.size >= MAX_SESSIONS) {
      // LRU eviction — remove oldest
      const oldestId = this.sessions.keys().next().value;
      this.sessions.delete(oldestId);
    }
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId: claims.sub,
      email: claims.email || null,
      name: claims.name || null,
      roles: Array.isArray(claims.roles) ? [...claims.roles] : [],
      providerId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this._sessionTtl,
      lastActivity: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    session.lastActivity = Date.now();
    return session;
  }

  destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Invalidate ALL sessions for a user (call on privilege change).
   */
  invalidateUserSessions(userId) {
    let count = 0;
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        count += 1;
      }
    }
    return count;
  }

  getActiveSessionCount() {
    this._cleanExpired();
    return this.sessions.size;
  }

  setSessionTTL(ttlMs) {
    this._sessionTtl = ttlMs;
  }

  _cleanExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) this.sessions.delete(id);
    }
  }
}

module.exports = { SSOManager, ALLOWED_ALGS };
