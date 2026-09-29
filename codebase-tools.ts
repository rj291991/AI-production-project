import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd());

const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
]);

const BLOCKED_FILES = new Set([
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
]);

const ALLOWED_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.sql',
    '.json',
    '.md',
]);

function safePath(relativePath: string): string {
    const fullPath = path.resolve(PROJECT_ROOT, relativePath);

    if (
        fullPath !== PROJECT_ROOT &&
        !fullPath.startsWith(PROJECT_ROOT + path.sep)
    ) {
        throw new Error('Access denied: path is outside project root.');
    }

    const relative = path.relative(PROJECT_ROOT, fullPath);

    const parts = relative.split(path.sep);

    if (
        parts.some((part) => IGNORED_DIRS.has(part)) ||
        BLOCKED_FILES.has(path.basename(fullPath))
    ) {
        throw new Error('Access denied: protected path.');
    }

    return fullPath;
}

function isAllowedFile(filePath: string): boolean {
    if (BLOCKED_FILES.has(path.basename(filePath))) {
        return false;
    }

    const relative = path.relative(PROJECT_ROOT, filePath);

    if (
        relative
            .split(path.sep)
            .some((part) => IGNORED_DIRS.has(part))
    ) {
        return false;
    }

    return ALLOWED_EXTENSIONS.has(path.extname(filePath));
}

async function walkDirectory(
    directory: string,
    results: string[] = []
): Promise<string[]> {
    const entries = await fs.readdir(directory, {
        withFileTypes: true,
    });

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) {
            continue;
        }

        if (BLOCKED_FILES.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            await walkDirectory(fullPath, results);
            continue;
        }

        if (entry.isFile() && isAllowedFile(fullPath)) {
            results.push(
                path.relative(PROJECT_ROOT, fullPath)
            );
        }
    }

    return results;
}

export async function listFiles(): Promise<string[]> {
    return walkDirectory(PROJECT_ROOT);
}

export async function readFile(
    relativePath: string
): Promise<string> {
    const fullPath = safePath(relativePath);

    if (!isAllowedFile(fullPath)) {
        throw new Error(
            'Access denied: file type is not allowed.'
        );
    }

    return fs.readFile(fullPath, 'utf8');
}

export async function searchCode(
    query: string
): Promise<
    Array<{
        filePath: string;
        lineNumber: number;
        line: string;
    }>
> {
    const files = await listFiles();

    const results: Array<{
        filePath: string;
        lineNumber: number;
        line: string;
    }> = [];

    const search = query.toLowerCase();

    for (const file of files) {
        const content = await readFile(file);
        const lines = content.split(/\r?\n/);

        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(search)) {
                results.push({
                    filePath: file,
                    lineNumber: index + 1,
                    line: line.trim(),
                });
            }
        });
    }

    return results.slice(0, 100);
}
