import { useState, useEffect } from 'react';
import Button from '../shared/Button';
import type { AiAnalysis } from '../../types/models';

export default function AiAdvisorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);
  const [history, setHistory] = useState<AiAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && history.length === 0) {
      window.api.getAnalysisHistory().then(setHistory).catch(() => {});
    }
  }, [isOpen]);

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    setCopied(false);
    try {
      const prompt = await window.api.getPortfolioPrompt();
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCopying(false);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentAnalysis(null);
    setShowHistory(false);
    try {
      const result = await window.api.analyzePortfolio();
      setCurrentAnalysis(result.response);
      const updated = await window.api.getAnalysisHistory();
      setHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const viewPastAnalysis = (analysis: AiAnalysis) => {
    setCurrentAnalysis(analysis.response);
    setShowHistory(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        AI Portfolio Analysis
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsOpen(false); setCurrentAnalysis(null); setShowHistory(false); setError(null); setCopied(false); }} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">AI Portfolio Analysis</h2>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => { setShowHistory(!showHistory); setCurrentAnalysis(null); }}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                {showHistory ? 'Back' : `History (${history.length})`}
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); setCurrentAnalysis(null); setShowHistory(false); setError(null); setCopied(false); }}
              className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {showHistory ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">Past analyses — click to view:</p>
              {history.map(a => (
                <button
                  key={a.id}
                  onClick={() => viewPastAnalysis(a)}
                  className="w-full text-left bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl p-4 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-200">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {a.response.slice(0, 150)}...
                  </div>
                </button>
              ))}
            </div>
          ) : currentAnalysis ? (
            <div className="prose-invert">
              <MarkdownRenderer content={currentAnalysis} />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="text-sm font-medium text-red-400 mb-1">Analysis failed</div>
              <div className="text-sm text-red-300/80">{error}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400 text-sm mb-6">
                Get personalized AI-powered analysis of your entire portfolio — investment recommendations, debt strategy, risk warnings, and actionable next steps.
              </div>
              <div className="flex flex-col items-center gap-3">
                <Button onClick={handleCopyToClipboard} disabled={isCopying}>
                  {isCopying ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Building prompt...
                    </span>
                  ) : copied ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied! Paste into claude.ai
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy to Claude
                    </span>
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  Copies your full portfolio data + analysis prompt to clipboard.
                  <br />
                  Paste it into <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">claude.ai</a> for a free personalized analysis.
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-3">Or run directly with API key (requires Anthropic API credits)</p>
                <Button size="sm" variant="secondary" onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : 'Run via API'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with actions when viewing results */}
        {(currentAnalysis || error) && !showHistory && (
          <div className="border-t border-slate-700 p-4 shrink-0 flex gap-2">
            <Button size="sm" onClick={handleCopyToClipboard} disabled={isCopying}>
              {copied ? 'Copied!' : 'Copy to Claude'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Run via API'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple markdown-to-JSX renderer for the AI response */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-slate-100 mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-slate-100 mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-slate-100 mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-1">
          <span className="text-accent mt-0.5 shrink-0">•</span>
          <span className="text-sm text-slate-300"><InlineMarkdown text={line.slice(2)} /></span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 ml-2 my-1">
            <span className="text-accent font-medium text-sm shrink-0">{match[1]}.</span>
            <span className="text-sm text-slate-300"><InlineMarkdown text={match[2]} /></span>
          </div>
        );
      }
    } else if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<hr key={i} className="border-slate-700 my-4" />);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-slate-300 my-1.5 leading-relaxed"><InlineMarkdown text={line} /></p>);
    }
    i++;
  }

  return <div>{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    let firstMatch: { index: number; length: number; node: React.ReactNode } | null = null;

    if (boldMatch?.index != null) {
      firstMatch = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        node: <strong key={key++} className="text-slate-100 font-semibold">{boldMatch[1]}</strong>,
      };
    }

    if (codeMatch?.index != null && (!firstMatch || codeMatch.index < firstMatch.index)) {
      firstMatch = {
        index: codeMatch.index,
        length: codeMatch[0].length,
        node: <code key={key++} className="text-accent bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">{codeMatch[1]}</code>,
      };
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(remaining.slice(0, firstMatch.index));
      }
      parts.push(firstMatch.node);
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}
