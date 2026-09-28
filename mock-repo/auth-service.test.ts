import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth-service';

test('executeLogin should return a session token for a valid user', () => {
  const auth = new AuthService();

  const result = auth.executeLogin('1');

  assert.equal(result.success, true);
  assert.equal(typeof result.sessionToken, 'string');
  assert.ok(result.sessionToken.length > 0);
});
