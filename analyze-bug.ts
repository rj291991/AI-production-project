import {
    Pinecone,
    RecordMetadata,
} from '@pinecone-database/pinecone';

import {
    GoogleGenAI,
    FunctionCallingConfigMode,
    type Tool,
} from '@google/genai';

import dotenv from 'dotenv';

import { DATABASE_SCHEMA } from './db-schema';

import {
    listFiles,
    readFile,
    searchCode,
} from './codebase-tools';

dotenv.config();

// ==================================================
// CLIENT INITIALIZATION
// ==================================================

const pineconeApiKey =
    process.env.PINECONE_API_KEY;

const geminiApiKey =
    process.env.GEMINI_API_KEY;

if (!pineconeApiKey) {
    throw new Error(
        'PINECONE_API_KEY is missing from environment variables.'
    );
}

if (!geminiApiKey) {
    throw new Error(
        'GEMINI_API_KEY is missing from environment variables.'
    );
}

const pc = new Pinecone({
    apiKey: pineconeApiKey,
});

const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
});

const index =
    pc.index<RecordMetadata>('agentic-sprint');

// ==================================================
// AI TOOLS
// ==================================================

const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'listFiles',
                description:
                    'List source files available in the repository. Protected files and directories are excluded.',
                parameters: {
                    type: 'OBJECT',
                    properties: {},
                },
            },

            {
                name: 'readFile',

                description:
                    'Read the contents of a source file from the repository. Use this when exact code context is required.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        relativePath: {
                            type: 'STRING',
                            description:
                                'Repository-relative file path.',
                        },
                    },
                    required: [
                        'relativePath',
                    ],
                },
            },
            {
                name: 'searchCode',
                description:
                    'Search exact text across the source code. Use this to find functions, SQL fragments, imports, callers, parameters, and usages.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        query: {
                            type: 'STRING',
                            description:
                                'Text to search for in the repository.',
                        },
                    },
                    required: [
                        'query',
                    ],
                },
            },
        ],
    },
];

// ==================================================
// TOOL EXECUTION
// ==================================================

async function executeTool(
    name: string,
    args: Record<string, unknown>
): Promise<unknown> {

    switch (name) {

        case 'listFiles':
            return listFiles();

        case 'readFile':
            return readFile(
                String(
                    args.relativePath ?? ''
                )
            );

        case 'searchCode':
            return searchCode(
                String(
                    args.query ?? ''
                )
            );

        default:
            throw new Error(
                `Unknown tool requested: ${name}`
            );
    }
}

// ==================================================
// BUG ANALYSIS
// ==================================================

