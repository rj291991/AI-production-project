import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

dotenv.config();

// ============================================================
// GITHUB CONFIGURATION
// ============================================================

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

if (!token) {
    throw new Error('GITHUB_TOKEN is missing from .env');
}

if (!owner) {
    throw new Error('GITHUB_OWNER is missing from .env');
}

if (!repo) {
    throw new Error('GITHUB_REPO is missing from .env');
}

// After the checks above, TypeScript knows these are strings.
const OWNER: string = owner;
const REPO: string = repo;

const octokit = new Octokit({
    auth: token
});

// ============================================================
// CREATE FIX BRANCH
// ============================================================

export async function createFixBranch(branchName: string): Promise<void> {

    console.log(
        `🌿 [GitHub]: Creating branch ${branchName}...`
    );

    // Get current main branch
    const mainRef = await octokit.rest.git.getRef({
        owner: OWNER,
        repo: REPO,
        ref: 'heads/main'
    });

    const mainSha = mainRef.data.object.sha;

    // Create new branch
    await octokit.rest.git.createRef({
        owner: OWNER,
        repo: REPO,
        ref: `refs/heads/${branchName}`,
        sha: mainSha
    });

    console.log(
        `✅ [GitHub]: Branch created: ${branchName}`
    );


}

// ============================================================
// COMMIT FILE TO BRANCH
// ============================================================

export async function commitFileToBranch(
    branchName: string,
    filePath: string,
    fileContent: string,
    commitMessage: string
): Promise<void> {

    console.log(`📝 [GitHub]: Committing ${filePath} to ${branchName}...`);

    let existingFileSha: string | undefined;

    // --------------------------------------------------------
    // CHECK IF FILE ALREADY EXISTS
    // --------------------------------------------------------

    try {
        const existingFile = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            ref: branchName
        });
        if (!Array.isArray(existingFile.data)) {
            existingFileSha = existingFile.data.sha;
        }
    } catch (error: any) {
        // 404 means the file does not exist yet.
        if (error.status !== 404) {
            throw error;
        }
        console.log(`ℹ️ [GitHub]: File does not exist yet. Creating ${filePath}...`);
    }

    // --------------------------------------------------------
    // CREATE / UPDATE FILE
    // --------------------------------------------------------

    await octokit.rest.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(fileContent, 'utf-8').toString('base64'),
        branch: branchName,
        ...(existingFileSha ? { sha: existingFileSha } : {})
    });

    console.log(
        `✅ [GitHub]: File committed successfully: ${filePath}`
    );
}

// ============================================================
// CREATE PULL REQUEST
// ============================================================

export async function createPullRequest(branchName: string, title: string, body: string): Promise<{
    number: number;
    url: string;
}> {

    console.log(`🔀 [GitHub]: Creating Pull Request from ${branchName} → main...`);
    const response = await octokit.rest.pulls.create({
        owner: OWNER,
        repo: REPO,
        title,
        head: branchName,
        base: 'main',
        body
    });
    console.log(`✅ [GitHub]: Pull Request created #${response.data.number}`);
    console.log(`🔗 [GitHub]: ${response.data.html_url}`);
    return {
        number: response.data.number,
        url: response.data.html_url
    };
}