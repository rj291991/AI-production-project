import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

import { DATABASE_SCHEMA } from './db-schema';

dotenv.config();

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const index = pc.index<RecordMetadata>('agentic-sprint');

async function analyzeBug(bugReport: string) {
    try {
        console.log(`🐛 Bug Report: ${bugReport}`);

        // --------------------------------------------------
        // 1. Generate embedding for bug report
        // --------------------------------------------------

        console.log('🧠 Generating bug embedding...');

        const embeddingResponse = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: bugReport,
            config: {
                outputDimensionality: 768
            }
        });

        const bugEmbedding =
            embeddingResponse.embeddings?.[0]?.values;

        if (!bugEmbedding || bugEmbedding.length !== 768) {
            throw new Error(
                `Failed to generate bug embedding. Got ${
                    bugEmbedding?.length ?? 0
                } dimensions.`
            );
        }

        // --------------------------------------------------
        // 2. Search relevant code from Pinecone
        // --------------------------------------------------

        console.log('🌲 Searching codebase...');

        const searchResults = await index.query({
            vector: bugEmbedding,
            topK: 15,
            includeMetadata: true
        });

        const matches = searchResults.matches ?? [];

        if (matches.length === 0) {
            throw new Error(
                'No relevant code found in Pinecone.'
            );
        }

        // --------------------------------------------------
        // 3. Build relevant code context
        // --------------------------------------------------

        const relevantCode = matches
            .map((match, index) => {
                const metadata = match.metadata;

                const filePath =
                    metadata?.filePath ?? 'Unknown file';

                const codeSnippet =
                    metadata?.codeSnippet ?? 'No code available';

                const score =
                    match.score?.toFixed(6) ?? 'N/A';

                return `
#${index + 1}
FILE: ${filePath}
SCORE: ${score}

CODE:
${codeSnippet}
`;
            })
            .join('\n-----------------------------\n');

        // --------------------------------------------------
        // 4. Build Gemini RCA prompt
        // --------------------------------------------------

        console.log('🤖 Asking Gemini to analyze the bug...');

        const prompt = `
You are a senior software engineer performing
Root Cause Analysis (RCA) on a production backend codebase.

Your job is to identify the most likely root cause of
the reported bug using ONLY the evidence provided below.

==================================================
BUG REPORT
==================================================

${bugReport}

==================================================
DATABASE SCHEMA
==================================================

${DATABASE_SCHEMA}

==================================================
RELEVANT CODE RETRIEVED FROM CODEBASE
==================================================

${relevantCode}

==================================================
ANALYSIS RULES
==================================================

1. Use BOTH the application code and database schema.

2. Do NOT invent database schema definitions.

3. If the provided schema says a column has a DEFAULT,
   do not claim that the column is missing a default.

4. Clearly distinguish:
   - Confirmed evidence
   - Assumptions
   - Possible causes

5. Do not call an assumption a confirmed root cause.

6. If the available evidence is insufficient to determine
   the root cause, explicitly say that the root cause
   cannot be confirmed.

7. Pay attention to:
   - SQL queries
   - database constraints
   - foreign keys
   - validation
   - service logic
   - controller logic
   - route configuration
   - relationships between tables

8. Check whether the retrieved code actually contains
   the code responsible for the reported bug.

9. If the code and schema are consistent, say so instead
   of inventing a mismatch.

10. Prefer a specific evidence-backed explanation over
    generic possibilities.

==================================================
OUTPUT FORMAT
==================================================

Provide the analysis using exactly these sections:

## 1. Root Cause

Explain the most likely root cause.

Clearly label whether it is:

- CONFIRMED
- LIKELY
- POSSIBLE
- UNKNOWN

Explain the evidence supporting the conclusion.

## 2. Affected Files

List only files that are actually relevant
to the reported bug.

For each file explain why it is relevant.

## 3. Relevant Functions

List the functions involved in the failure path.

## 4. Why the Bug Happens

Explain the execution flow step-by-step.

Include the interaction between application code
and database schema where relevant.

## 5. Evidence

Separate:

### Confirmed Evidence
Facts directly visible in the provided code/schema.

### Assumptions
Things that are not directly confirmed.

### Missing Evidence
Information that would be required to confirm
the root cause.

## 6. Suggested Fix

Suggest fixes only for issues supported by evidence.

Do not modify working code just because a potential
problem is theoretically possible.

## 7. Tests

Suggest tests that would verify the suspected root cause
and prevent regression.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        console.log(
            '\n================ ROOT CAUSE ANALYSIS ================\n'
        );

        console.log(
            response.text ?? 'No analysis generated.'
        );

        console.log(
            '\n=======================================================\n'
        );

    } catch (error) {
        console.error(
            '❌ Bug analysis failed:',
            error
        );
    }
}

const bugReport = process.argv.slice(2).join(' ').trim();

if (!bugReport) {
    console.error(
        '❌ Please provide a bug report.'
    );

    console.error(
        'Example: npx tsx analyze-bug.ts "Restaurant creation is failing"'
    );

    process.exit(1);
}

analyzeBug(bugReport);
