import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Copy, Check, ZoomIn, ZoomOut, RefreshCw, X } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  isExpanded?: boolean;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark', // Native Mermaid dark theme for perfect dashboard integration
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  suppressErrors: true,
  themeVariables: {
    background: '#020617', // Match bg-slate-950 exactly
    primaryColor: '#1e293b', // Match slate-800
    primaryTextColor: '#f1f5f9', // Match slate-100
    primaryBorderColor: '#334155', // Match slate-700
    lineColor: '#64748b', // Match slate-500
    secondaryColor: '#0f172a', // Match slate-900
    tertiaryColor: '#1e1b4b', // Match indigo-950
    mainBkg: '#020617',
    nodeBorder: '#334155',
    actorBorder: '#334155',
    actorBkg: '#1e293b',
    actorTextColor: '#f1f5f9',
  }
});

mermaid.parseError = (err, hash) => {
  console.warn("Suppressed global Mermaid throw:", err);
};

const sanitizeMermaid = (chart: string): string => {
  let clean = chart.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
  
  // 1. Replace invalid arrow directions (<---, <-- or <==) with standard arrows
  clean = clean
    .replace(/<---/g, '-->')
    .replace(/<--/g, '-->')
    .replace(/<==/g, '==>');

  // 2. Convert semicolons and multi-spaces to newlines (respecting double quotes)
  let insideQuotes = false;
  let cleanWithNewlines = '';
  let consecutiveSpaces = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    }
    if (char === ';' && !insideQuotes) {
      cleanWithNewlines += '\n';
      consecutiveSpaces = 0;
    } else if ((char === ' ' || char === '\t') && !insideQuotes) {
      consecutiveSpaces++;
      if (consecutiveSpaces >= 3) {
        cleanWithNewlines = cleanWithNewlines.substring(0, cleanWithNewlines.length - (consecutiveSpaces - 1));
        cleanWithNewlines += '\n';
        consecutiveSpaces = 0;
      } else {
        cleanWithNewlines += char;
      }
    } else {
      consecutiveSpaces = 0;
      cleanWithNewlines += char;
    }
  }
  clean = cleanWithNewlines;

  // Ensure it starts with a valid graph/flowchart definition
  if (!clean.startsWith('graph') && !clean.startsWith('flowchart') && !clean.startsWith('sequenceDiagram') && !clean.startsWith('classDiagram') && !clean.startsWith('stateDiagram')) {
    clean = 'graph TD\n' + clean;
  }

  const lines = clean.split('\n');
  const processedLines = lines.map(line => {
    let newLine = line.trim();
    if (!newLine) return '';

    // 3. Strip trailing connection arrows (e.g. "F -->" or "F -.->")
    newLine = newLine.replace(/(?:-->|-\.-\/>|==>)\s*$/, '').trim();

    // 4. Expand "A --> B & C" into separate lines to avoid parsing errors
    if ((newLine.includes('-->') || newLine.includes('-.->') || newLine.includes('==>')) && newLine.includes('&')) {
      const isDashed = newLine.includes('-.->');
      const isThick = newLine.includes('==>');
      const separator = isDashed ? '-.->' : (isThick ? '==>' : '-->');
      const parts = newLine.split(separator);
      if (parts.length === 2) {
        const source = parts[0].trim();
        const targets = parts[1].split('&').map(t => t.trim());
        if (targets.length > 1) {
          return targets.map(t => `${source} ${separator} ${t}`).join('\n');
        }
      }
    }

    // 5. Fix rounded parentheses: ID(Text (Nested) Text) -> ID("Text (Nested) Text")
    const roundedRegex = /(\w+)\(([^"\n]+)\)/g;
    newLine = newLine.replace(roundedRegex, (match, id, text) => {
      if (text.includes('(') || text.includes(')') || text.includes('-') || text.includes('/') || text.includes(' ')) {
        return `${id}(" ${text.replace(/"/g, '\\"')}")`;
      }
      return match;
    });

    // 6. Fix square brackets: ID[Text [Nested] Text] -> ID["Text [Nested] Text"]
    const squareRegex = /(\w+)\[([^"\n]+)\]/g;
    newLine = newLine.replace(squareRegex, (match, id, text) => {
      if (text.includes('[') || text.includes(']') || text.includes('-') || text.includes('/') || text.includes(' ')) {
        return `${id}["${text.replace(/"/g, '\\"')}" ]`;
      }
      return match;
    });

    return newLine;
  });

  return processedLines.filter(l => l).join('\n');
};

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isExpanded = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Zoom & Pan Interactive States
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  // Reset zoom & pan when toggling fullscreen to ensure perfect centering in the new viewport
  useEffect(() => {
    handleResetZoom();
  }, [isFullscreen]);

  useEffect(() => {
    let isMounted = true;
    let tempDiv: HTMLDivElement | null = null;

    const renderChart = async () => {
      if (!chart) return;
      
      try {
        setError(null);
        const cleanChart = sanitizeMermaid(chart);
        
        // 1. Pre-validate syntax before rendering to prevent compiler lockups
        const isValid = await mermaid.parse(cleanChart, { suppressErrors: true });
        if (isValid === false) {
          throw new Error("Syntax error detected in the generated Mermaid definition.");
        }

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Declare and append temporary div safely
        tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        try {
          const { svg } = await mermaid.render(id, cleanChart, tempDiv);
          if (isMounted) {
            // Clean up SVG tag attributes to enable fluid scaling while preventing container clipping
            let processedSvg = svg;
            const svgMatch = processedSvg.match(/<svg[^>]*>/);
            if (svgMatch) {
              let svgTag = svgMatch[0];
              // Remove existing width, height, and style attributes that cause rigid bounds or duplicates
              svgTag = svgTag
                .replace(/\s+width="[^"]*"/g, '')
                .replace(/\s+height="[^"]*"/g, '')
                .replace(/\s+style="[^"]*"/g, '');
              
              // Inject clean attributes for perfect fluid scaling and zero clipping
              svgTag = svgTag.replace('<svg', '<svg width="100%" height="100%" style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; overflow: visible;"');
              processedSvg = processedSvg.replace(/<svg[^>]*>/, svgTag);
            }
            setSvgContent(processedSvg);
          }
        } finally {
          if (tempDiv && document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
        }
      } catch (err: any) {
        console.error("Mermaid rendering error:", err);
        if (isMounted) {
          setError(err.message || "Failed to render diagram. The generated syntax might be invalid.");
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
      if (tempDiv && document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    };
  }, [chart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Zoom & Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isPanning.current = true;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPointerPos.current.x;
    const dy = e.clientY - lastPointerPos.current.y;
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      isPanning.current = false;
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setScale(prev => Math.max(0.4, prev - 0.15));
  const handleResetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-sm font-mono overflow-auto max-h-[300px]">
        <p className="font-bold mb-2 text-rose-400">Diagram Rendering Error:</p>
        <p>{error}</p>
        <p className="font-bold mt-4 mb-2 text-rose-400">Raw Syntax:</p>
        <pre className="text-xs text-red-500/80">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      {/* 1. Inline Standard View */}
      {!isFullscreen && (
        <div className="relative group w-full">
          {/* Hover Floating Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              className="p-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 shadow-sm transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              className="p-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 shadow-sm transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {/* Reset Zoom */}
            <button
              onClick={handleResetZoom}
              className="p-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 shadow-sm transition-all"
              title="Reset Zoom & Position"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            {/* Copy Code */}
            <button
              onClick={handleCopyCode}
              className="p-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 shadow-sm transition-all"
              title="Copy Mermaid Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 shadow-sm transition-all"
              title="Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagram Container Canvas */}
          <div 
            ref={containerRef} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`flex justify-center items-center w-full overflow-hidden p-6 bg-slate-950 rounded-xl border border-slate-900 cursor-grab active:cursor-grabbing select-none relative transition-all duration-300 ${
              isExpanded ? 'h-[720px]' : 'h-[440px]'
            }`}
          >
            {/* Rendered SVG wrapper with dynamic scale and pan transforms */}
            <div 
              style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
              className="transition-transform duration-75 ease-out select-none pointer-events-none w-full h-full flex justify-center items-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />

            {/* Info Tip Overlay */}
            <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 pointer-events-none select-none flex items-center gap-1">
              <span>Click & Grab to Pan • Hover top-right to Zoom</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Expanded Centered Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-scaleIn">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900/90 border-b border-slate-800/80 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
                <span className="text-sm font-bold text-white">Architecture Flow (Mermaid View)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                <button onClick={handleResetZoom} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Reset Zoom"><RefreshCw className="w-3.5 h-3.5" /></button>
                <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                <button onClick={handleCopyCode} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Copy Mermaid Code">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setIsFullscreen(false)} className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg border border-rose-900/50 transition-all" title="Close Expanded View"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Modal Body Canvas */}
            <div 
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="flex-1 relative overflow-hidden bg-slate-950 flex justify-center items-center cursor-grab active:cursor-grabbing select-none"
            >
              {/* Rendered SVG wrapper with dynamic scale and pan transforms */}
              <div 
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                className="transition-transform duration-75 ease-out select-none pointer-events-none w-full h-full flex justify-center items-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />

              {/* Info Tip Overlay */}
              <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 pointer-events-none select-none flex items-center gap-1">
                <span>Click & Grab to Pan • Use toolbar or drag to interact</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
