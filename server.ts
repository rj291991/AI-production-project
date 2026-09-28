import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

import {
    createFixBranch,
    commitFileToBranch,
    createPullRequest
} from './github-service';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const execFileAsync = promisify(execFile);

// ============================================================
// AI + PINECONE CONFIGURATION
// ============================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const index = pc.index<RecordMetadata>('agentic-sprint');

// ============================================================
// AI RESPONSE SCHEMA
// ============================================================

const PatchGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        explanationOfBug: {
            type: Type.STRING,
            description: 'Detailed technical explanation of why the bug is crashing the system.'
        },
        proposedFixCode: {
            type: Type.STRING,
            description: 'The complete corrected code of the affected source file.'
        }
    },
    required: [
        'explanationOfBug',
        'proposedFixCode'
    ]
};

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_REPAIR_ATTEMPTS = 5;
const REPO_ROOT = path.resolve(process.cwd(), 'mock-repo');

// ============================================================
// GEMINI RETRY
// ============================================================

async function retryWithBackoff(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.status === 503 || error.status === 429 || error.message?.includes('demand'))
        ) {
            console.warn(
                `⚠️ [Gemini API Overloaded]: Retrying in ${delay}ms... (${retries} attempts left)`
            );

            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );

            return retryWithBackoff(
                fn,
                retries - 1,
                delay * 2
            );
        }

        throw error;
    }
}

// ============================================================
// SAFE FILE PATH
// ============================================================

function resolveRepoFile(relativeFilePath: string): string {

    const absolutePath = path.resolve(process.cwd(), relativeFilePath);

    if (absolutePath !== REPO_ROOT && !absolutePath.startsWith(`${REPO_ROOT}${path.sep}`)
    ) {
        throw new Error(
            'Unsafe file path detected. File must be inside mock-repo.'
        );
    }

    return absolutePath;
}

// ============================================================
// BACKUP ORIGINAL FILE
// ============================================================

async function backupFile(filePath: string): Promise<string> {

    const backupPath = `${filePath}.bak`;

    await fs.copyFile(filePath, backupPath);

    console.log(`[Repair Agent]: 🛡️ Backup created: ${backupPath}`);

    return backupPath;
}

// ============================================================
// APPLY AI FIX
// ============================================================

async function applyFix(relativeFilePath: string, proposedFixCode: string): Promise<void> {

    const absolutePath = resolveRepoFile(relativeFilePath);

    await fs.writeFile(absolutePath, proposedFixCode, 'utf-8');

    console.log(`[Repair Agent]: 🩹 AI fix applied to ${relativeFilePath}`);
}

// ============================================================
// RUN TESTS
// ============================================================

async function runTests(): Promise<{ passed: boolean; output: string; }> {
    console.log('[Test Runner]: 🧪 Running npm test...');
    try {
        const { stdout, stderr } = await execFileAsync(
            process.env.ComSpec || 'cmd.exe',
            [
                '/d',
                '/s',
                '/c',
                'npm test'
            ],
            {
                cwd: process.cwd(),
                timeout: 120000,
                maxBuffer: 10 * 1024 * 1024,
                windowsHide: true
            }
        );

        return {
            passed: true,
            output: `${stdout}\n${stderr}`.trim()
        };

    } catch (error: any) {
        const output = [error.stdout, error.stderr, error.message]
            .filter(Boolean)
            .join('\n');

        return {
            passed: false,
            output
        };
    }
}

// ============================================================
// INITIAL AI FIX GENERATION
// ============================================================

async function generateInitialFix(
    title: string,
    description: string,
    filePath: string,
    codeContent: string
) {

    console.log(
        '[Agent Core]: ⚡ Requesting specialized patch fix from Gemini...'
    );

    const response = await retryWithBackoff(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert software debugging agent.
Fix the bug reported in the incoming ticket using the
attached codebase source file.
INCOMING TICKET:
Title:
${title}

Description:
${description}

AFFECTED FILE:
${filePath}

CURRENT SOURCE CODE:

\`\`\`typescript
${codeContent}
\`\`\`

TASK:

1. Analyze the reported bug.
2. Identify the exact root cause.
3. Correct the bug.
4. Return the COMPLETE corrected version of the file.
5. Preserve all unrelated working functionality.
6. Do not omit existing classes, interfaces or methods.
7. Do not return markdown code fences inside proposedFixCode.
`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: PatchGenerationSchema,
                temperature: 0.2
            }
        })
    );
    const rawText = response.text;
    if (!rawText) {
        throw new Error('Received empty fix response from Gemini.');
    }

    const parsed = JSON.parse(rawText);

    if (typeof parsed.proposedFixCode !== 'string' || parsed.proposedFixCode.trim().length === 0) {
        throw new Error('Gemini returned invalid proposedFixCode.');
    }
    return parsed;
}

// ============================================================
// SELF-HEALING FIX GENERATION
// ============================================================

