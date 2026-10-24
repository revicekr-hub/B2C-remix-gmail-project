import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DEMO_USERS,
  authenticateAccountRecord,
  registerAccountRecord,
} from './userDatabase';

test('registerAccountRecord validates basic info, registers account, and preserves it for re-login', () => {
  // 1. Missing company should fail validation
  const invalidRes = registerAccountRecord(INITIAL_DEMO_USERS, {
    email: 'newuser@company.vn',
    password: 'password123',
    fullName: 'Lê Hoàng Minh',
    phone: '0988111222',
    company: '',
    jobTitle: 'Marketing Lead',
  });
  assert.equal(invalidRes.ok, false);

  // 2. Valid registration collects basic info and stores user
  const regRes = registerAccountRecord(INITIAL_DEMO_USERS, {
    email: 'minh.le@fincore.vn',
    password: 'secretPassword99',
    fullName: 'Lê Hoàng Minh',
    phone: '0988111222',
    company: 'FinCore Cloud B2B',
    jobTitle: 'Trưởng phòng Tăng trưởng',
    role: 'admin',
  });
  assert.equal(regRes.ok, true);
  assert.equal(regRes.user?.email, 'minh.le@fincore.vn');
  assert.equal(regRes.user?.fullName, 'Lê Hoàng Minh');
  assert.equal(regRes.user?.company, 'FinCore Cloud B2B');
  assert.equal(regRes.updatedUsers.length, INITIAL_DEMO_USERS.length + 1);

  // 3. Duplicate email registration should be rejected
  const dupRes = registerAccountRecord(regRes.updatedUsers, {
    email: 'MINH.LE@FINCORE.VN',
    password: 'secretPassword99',
    fullName: 'Lê Hoàng Minh',
    phone: '0988111222',
    company: 'FinCore Cloud B2B',
    jobTitle: 'Trưởng phòng Tăng trưởng',
  });
  assert.equal(dupRes.ok, false);

  // 4. Logging in with wrong password fails
  const wrongLogin = authenticateAccountRecord(
    regRes.updatedUsers,
    'minh.le@fincore.vn',
    'wrongPass'
  );
  assert.equal(wrongLogin.ok, false);

  // 5. Logging back in with registered email & password succeeds and preserves basic info
  const validLogin = authenticateAccountRecord(
    regRes.updatedUsers,
    'minh.le@fincore.vn',
    'secretPassword99'
  );
  assert.equal(validLogin.ok, true);
  assert.equal(validLogin.user?.fullName, 'Lê Hoàng Minh');
  assert.equal(validLogin.user?.phone, '0988111222');
  assert.equal(validLogin.user?.company, 'FinCore Cloud B2B');
});
