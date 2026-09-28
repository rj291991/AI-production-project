import dotenv from 'dotenv';
import fs from 'fs/promises';

import {
  createFixBranch,
  commitFileToBranch
} from './github-service';

dotenv.config();

async function main() {

  const branchName =
    `agent/fix-auth-${Date.now()}`;

  const filePath =
    'mock-repo/auth-service.ts';

  console.log('🚀 Starting GitHub commit test...');

  // 1. Create branch
  await createFixBranch(branchName);

  // 2. Read the currently fixed local file
  const fileContent =
    await fs.readFile(
      filePath,
      'utf-8'
    );

  // 3. Commit file
  await commitFileToBranch(
    branchName,
    filePath,
    fileContent,
    'fix: repair AuthService session token'
  );

  console.log('');
  console.log('🎉 GitHub commit automation successful!');
  console.log(`🌿 Branch: ${branchName}`);
}

main().catch(error => {

  console.error(
    '❌ GitHub commit failed:'
  );

  console.error(
    error.response?.data || error.message
  );

  process.exit(1);
});
