import { login } from './auth.service';

async function runTests(): Promise<void> {

console.log('\n🧪 Testing valid login...');

try {
    const result = await login(
        'test@example.com',
        'Test@12345'
    );

    console.log('✅ Valid login passed:', result);

} catch (error) {
    console.error('❌ Valid login failed:', error);
}


console.log('\n🧪 Testing invalid password...');

try {
    await login(
        'test@example.com',
        'WrongPassword'
    );

    console.error(
        '❌ Invalid password test failed: login should have been rejected.'
    );

} catch {
    console.log(
        '✅ Invalid password correctly rejected.'
    );
}


console.log('\n🧪 Testing unknown email...');

try {
    await login(
        'unknown@example.com',
        'Test@12345'
    );

    console.error(
        '❌ Unknown email test failed: login should have been rejected.'
    );

} catch {
    console.log(
        '✅ Unknown email correctly rejected.'
    );
}


}

runTests();