import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';

describe('Admin 2FA OTP System', () => {
  const testWalletAddress = '0xd4ce178d8e8467b0c1ba3c0c8474f4ca457178d';
  const testWalletAddress2 = '0x1234567890123456789012345678901234567890';

  beforeAll(async () => {
    console.log('[2FA Tests] Starting admin 2FA system tests');
  });

  afterAll(async () => {
    console.log('[2FA Tests] Cleanup completed');
  });

  it('should create and retrieve admin OTP secret', async () => {
    const secret = 'JBSWY3DPEBLW64TMMQ======'; // Example base32 secret

    // Create admin secret
    await db.upsertAdminSecret({
      adminWalletAddress: testWalletAddress,
      otpSecret: secret,
      isEnabled: false,
      backupCodes: JSON.stringify([]),
    });

    // Retrieve admin secret
    const retrieved = await db.getAdminSecret(testWalletAddress);

    expect(retrieved).toBeDefined();
    expect(retrieved?.adminWalletAddress).toBe(testWalletAddress);
    expect(retrieved?.otpSecret).toBe(secret);
    expect(retrieved?.isEnabled).toBe(false);

    console.log('[2FA] Created and retrieved admin secret for wallet:', testWalletAddress);
  });

  it('should update admin OTP secret', async () => {
    const oldSecret = 'JBSWY3DPEBLW64TMMQ======';
    const newSecret = 'JBSWY3DPEBLW64TMMQ111111';

    // Create initial secret
    await db.upsertAdminSecret({
      adminWalletAddress: testWalletAddress2,
      otpSecret: oldSecret,
      isEnabled: false,
      backupCodes: JSON.stringify([]),
    });

    // Update secret
    await db.upsertAdminSecret({
      adminWalletAddress: testWalletAddress2,
      otpSecret: newSecret,
      isEnabled: true,
      backupCodes: JSON.stringify(['backup1', 'backup2']),
    });

    // Verify update
    const updated = await db.getAdminSecret(testWalletAddress2);

    expect(updated?.otpSecret).toBe(newSecret);
    expect(updated?.isEnabled).toBe(true);
    expect(updated?.backupCodes).toBe(JSON.stringify(['backup1', 'backup2']));

    console.log('[2FA] Updated admin secret successfully');
  });

  it('should check if admin OTP is enabled', async () => {
    const secret = 'JBSWY3DPEBLW64TMMQ222222';

    // Create disabled OTP
    await db.upsertAdminSecret({
      adminWalletAddress: testWalletAddress,
      otpSecret: secret,
      isEnabled: false,
      backupCodes: JSON.stringify([]),
    });

    let isEnabled = await db.isAdminOTPEnabled(testWalletAddress);
    expect(isEnabled).toBe(false);

    // Enable OTP
    await db.setAdminOTPEnabled(testWalletAddress, true);

    isEnabled = await db.isAdminOTPEnabled(testWalletAddress);
    expect(isEnabled).toBe(true);

    console.log('[2FA] OTP enabled/disabled status checked');
  });

  it('should handle non-existent admin secret gracefully', async () => {
    const nonExistentWallet = '0xffffffffffffffffffffffffffffffffffffffff';

    const secret = await db.getAdminSecret(nonExistentWallet);
    expect(secret).toBeUndefined();

    const isEnabled = await db.isAdminOTPEnabled(nonExistentWallet);
    expect(isEnabled).toBe(false);

    console.log('[2FA] Non-existent secret handled gracefully');
  });

  it('should preserve admin_secrets table during operations', async () => {
    // This test verifies that the admin_secrets table exists and is accessible
    const database = await getDb();
    expect(database).toBeDefined();

    // Create a test secret
    const testSecret = 'JBSWY3DPEBLW64TMMQ333333';
    await db.upsertAdminSecret({
      adminWalletAddress: testWalletAddress,
      otpSecret: testSecret,
      isEnabled: true,
      backupCodes: JSON.stringify(['code1', 'code2']),
    });

    // Verify it's still there
    const retrieved = await db.getAdminSecret(testWalletAddress);
    expect(retrieved?.otpSecret).toBe(testSecret);

    console.log('[2FA] Admin secrets table preserved and accessible');
  });

  it('should maintain data integrity across multiple operations', async () => {
    const wallet1 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const wallet2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const secret1 = 'SECRET1_BASE32_ENCODED_';
    const secret2 = 'SECRET2_BASE32_ENCODED_';

    // Create two separate admin secrets
    await db.upsertAdminSecret({
      adminWalletAddress: wallet1,
      otpSecret: secret1,
      isEnabled: true,
      backupCodes: JSON.stringify([]),
    });

    await db.upsertAdminSecret({
      adminWalletAddress: wallet2,
      otpSecret: secret2,
      isEnabled: false,
      backupCodes: JSON.stringify([]),
    });

    // Verify both are independent
    const retrieved1 = await db.getAdminSecret(wallet1);
    const retrieved2 = await db.getAdminSecret(wallet2);

    expect(retrieved1?.otpSecret).toBe(secret1);
    expect(retrieved1?.isEnabled).toBe(true);
    expect(retrieved2?.otpSecret).toBe(secret2);
    expect(retrieved2?.isEnabled).toBe(false);

    console.log('[2FA] Multiple admin secrets maintained independently');
  });
});