async function generateRepairFromTestFailure(
    title: string,
    description: string,
    filePath: string,
    currentCode: string,
    testOutput: string
) {

    console.log(
        '[Self-Healing Agent]: 🧠 Sending test failure back to Gemini...'
    );

    const response = await retryWithBackoff(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
You are an autonomous software repair agent.

The previous AI-generated fix was applied to the repository,
but the automated tests failed.

Analyze the failure and generate a corrected COMPLETE version
of the affected source file.

ORIGINAL BUG:

Title:
${title}

Description:
${description}

AFFECTED FILE:
${filePath}

CURRENT CODE:

\`\`\`typescript
${currentCode}
\`\`\`

TEST FAILURE:

\`\`\`
${testOutput}
\`\`\`

IMPORTANT:

If the failure is caused by the test runner, operating system,
Node.js/npm environment, missing executable, or infrastructure,
DO NOT invent an application-code fix.

Only modify the source code when the test output provides
evidence that the application source code is incorrect.

INSTRUCTIONS:

1. Analyze the test failure.
2. Identify the root cause.
3. Correct the implementation if the source code is responsible.
4. Return the COMPLETE corrected source file.
5. Preserve unrelated working functionality.
6. Do not remove existing interfaces, classes or methods.
7. Do not return markdown code fences inside proposedFixCode.
`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: PatchGenerationSchema,
                temperature: 0.1
            }
        })
    );

    const rawText = response.text;

    if (!rawText) {

        throw new Error('Gemini returned an empty repair response.');
    }

    const repair = JSON.parse(rawText);
    if (typeof repair.proposedFixCode !== 'string' || repair.proposedFixCode.trim().length === 0) {
        throw new Error('Gemini returned invalid proposedFixCode.');
    }

    console.log('[Self-Healing Agent]: 🩹 New repair generated.');
    return repair;
}

// ============================================================
// MAIN WEBHOOK
// ============================================================