async function analyzeBug(
    bugReport: string
) {

    try {

        console.log(
            `\n🐛 Bug Report: ${bugReport}\n`
        );

        // ==================================================
        // 1. GENERATE BUG EMBEDDING
        // ==================================================

        console.log(
            '🧠 Generating bug embedding...'
        );

        const embeddingResponse =
            await ai.models.embedContent({

                model:
                    'gemini-embedding-001',

                contents:
                    bugReport,

                config: {
                    outputDimensionality: 768,
                },
            });

        const bugEmbedding =
            embeddingResponse
                .embeddings?.[0]
                ?.values;

        if (
            !bugEmbedding ||
            bugEmbedding.length !== 768
        ) {

            throw new Error(
                `Failed to generate bug embedding. Got ${bugEmbedding?.length ?? 0
                } dimensions.`
            );
        }

        console.log(
            `✅ Bug embedding generated: ${bugEmbedding.length} dimensions`
        );

        // ==================================================
        // 2. PINECONE SEARCH
        // ==================================================

        console.log(
            '🌲 Searching codebase...'
        );

        const searchResults =
            await index.query({

                vector:
                    bugEmbedding,

                topK: 15,

                includeMetadata:
                    true,
            });

        const matches =
            searchResults.matches ??
            [];

        console.log(
            `📌 Pinecone returned ${matches.length} matches`
        );

        const relevantCode =
            matches
                .map(
                    (
                        match,
                        matchIndex
                    ) => {

                        const metadata =
                            match.metadata;

                        return `
#${matchIndex + 1}

FILE:
${metadata?.filePath ??
                            'Unknown file'
                            }

SCORE:
${match.score?.toFixed(6) ??
                            'N/A'
                            }

CODE:
${metadata?.codeSnippet ??
                            'No code available'
                            }
`;
                    }
                )
                .join(
                    '\n-----------------------------\n'
                );

        // ==================================================
        // 3. AGENT PROMPT
        // ==================================================

        const prompt = `You are a senior production software engineer performing
evidence-driven Root Cause Analysis (RCA).

You have READ-ONLY access to the repository through tools.

Your job is NOT to guess the most plausible explanation.

Your job is to INVESTIGATE the reported bug, identify
candidate causes, verify them using repository evidence,
and only then determine the root cause.

==================================================
BUG REPORT
==================================================

${bugReport}

==================================================
DATABASE SCHEMA
==================================================

${DATABASE_SCHEMA}

==================================================
SEMANTICALLY RETRIEVED CODE
==================================================

${relevantCode}

==================================================
CORE INVESTIGATION PRINCIPLE
==================================================

Pinecone results are ONLY hints.

Pinecone does NOT represent the complete repository
and must NEVER be treated as proof.

Repository tools are the source of truth:

- listFiles
- searchCode
- readFile

If important information is missing from Pinecone results,
use repository tools to obtain it.

Do NOT guess when the repository can be inspected.

==================================================
INVESTIGATION WORKFLOW
==================================================

Follow this investigation process:

PHASE 1 — LOCATE

1. Identify the feature/module related to the bug.
2. Locate the relevant entry point.
3. Find the important functions, classes, queries,
   services, repositories, and dependencies.

PHASE 2 — TRACE EXECUTION

Trace the actual execution path from the entry point.

For example:

controller
  -> service
  -> repository
  -> database

Where applicable, also inspect:

request
  -> validation
  -> transformation
  -> business logic
  -> database
  -> response/error handling

Do not stop after finding one suspicious function.

PHASE 3 — IDENTIFY CANDIDATE CAUSES

Look for concrete defects such as:

- incorrect arguments
- incorrect parameter ordering
- missing parameters
- wrong return values
- incorrect conditions
- missing validation
- incorrect validation
- incorrect data transformation
- SQL mistakes
- schema mismatches
- incorrect function calls
- incorrect imports
- incorrect error handling
- incorrect assumptions between layers
- caller/callee contract mismatches

Do not treat normal-looking code as evidence of failure.

PHASE 4 — FORM HYPOTHESES

When suspicious behavior is found, treat it as a
HYPOTHESIS first.

Do NOT immediately call it the root cause.

For every important hypothesis, determine:

1. What exactly is suspected?
2. Why could it cause the reported bug?
3. What evidence would prove it?
4. Which repository tools can obtain that evidence?
5. Is there evidence that contradicts the hypothesis?

PHASE 5 — VERIFY

Use repository tools to verify the hypothesis.

Inspect:

- callers
- function arguments
- function signatures
- dependent functions
- validation
- data transformations
- SQL
- schema
- error handling
- related configuration
- relevant usages

Search for actual callers/usages when necessary.

If you find a suspicious function, inspect how it is
called before confirming it as the root cause.

PHASE 6 — CHECK COMPETING CAUSES

If multiple causes are possible:

1. Investigate each important candidate.
2. Collect evidence for each.
3. Eliminate candidates that contradict the code.
4. Keep unsupported candidates as POSSIBLE or UNKNOWN.

Do not select a root cause merely because it sounds plausible.

PHASE 7 — FINAL VERIFICATION

Before producing the final RCA, ask:

- Did I actually locate the defect?
- Did I verify the relevant execution path?
- Did I inspect the callers and arguments?
- Did I inspect the database interaction if relevant?
- Did I inspect the schema if relevant?
- Did I verify the suspected failure mechanism?
- Is any critical fact still an assumption?
- Is there contradictory evidence?
- Could another investigated cause explain the bug?

If critical evidence is missing, do NOT mark the root cause
as CONFIRMED.

==================================================
CONFIDENCE DEFINITIONS
==================================================

CONFIRMED

Use CONFIRMED ONLY when:

- the defect is directly visible in the source code/schema,
- the failure mechanism is established,
- the relevant execution path has been verified,
- and no critical assumption is required.

A missing runtime error, actual input, caller behavior,
or other critical fact means CONFIRMED may not be justified.

LIKELY

Use LIKELY when:

- strong source-code evidence supports the hypothesis,
- the suspected defect is credible,
- but one important piece of evidence needed for full
  confirmation is unavailable.

POSSIBLE

Use POSSIBLE when:

- the code allows the reported failure,
- but evidence is weak,
- or multiple competing explanations remain.

UNKNOWN

Use UNKNOWN when:

- there is not enough evidence to identify a credible
  root cause.

UNKNOWN is an acceptable and correct result.

Never upgrade UNKNOWN or POSSIBLE to CONFIRMED just to
produce a more decisive answer.

==================================================
CRITICAL RULE: NEVER CONVERT ASSUMPTIONS INTO FACTS
==================================================

If you observe:

"opening_time is PostgreSQL TIME"

and:

"openingTime is passed as a string"

you may say:

"There is a potential type/format validation issue."

You may NOT say:

"Invalid time input is the confirmed root cause."

unless the evidence demonstrates that the actual failure
is caused by the invalid time input.

For example, evidence such as:

- actual invalid input
- database error
- stack trace
- verified failing execution path

may be required.

Clearly distinguish:

OBSERVED FACT
vs
INFERENCE
vs
ASSUMPTION

==================================================
SQL INVESTIGATION RULES
==================================================

For SQL-related bugs explicitly inspect:

1. INSERT/UPDATE/DELETE statement
2. Column count
3. VALUES count
4. Parameter numbers
5. Function arguments
6. SQL parameter arrays
7. Parameter ordering
8. RETURNING clause
9. Table schema
10. Foreign keys
11. NOT NULL constraints
12. Relevant unique constraints

Example:

Columns:

a, b, c, d, e, f

Values:

$1, $2, $3, $4, $5, $7

This is a concrete SQL defect.

But still verify that this query belongs to the
reported failing execution path.

==================================================
VALIDATION RULES
==================================================

Do not assume:

"Validation exists"

means:

"Validation is causing the bug."

Do not assume:

"Validation is missing"

means:

"Invalid input caused the current failure."

Determine what data actually flows through the code
and whether the suspected validation behavior explains
the reported failure.

==================================================
DATABASE RULES
==================================================

Do not assume:

"Database access exists"

means:

"Database is the problem."

Inspect the actual query, parameters, schema,
constraints, and relevant error handling.

==================================================
TOOL USAGE RULES
==================================================

Use:

listFiles
- when repository structure or relevant files are unknown.

searchCode
- to find functions
- callers
- usages
- imports
- SQL fragments
- schema references
- parameter names
- error messages

readFile
- when exact implementation context is required.

Prefer searchCode before guessing file locations.

If a function is important, inspect both:

1. its implementation
2. its callers/usages

==================================================
INVESTIGATION COMPLETION CHECKLIST
==================================================

Before final RCA, verify as many applicable items as possible:

[ ] Relevant entry point identified
[ ] Relevant implementation inspected
[ ] Execution path traced
[ ] Callers inspected
[ ] Arguments inspected
[ ] Dependencies inspected
[ ] Validation inspected
[ ] Data transformations inspected
[ ] Database interaction inspected
[ ] Schema inspected
[ ] Error handling inspected
[ ] Candidate causes considered
[ ] Important hypotheses investigated
[ ] Contradictory evidence checked
[ ] Root cause verification attempted
[ ] Missing evidence documented

Do not stop merely because one suspicious code section
has been found.

==================================================
NO FILE MODIFICATION
==================================================

You are strictly READ-ONLY.

Do NOT modify, create, delete, or rewrite repository files.

==================================================
CURRENT TASK
==================================================

Investigate the reported bug now.

Use repository tools as necessary.

Do not produce the final RCA until you have collected
enough evidence.

Your goal is:

BUG REPORT
    ↓
RELEVANT CODE
    ↓
EXECUTION FLOW
    ↓
CANDIDATE CAUSES
    ↓
EVIDENCE
    ↓
VERIFICATION
    ↓
ROOT CAUSE
    ↓
FIX
    ↓
TESTS

==================================================
FINAL RCA FORMAT
==================================================

## 1. Root Cause

Label:

CONFIRMED / LIKELY / POSSIBLE / UNKNOWN

State the root cause and explain exactly why the
selected confidence level is justified.

Do not hide missing evidence.

## 2. Affected Files

List only files that are actually relevant to the
identified cause.

## 3. Relevant Functions

List the functions directly involved.

## 4. Execution Flow

Explain the actual flow from entry point to failure.

Example:

controller
→ service
→ repository
→ database

## 5. Why the Bug Happens

Explain the concrete defect step by step.

Separate verified facts from inference.

## 6. Evidence

### Confirmed Evidence

Only directly verified facts from repository/schema/tool results.

### Assumptions

Facts that were inferred but not directly verified.

### Missing Evidence

Information required to fully verify the root cause
but unavailable from the repository.

## 7. Alternative Causes Considered

List important competing hypotheses and explain whether
they were:

- eliminated
- still possible
- unsupported

## 8. Suggested Fix

Suggest only fixes supported by the verified evidence.

Do not propose unrelated refactoring.

## 9. Tests

Provide tests that:

1. reproduce the defect
2. verify the fix
3. prevent regression

If the root cause is not CONFIRMED, clearly state which
tests or runtime evidence are needed to confirm it.
`;


        // ==================================================
        // 4. CONVERSATION STATE
        // ==================================================

        const conversation: Array<any> = [
            {
                role: 'user',

                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ];

        // ==================================================
        // 5. INITIAL AGENT REQUEST
        // ==================================================

        let response =
            await ai.models.generateContent({

                model:
                    'gemini-2.5-flash',

                contents:
                    conversation,

                config: {

                    tools,

                    toolConfig: {

                        functionCallingConfig: {

                            mode:
                                FunctionCallingConfigMode.AUTO,
                        },
                    },
                },
            });

        // ==================================================
        // 6. AGENT TOOL LOOP
        // ==================================================

        const MAX_TOOL_ROUNDS = 10;

        let completedNormally =
            false;

        for (
            let round = 0;
            round < MAX_TOOL_ROUNDS;
            round++
        ) {

            const functionCalls =
                response.functionCalls;

            // ----------------------------------------------
            // Agent finished
            // ----------------------------------------------

            if (
                !functionCalls ||
                functionCalls.length === 0
            ) {

                completedNormally =
                    true;

                break;
            }

            console.log(
                `\n🔎 Agent investigation round ${round + 1
                }/${MAX_TOOL_ROUNDS}`
            );

            // ----------------------------------------------
            // Preserve model response
            // ----------------------------------------------

            const modelContent =
                response.candidates?.[0]
                    ?.content;

            if (modelContent) {

                conversation.push(
                    modelContent
                );
            }

            // ----------------------------------------------
            // Execute tools
            // ----------------------------------------------

            const toolResponses: any[] =
                [];

            for (
                const call of functionCalls
            ) {

                const toolName =
                    call.name;

                if (!toolName) {

                    console.error(
                        '   ❌ Tool call did not contain a name.'
                    );

                    continue;
                }

                console.log(
                    `   🛠️ Tool: ${toolName}`
                );

                console.log(
                    `   📥 Args: ${JSON.stringify(
                        call.args ?? {}
                    )}`
                );

                try {

                    const result =
                        await executeTool(
                            toolName,
                            call.args ?? {}
                        );

                    console.log(
                        `   ✅ Tool completed: ${toolName}`
                    );

                    toolResponses.push({

                        functionResponse: {

                            name:
                                toolName,

                            response: {

                                result,
                            },
                        },
                    });

                } catch (toolError) {

                    const errorMessage =
                        toolError instanceof Error
                            ? toolError.message
                            : String(toolError);

                    console.error(
                        `   ❌ Tool failed: ${toolName}`
                    );

                    console.error(
                        `   ${errorMessage}`
                    );

                    toolResponses.push({

                        functionResponse: {

                            name:
                                toolName,

                            response: {

                                error:
                                    errorMessage,
                            },
                        },
                    });
                }
            }

            // ----------------------------------------------
            // Add tool results to history
            // ----------------------------------------------

            conversation.push({

                role: 'user',

                parts:
                    toolResponses,
            });

            // ----------------------------------------------
            // Continue investigation
            // ----------------------------------------------

            response =
                await ai.models.generateContent({

                    model:
                        'gemini-2.5-flash',

                    contents:
                        conversation,

                    config: {

                        tools,

                        toolConfig: {

                            functionCallingConfig: {

                                mode:
                                    FunctionCallingConfigMode.AUTO,
                            },
                        },
                    },
                });
        }

        // ==================================================
        // 7. MAX ROUND WARNING
        // ==================================================

        if (!completedNormally) {

            console.warn(
                `\n⚠️ Agent reached maximum tool rounds (${MAX_TOOL_ROUNDS}).`
            );

            console.warn(
                '⚠️ RCA may be incomplete because the investigation limit was reached.'
            );
        }

        // ==================================================
        // 8. FINAL RCA
        // ==================================================

        console.log(
            '\n================ ROOT CAUSE ANALYSIS ================\n'
        );

        console.log(
            response.text ??
            'No analysis generated.'
        );

        console.log(
            '\n=======================================================\n'
        );

    } catch (error) {

        console.error(
            '\n❌ Bug analysis failed:'
        );

        console.error(
            error
        );
    }
}

// ==================================================
// CLI INPUT
// ==================================================

const bugReport =
    process.argv
        .slice(2)
        .join(' ')
        .trim();

if (!bugReport) {

    console.error(
        '❌ Please provide a bug report.'
    );

    console.error(
        'Example:'
    );

    console.error(
        'npx tsx analyze-bug.ts "Branch creation is failing"'
    );

    process.exit(1);
}

// ==================================================
// START
// ==================================================

analyzeBug(
    bugReport
);
