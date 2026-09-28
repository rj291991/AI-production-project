import dotenv from 'dotenv';
import { createFixBranch } from './github-service';
dotenv.config();
async function main() {
    const branchName = `agent/test-${Date.now()}`;
    await createFixBranch(branchName);
    console.log(`🎉 Branch successfully created: ${branchName}`);
}

main().catch(error => {
    console.error('❌ Branch creation failed:');
    console.error(error.response?.data || error.message);
    process.exit(1);
});
