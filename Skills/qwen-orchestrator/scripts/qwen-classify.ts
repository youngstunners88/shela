#!/usr/bin/env bun
/**
 * Qwen Task Classifier
 * Classifies task complexity to recommend the optimal Qwen 3.5 model
 */

const TASK_COMPLEXITY_KEYWORDS = {
  simple: [
    'fix typo', 'update comment', 'rename variable', 'format code',
    'simple', 'quick', 'minor', 'trivial', 'small'
  ],
  low: [
    'add log', 'update config', 'change text', 'add field',
    'update readme', 'documentation', 'comment'
  ],
  medium: [
    'implement', 'add feature', 'refactor', 'update', 'modify',
    'create component', 'add endpoint', 'write test'
  ],
  high: [
    'architecture', 'design', 'security', 'authentication', 'authorization',
    'oauth', 'encryption', 'database schema', 'migration', 'api design'
  ],
  critical: [
    'redesign', 'major refactor', 'system design', 'microservice',
    'distributed', 'scalability', 'performance critical', 'security audit'
  ]
};

const MODEL_RECOMMENDATIONS = {
  simple: 'qwen-3.5-0.8b',
  low: 'qwen-3.5-2b',
  medium: 'qwen-3.5-4b',
  high: 'qwen-3.5-9b',
  critical: 'qwen-3.5-27b'
};

const MODEL_DETAILS = {
  'qwen-3.5-0.8b': { params: '0.9B', cost_per_1m_tokens: 0.05, best_for: 'Simple tasks, classification' },
  'qwen-3.5-2b': { params: '2B', cost_per_1m_tokens: 0.10, best_for: 'Lightweight agents, summaries' },
  'qwen-3.5-4b': { params: '5B', cost_per_1m_tokens: 0.20, best_for: 'Balanced performance' },
  'qwen-3.5-9b': { params: '10B', cost_per_1m_tokens: 0.40, best_for: 'Code generation, complex reasoning' },
  'qwen-3.5-27b': { params: '28B', cost_per_1m_tokens: 1.00, best_for: 'Advanced coding, architecture' },
  'qwen-3.5-35b-a3b': { params: '36B (MoE)', cost_per_1m_tokens: 0.60, best_for: 'Efficient scaling, multi-file' },
  'qwen-3.5-122b-a10b': { params: '125B (MoE)', cost_per_1m_tokens: 1.50, best_for: 'Heavy tasks, research' }
};

function classifyComplexity(task: string): string {
  const lowerTask = task.toLowerCase();
  
  // Check each complexity level
  for (const [level, keywords] of Object.entries(TASK_COMPLEXITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerTask.includes(keyword)) {
        return level;
      }
    }
  }
  
  // Default based on length and code indicators
  const codeIndicators = ['function', 'class', 'method', 'api', 'interface', 'type'];
  const hasCode = codeIndicators.some(ind => lowerTask.includes(ind));
  
  if (task.length > 500) return 'high';
  if (task.length > 200 || hasCode) return 'medium';
  return 'low';
}

function recommendModel(task: string): { model: string; complexity: string; details: typeof MODEL_DETAILS[string] } {
  const complexity = classifyComplexity(task);
  const model = MODEL_RECOMMENDATIONS[complexity as keyof typeof MODEL_RECOMMENDATIONS];
  
  return {
    model,
    complexity,
    details: MODEL_DETAILS[model as keyof typeof MODEL_DETAILS]
  };
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Qwen Task Classifier

Usage: bun qwen-classify.ts "Your task description"

Options:
  --json    Output as JSON
  --help    Show this help

Examples:
  bun qwen-classify.ts "Fix typo in README"
  bun qwen-classify.ts "Implement OAuth2 authentication with Google and GitHub"
`);
  process.exit(0);
}

const task = args.filter(a => !a.startsWith('--')).join(' ');
const asJson = args.includes('--json');

const result = recommendModel(task);

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`
Task: ${task}
Complexity: ${result.complexity}
Recommended Model: ${result.model}
Model Size: ${result.details.params}
Est. Cost: $${result.details.cost_per_1m_tokens}/1M tokens
Best For: ${result.details.best_for}
`);
}
