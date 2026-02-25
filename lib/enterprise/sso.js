'use strict';

const crypto = require('crypto');

/**
 * SSO Provider Registry & Session Manager
 *
 * Manages OIDC and SAML identity provider configurations,
 * validates tokens/assertions, and handles user sessions.
 * Zero external dependencies — uses Node.js crypto for token ops.
 */
class SSOManager {
  constructor() {
    /** @type {Map<string, SSOProvider>} */
    this.providers = new Map();
    /** @type {Map<string, Session>} */
    this.sessions = new Map();
    this._sessionTtl = 3600000; // 1 hour default
  }

  /**
   * Register an identity provider
   * @param {SSOProvider} provider
   * @returns {SSOManager} this
   */
  registerProvider(provider) {
    if (!provider.id || !provider.type) {
      throw new Error('Provider must have id and type');
    }
    if (!['oidc', 'saml'].includes(provider.type)) {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }
    this.providers.set(provider.id, { ...provider, registeredAt: Date.now() });
    return this;
  }

  /**
   * Remove a provider
   * @param {string} providerId
   * @returns {boolean}
   */
  removeProvider(providerId) {
    return this.providers.delete(providerId);
  }

  /**
   * Get a provider
   * @param {string} providerId
   * @returns {SSOProvider|null}
   */
  getProvider(providerId) {
    return this.providers.get(providerId) || null;
  }

  /**
   * List all providers
   * @returns {SSOProvider[]}
   */
  listProviders() {
    return [...this.providers.values()].map(p => ({
      id: p.id,
      type: p.type,
      name: p.name,
      issuer: p.issuer,
      enabled: p.enabled !== false,
    }));
  }

  /**
   * Validate an OIDC token (JWT structure validation)
   * Note: Full signature verification requires the provider's JWKS — this
   * validates structure, expiry, issuer, and audience claims.
   * @param {string} token - JWT token
   * @param {string} providerId - Provider to validate against
   * @returns {{ valid: boolean, claims: object|null, error: string|null }}
   */
  validateOIDCToken(token, providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) return { valid: false, claims: null, error: 'Provider not found' };
    if (provider.type !== 'oidc') return { valid: false, claims: null, error: 'Not an OIDC provider' };
    if (provider.enabled === false) return { valid: false, claims: null, error: 'Provider disabled' };

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, claims: null, error: 'Invalid JWT format' };

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Check required claims
      if (!payload.sub) return { valid: false, claims: null, error: 'Missing sub claim' };
      if (!payload.iss) return { valid: false, claims: null, error: 'Missing iss claim' };

      // Check issuer
      if (provider.issuer && payload.iss !== provider.issuer) {
        return { valid: false, claims: null, error: `Issuer mismatch: expected ${provider.issuer}` };
      }

      // Check audience
      if (provider.clientId) {
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(provider.clientId)) {
          return { valid: false, claims: null, error: 'Audience mismatch' };
        }
      }

      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { valid: false, claims: null, error: 'Token expired' };
      }

      // Check not-before
      if (payload.nbf && payload.nbf * 1000 > Date.now()) {
        return { valid: false, claims: null, error: 'Token not yet valid' };
      }

      return {
        valid: true,
        claims: {
          sub: payload.sub,
          email: payload.email || null,
          name: payload.name || null,
          roles: payload.roles || [],
          iss: payload.iss,
          exp: payload.exp,
          iat: payload.iat,
        },
        error: null,
      };
    } catch (err) {
      return { valid: false, claims: null, error: `Token parse error: ${err.message}` };
    }
  }

  /**
   * Validate a SAML assertion (XML structure validation)
   * Note: Full signature verification requires the IdP certificate.
   * This validates structure and extracts claims.
   * @param {string} assertion - Base64-encoded SAML assertion
   * @param {string} providerId
   * @returns {{ valid: boolean, claims: object|null, error: string|null }}
   */
  validateSAMLAssertion(assertion, providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) return { valid: false, claims: null, error: 'Provider not found' };
    if (provider.type !== 'saml') return { valid: false, claims: null, error: 'Not a SAML provider' };
    if (provider.enabled === false) return { valid: false, claims: null, error: 'Provider disabled' };

    try {
      const xml = Buffer.from(assertion, 'base64').toString();

      // Basic XML structure check
      if (!xml.includes('<saml') && !xml.includes('<Assertion')) {
        return { valid: false, claims: null, error: 'Invalid SAML assertion format' };
      }

      // Extract NameID (simple regex — production would use XML parser)
      const nameIdMatch = xml.match(/<(?:saml:)?NameID[^>]*>([^<]+)<\//);
      const emailMatch = xml.match(/Name="email"[^>]*><(?:saml:)?AttributeValue[^>]*>([^<]+)<\//);
      const nameMatch = xml.match(/Name="name"[^>]*><(?:saml:)?AttributeValue[^>]*>([^<]+)<\//);
      const roleMatch = xml.match(/Name="role"[^>]*><(?:saml:)?AttributeValue[^>]*>([^<]+)<\//);

      // Check issuer
      const issuerMatch = xml.match(/<(?:saml:)?Issuer[^>]*>([^<]+)<\//);
      if (provider.issuer && issuerMatch && issuerMatch[1] !== provider.issuer) {
        return { valid: false, claims: null, error: `Issuer mismatch: expected ${provider.issuer}` };
      }

      if (!nameIdMatch) {
        return { valid: false, claims: null, error: 'Missing NameID in assertion' };
      }

      return {
        valid: true,
        claims: {
          sub: nameIdMatch[1],
          email: emailMatch ? emailMatch[1] : null,
          name: nameMatch ? nameMatch[1] : null,
          roles: roleMatch ? [roleMatch[1]] : [],
          issuer: issuerMatch ? issuerMatch[1] : null,
        },
        error: null,
      };
    } catch (err) {
      return { valid: false, claims: null, error: `Assertion parse error: ${err.message}` };
    }
  }

  /**
   * Create a session from validated claims
   * @param {object} claims - Validated identity claims
   * @param {string} providerId - Which provider authenticated
   * @returns {Session}
   */
  createSession(claims, providerId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId: claims.sub,
      email: claims.email,
      name: claims.name,
      roles: claims.roles || [],
      providerId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this._sessionTtl,
      lastActivity: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get and validate a session
   * @param {string} sessionId
   * @returns {Session|null}
   */
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

  /**
   * Destroy a session (logout)
   * @param {string} sessionId
   * @returns {boolean}
   */
  destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get active session count
   * @returns {number}
   */
  getActiveSessionCount() {
    this._cleanExpired();
    return this.sessions.size;
  }

  /**
   * Set session TTL
   * @param {number} ttlMs
   */
  setSessionTTL(ttlMs) {
    this._sessionTtl = ttlMs;
  }

  /** @private */
  _cleanExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }
}

/**
 * @typedef {object} SSOProvider
 * @property {string} id
 * @property {'oidc'|'saml'} type
 * @property {string} name
 * @property {string} [issuer]
 * @property {string} [clientId]
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} Session
 * @property {string} id
 * @property {string} userId
 * @property {string} email
 * @property {string} name
 * @property {string[]} roles
 * @property {string} providerId
 * @property {number} createdAt
 * @property {number} expiresAt
 * @property {number} lastActivity
 */

module.exports = { SSOManager };