app.post('/api/webhook/ticket', async (
    req: Request,
    res: Response
): Promise<void> => {

    let backupPath: string | null = null;
    let absoluteFilePath: string | null = null;
    try {
        const { title, description } = req.body;

        // --------------------------------------------------------
        // VALIDATE REQUEST
        // --------------------------------------------------------

        if (!title || !description) {

            res.status(400).json({
                success: false,
                error: 'Missing title or description in payload'
            });
            return;
        }

        console.log(
            `\n[Agent Core]: 📥 Triage requested for arriving issue: "${title}"`
        );

        // --------------------------------------------------------
        // CREATE BUG EMBEDDING
        // --------------------------------------------------------

        console.log(
            '[Agent Core]: 🧠 Translating text bug into vector using Gemini...'
        );

        const bugEmbedding =
            await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: `${title}\n${description}`,
                config: {
                    outputDimensionality: 768
                }
            });

        const bugVectorValues = bugEmbedding.embeddings?.[0]?.values;

        if (!bugVectorValues || bugVectorValues.length !== 768) {

            console.error('[Embedding Error]: Unexpected Gemini embedding response:',
                JSON.stringify(bugEmbedding, null, 2)
            );

            throw new Error(
                `Invalid embedding vector. Expected 768 dimensions, got ${bugVectorValues?.length ?? 0} dimensions.`
            );
        }

        console.log(
            `[Agent Core]: ✅ Bug embedding generated successfully (${bugVectorValues.length} dimensions)`
        );

        // --------------------------------------------------------
        // PINECONE SEARCH
        // --------------------------------------------------------

        console.log(
            '[Agent Core]: 🌲 Searching Pinecone Cloud for relevant codebase segments...'
        );

        const searchResponse =
            await index.query({
                vector: bugVectorValues,
                topK: 1,
                includeMetadata: true
            });

        const matchingRecord = searchResponse.matches?.[0];

        if (!matchingRecord || !matchingRecord.metadata) {

            console.log(
                '[Agent Warning]: No codebase memory match located in Pinecone index.'
            );

            res.status(404).json({
                success: false,
                error: 'No matching codebase source contexts available.'
            });

            return;
        }

        const relevantFilePath =
            matchingRecord.metadata.filePath;

        const relevantCodeContent =
            matchingRecord.metadata.codeSnippet;

        if (
            typeof relevantFilePath !== 'string' ||
            typeof relevantCodeContent !== 'string'
        ) {

            throw new Error(
                'Pinecone metadata is missing filePath or codeSnippet.'
            );
        }

        console.log(
            `[Agent Core]: 🎯 Target isolated! Highly similar context found in file: [${relevantFilePath}]`
        );

        // --------------------------------------------------------
        // INITIAL GEMINI FIX
        // --------------------------------------------------------

        const finalProposedPatch =
            await generateInitialFix(
                title,
                description,
                relevantFilePath,
                relevantCodeContent
            );

        console.log(
            '[Agent Core]: ✅ Full solution path successfully architected!'
        );

        let currentCode =
            finalProposedPatch.proposedFixCode;

        let latestAnalysis =
            finalProposedPatch;

        // --------------------------------------------------------
        // RESOLVE FILE
        // --------------------------------------------------------

        absoluteFilePath =
            resolveRepoFile(
                relevantFilePath
            );

        // --------------------------------------------------------
        // BACKUP ORIGINAL
        // --------------------------------------------------------

        backupPath =
            await backupFile(
                absoluteFilePath
            );

        // --------------------------------------------------------
        // APPLY INITIAL FIX
        // --------------------------------------------------------

        await applyFix(
            relevantFilePath,
            currentCode
        );

        // --------------------------------------------------------
        // RUN INITIAL TEST
        // --------------------------------------------------------

        let currentTestResult =
            await runTests();

        let repairAttempts =
            1;

        // --------------------------------------------------------
        // SELF-HEALING LOOP
        // --------------------------------------------------------

        while (
            !currentTestResult.passed &&
            repairAttempts < MAX_REPAIR_ATTEMPTS
        ) {

            console.log(
                `[Self-Healing Agent]: 🔄 Attempt ${repairAttempts} failed. Starting repair cycle...`
            );

            const repair =
                await generateRepairFromTestFailure(

                    title,

                    description,

                    relevantFilePath,

                    currentCode,

                    currentTestResult.output
                );

            latestAnalysis =
                repair;

            currentCode =
                repair.proposedFixCode;

            await applyFix(
                relevantFilePath,
                currentCode
            );

            repairAttempts++;

            currentTestResult =
                await runTests();
        }

        // --------------------------------------------------------
        // REPAIR FAILED
        // --------------------------------------------------------

        if (!currentTestResult.passed) {

            console.log(
                `[Self-Healing Agent]: 🛑 Repair failed after ${repairAttempts} attempts.`
            );

            if (
                backupPath &&
                absoluteFilePath
            ) {

                await fs.copyFile(
                    backupPath,
                    absoluteFilePath
                );

                console.log(
                    '[Repair Agent]: 🔙 Original file restored.'
                );
            }

            res.status(422).json({

                success: false,

                status:
                    'repair_failed',

                isolatedTargetFile:
                    relevantFilePath,

                attempts:
                    repairAttempts,

                aiAnalysis:
                    latestAnalysis,

                tests: {

                    passed:
                        false,

                    output:
                        currentTestResult.output
                }
            });

            return;
        }

        // --------------------------------------------------------
        // TESTS PASSED
        // --------------------------------------------------------

        console.log(
            `[Self-Healing Agent]: 🎉 Tests passed after ${repairAttempts} attempt(s)!`
        );

        // --------------------------------------------------------
        // GITHUB AUTOMATION
        // --------------------------------------------------------

        console.log(
            '[GitHub Agent]: 🚀 Tests passed. Starting GitHub automation...'
        );

        const branchName =
            `agent/fix-${Date.now()}`;

        await createFixBranch(
            branchName
        );

        await commitFileToBranch(
            branchName,
            relevantFilePath,
            currentCode,
            `fix: ${title}`
        );

        const pullRequest = await createPullRequest(
            branchName,
            `fix: ${title}`,
            `## 🤖 AgenticSprint Automated Fix
                ### Reported Issue
                ${description}
                ### Affected File
                \`${relevantFilePath}\`
                ### Repair Attempts
                ${repairAttempts}
                ### Test Status
                ✅ All automated tests passed.
                ### Automated Workflow
                Ticket
                → Code Retrieval
                → Gemini Fix
                → Automated Test
                → Self-Healing
                → Git Branch
                → Commit
                → Pull Request
                This Pull Request was created automatically after successful validation.`);

        const githubResult = {
            branchName,
            pullRequestUrl: pullRequest.url,
            pullRequestNumber: pullRequest.number
        };

        // --------------------------------------------------------
        // REMOVE LOCAL BACKUP
        // --------------------------------------------------------

        if (backupPath) {
            try {
                await fs.unlink(backupPath);
                console.log('[Repair Agent]: 🧹 Temporary backup removed.');
            } catch (cleanupError) {
                console.warn('[Repair Agent]: ⚠️ Could not remove backup:', cleanupError);
            }
        }

        // --------------------------------------------------------
        // SUCCESS RESPONSE
        // --------------------------------------------------------

        res.status(200).json({
            success: true,
            status: 'repair_successful',
            isolatedTargetFile: relevantFilePath,
            aiAnalysis: latestAnalysis,
            repair: {
                attempts: repairAttempts
            },
            tests: {
                passed: true,
                output: currentTestResult.output
            },
            github: {
                branch: githubResult.branchName,
                pullRequest: githubResult.pullRequestUrl,
                pullRequestNumber: githubResult.pullRequestNumber
            }
        });
    } catch (error) {
        console.error(
            '[Agent Core Failure]: Execution crash:',
            error
        );
        // --------------------------------------------------------
        // RESTORE ORIGINAL ON UNEXPECTED ERROR
        // --------------------------------------------------------

        if (backupPath && absoluteFilePath) {
            try {
                await fs.copyFile(backupPath, absoluteFilePath);
                console.log(
                    '[Repair Agent]: 🔙 Original file restored after unexpected failure.'
                );
            } catch (restoreError) {
                console.error('[Repair Agent]: ❌ Could not restore original file:', restoreError);
            }
        }

        res.status(500).json({
            success: false,
            error: 'Workflow failed while executing self-healing repair pipeline',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
);

// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 AgenticSprint Server fully connected and listening on http://localhost:${PORT}`);
});
