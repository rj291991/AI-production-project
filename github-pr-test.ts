import dotenv from 'dotenv';

import {
  createFixBranch,
  commitFileToBranch,
  createPullRequest
} from './github-service';

import fs from 'fs/promises';

dotenv.config();

async function main() {

  const branchName =
    `agent/pr-test-${Date.now()}`;

  const filePath =
    'mock-repo/auth-service.ts';

  console.log(
    '🚀 Starting complete GitHub PR test...'
  );

  // 1. Create branch
  await createFixBranch(
    branchName
  );

  // 2. Read fixed source
  const fileContent =
    await fs.readFile(
      filePath,
      'utf-8'
    );

  // 3. Commit fixed source
  await commitFileToBranch(
    branchName,
    filePath,
    fileContent,
    'fix: repair AuthService session token'
  );

  // 4. Create PR
  const pullRequest =
    await createPullRequest(
      branchName,

      'fix: repair AuthService session token',

      `## Automated AgenticSprint Fix

This Pull Request was generated automatically
by the AgenticSprint self-healing agent.

### Affected file

\`${filePath}\`

### Validation

Automated tests passed before creating this Pull Request.

### Workflow

Ticket
→ Code Retrieval
→ AI Fix
→ Test
→ Git Branch
→ Commit
→ Pull Request
`
    );

  console.log('');
  console.log(
    '🎉 COMPLETE GITHUB AUTOMATION SUCCESSFUL!'
  );

  console.log(
    `🔀 PR #${pullRequest.number}`
  );

  console.log(
    `🔗 ${pullRequest.url}`
  );
}

main().catch(error => {

  console.error(
    '❌ GitHub PR automation failed:'
  );

  console.error(
    error.response?.data ||
    error.message
  );

  process.exit(1);
});
