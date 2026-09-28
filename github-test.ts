import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

dotenv.config();

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error('GITHUB_TOKEN is missing from .env');
}

const octokit = new Octokit({
  auth: token
});

async function testGitHub() {
  console.log('🔄 Testing GitHub connection...');

  const response = await octokit.rest.repos.get({
    owner: 'rj291991',
    repo: 'AI-production-project'
  });

  console.log('✅ GitHub connection successful');
  console.log(`📦 Repository: ${response.data.full_name}`);
  console.log(`🔒 Private: ${response.data.private}`);
}

testGitHub().catch((error) => {
  console.error('❌ GitHub connection failed');
  console.error(error.message);
  process.exit(1);
});
