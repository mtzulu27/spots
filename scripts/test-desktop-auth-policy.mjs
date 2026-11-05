import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPostAuthDestination, shouldSkipAccountSetup } from '../apps/mobile/lib/desktop-auth-policy.ts';

const defaults = { platform: 'web', width: 1280, authenticated: true, profileCompleted: false, onboardingCompleted: false };
test('desktop bypasses incomplete profile and onboarding', () => {
  assert.equal(getPostAuthDestination(defaults), '/(tabs)/explore');
  assert.equal(getPostAuthDestination({ ...defaults, profileCompleted: true }), '/(tabs)/explore');
});
test('desktop still requires authentication', () => {
  assert.equal(getPostAuthDestination({ ...defaults, authenticated: false }), '/(auth)/login');
});
test('breakpoint matches desktop login', () => {
  assert.equal(shouldSkipAccountSetup('web', 900), true);
  assert.equal(shouldSkipAccountSetup('web', 899), false);
});
test('narrow web keeps profile and onboarding sequence', () => {
  assert.equal(getPostAuthDestination({ ...defaults, width: 390 }), '/(setup)/profile-setup');
  assert.equal(getPostAuthDestination({ ...defaults, width: 390, profileCompleted: true }), '/(onboarding)/welcome');
});
test('native tablet never bypasses setup', () => {
  for (const platform of ['ios', 'android']) {
    assert.equal(getPostAuthDestination({ ...defaults, platform }), '/(setup)/profile-setup');
  }
});
test('completed mobile account goes to Explore', () => {
  assert.equal(getPostAuthDestination({ ...defaults, width: 390, profileCompleted: true, onboardingCompleted: true }), '/(tabs)/explore');
});
