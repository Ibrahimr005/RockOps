#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectContextGenerator {
    constructor(rootDir = process.cwd()) {
        this.rootDir = rootDir;
        this.contextFile = path.join(rootDir, '.cursor-context.md');
    }

    // Analyze project structure
    analyzeStructure(dir = this.rootDir, depth = 0, maxDepth = 3) {
        if (depth > maxDepth) return [];

        const items = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (this.shouldIgnore(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.rootDir, fullPath);

            if (entry.isDirectory()) {
                items.push({
                    type: 'directory',
                    name: entry.name,
                    path: relativePath,
                    children: this.analyzeStructure(fullPath, depth + 1, maxDepth)
                });
            } else {
                items.push({
                    type: 'file',
                    name: entry.name,
                    path: relativePath,
                    extension: path.extname(entry.name),
                    size: fs.statSync(fullPath).size
                });
            }
        }

        return items.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    }

    // Extract package.json info (check frontend directory first)
    getPackageInfo() {
        const locations = [
            path.join(this.rootDir, 'frontend', 'package.json'),
            path.join(this.rootDir, 'package.json')
        ];

        for (const packagePath of locations) {
            try {
                if (fs.existsSync(packagePath)) {
                    const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                    packageInfo._location = path.relative(this.rootDir, packagePath);
                    return packageInfo;
                }
            } catch (error) {
                console.warn(`Could not read ${packagePath}:`, error.message);
            }
        }
        return null;
    }

    // Detect framework/tech stack
    detectTechStack() {
        const packageInfo = this.getPackageInfo();
        if (!packageInfo) return [];

        const dependencies = {
            ...packageInfo.dependencies,
            ...packageInfo.devDependencies
        };

        const stack = [];

        // Frontend frameworks
        if (dependencies.react) stack.push('React ' + (dependencies.react.replace('^', '')));
        if (dependencies.vue) stack.push('Vue.js');
        if (dependencies.angular) stack.push('Angular');
        if (dependencies.svelte) stack.push('Svelte');
        if (dependencies.next) stack.push('Next.js');
        if (dependencies.nuxt) stack.push('Nuxt.js');
        if (dependencies.vite) stack.push('Vite ' + (dependencies.vite.replace('^', '')));

        // HTTP clients
        if (dependencies.axios) stack.push('Axios');
        if (dependencies.fetch) stack.push('Fetch API');

        // Styling
        if (dependencies.sass) stack.push('Sass/SCSS');
        if (dependencies.tailwindcss) stack.push('Tailwind CSS');
        if (dependencies['styled-components']) stack.push('Styled Components');

        // Routing
        if (dependencies['react-router-dom']) stack.push('React Router v' + dependencies['react-router-dom'].replace('^', '').charAt(0));

        // WebSocket
        if (dependencies['@stomp/stompjs']) stack.push('STOMP.js WebSocket');

        // Icons
        if (dependencies['lucide-react']) stack.push('Lucide React Icons');
        if (dependencies['react-icons']) stack.push('React Icons');

        // Charts
        if (dependencies.recharts) stack.push('Recharts');
        if (dependencies['chart.js']) stack.push('Chart.js');

        // Internationalization
        if (dependencies.i18next) stack.push('i18next');

        // File processing
        if (dependencies.xlsx) stack.push('Excel file processing (xlsx)');

        // Modals
        if (dependencies['react-modal']) stack.push('React Modal');

        // Backend frameworks
        if (dependencies.express) stack.push('Express.js');
        if (dependencies.fastify) stack.push('Fastify');
        if (dependencies.koa) stack.push('Koa.js');

        // Databases
        if (dependencies.mongoose) stack.push('MongoDB (Mongoose)');
        if (dependencies.pg) stack.push('PostgreSQL');
        if (dependencies.mysql2) stack.push('MySQL');
        if (dependencies.prisma) stack.push('Prisma ORM');

        // Styling
        if (dependencies.tailwindcss) stack.push('Tailwind CSS');
        if (dependencies['styled-components']) stack.push('Styled Components');

        // Build tools
        if (dependencies.vite) stack.push('Vite');
        if (dependencies.webpack) stack.push('Webpack');

        return stack;
    }

    // Find recent files (modified in last 7 days)
    getRecentFiles() {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentFiles = [];

        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (this.shouldIgnore(entry.name)) continue;

                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    const stats = fs.statSync(fullPath);
                    if (stats.mtime.getTime() > weekAgo) {
                        recentFiles.push({
                            path: path.relative(this.rootDir, fullPath),
                            modified: stats.mtime.toISOString()
                        });
                    }
                }
            }
        };

        scanDir(this.rootDir);
        return recentFiles.sort((a, b) => b.modified.localeCompare(a.modified));
    }

    // Check what files to ignore
    shouldIgnore(name) {
        const ignorePatterns = [
            'node_modules', '.git', '.next', 'dist', 'build', '.nuxt',
            'coverage', '.nyc_output', '.vscode', '.idea', 'target',
            '.DS_Store', 'Thumbs.db', '*.log', '.env*',
            '.cursor-context.md', '.cursorrules'
        ];

        return ignorePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(name);
            }
            return name === pattern;
        });
    }

    // Generate the context markdown
    generateContext() {
        const packageInfo = this.getPackageInfo();
        const techStack = this.detectTechStack();
        const structure = this.analyzeStructure();
        const recentFiles = this.getRecentFiles();

        let content = `# RockOps Project Context for Cursor AI

*Auto-generated on: ${new Date().toISOString()}*

## Project Overview
- **Name**: ${packageInfo?.name || 'RockOps Mining Site Management'}
- **Version**: ${packageInfo?.version || 'Unknown'}
- **Description**: ${packageInfo?.description || 'Mining site management system with Spring Boot backend and React frontend'}
- **Package.json Location**: ${packageInfo?._location || 'Not found'}

## Project Type
- **Architecture**: Full-stack application (Frontend + Backend)
- **Frontend**: React/JavaScript (in /frontend directory)
- **Backend**: Spring Boot/Java (in /backend directory)

## Technology Stack
${techStack.length ? techStack.map(tech => `- ${tech}`).join('\n') : '- Frontend technologies detected from package.json'}
- **Backend**: Spring Boot 3.4.5 + Java 21
- **Database**: PostgreSQL
- **Storage**: MinIO (local) / Cloudflare R2 (production)
- **Authentication**: JWT + Role-based

## Project Structure
\`\`\`
${this.formatStructure(structure)}
\`\`\`

## Recently Modified Files (Last 7 days)
${recentFiles.length ? recentFiles.slice(0, 10).map(file =>
            `- \`${file.path}\` (${new Date(file.modified).toLocaleDateString()})`
        ).join('\n') : 'No recent changes detected'}

## Available Scripts
${packageInfo?.scripts ? Object.entries(packageInfo.scripts).map(([name, script]) =>
            `- \`npm run ${name}\`: ${script}`
        ).join('\n') : 'No scripts defined'}

## Key Dependencies
${packageInfo?.dependencies ? Object.keys(packageInfo.dependencies).slice(0, 10).map(dep => `- ${dep}`).join('\n') : 'No dependencies found'}

---
*This file is auto-generated and should not be committed to git*
`;

        return content;
    }

    formatStructure(items, indent = '') {
        return items.map(item => {
            if (item.type === 'directory') {
                const children = item.children?.length
                    ? '\n' + this.formatStructure(item.children, indent + '  ')
                    : '';
                return `${indent}${item.name}/` + children;
            } else {
                return `${indent}${item.name}`;
            }
        }).join('\n');
    }

    // Generate and save the context file
    generate() {
        try {
            const content = this.generateContext();
            fs.writeFileSync(this.contextFile, content, 'utf8');
            console.log(`✅ Context file generated: ${this.contextFile}`);

            // Add to .gitignore if not already there
            this.addToGitignore();

        } catch (error) {
            console.error('❌ Error generating context:', error.message);
        }
    }

    addToGitignore() {
        const gitignorePath = path.join(this.rootDir, '.gitignore');
        const contextFileName = '.cursor-context.md';

        try {
            let gitignoreContent = '';
            if (fs.existsSync(gitignorePath)) {
                gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            }

            if (!gitignoreContent.includes(contextFileName)) {
                const newContent = gitignoreContent +
                    (gitignoreContent.endsWith('\n') ? '' : '\n') +
                    `\n# Cursor AI context file\n${contextFileName}\n`;
                fs.writeFileSync(gitignorePath, newContent, 'utf8');
                console.log('✅ Added to .gitignore');
            }
        } catch (error) {
            console.warn('⚠️  Could not update .gitignore:', error.message);
        }
    }
}

// Run the generator
if (require.main === module) {
    const generator = new ProjectContextGenerator();
    generator.generate();
}

module.exports = ProjectContextGenerator;