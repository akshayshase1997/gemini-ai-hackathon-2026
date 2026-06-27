import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Paintbrush, RotateCcw, Check, Trash2 } from 'lucide-react';

interface WhiteboardCanvasProps {
  onSave: (base64Data: string) => void;
  onClose: () => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4285F4'); // Google Blue default
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [history, setHistory] = useState<string[]>([]);

  const colors = [
    { name: 'Google Blue', value: '#4285F4' },
    { name: 'Google Red', value: '#EA4335' },
    { name: 'Google Yellow', value: '#FBBC05' },
    { name: 'Google Green', value: '#34A853' },
    { name: 'Dark Slate', value: '#0F172A' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Set background to white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state to history
    setHistory([canvas.toDataURL()]);
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'erase' ? '#FFFFFF' : color;

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const newState = canvas.toDataURL();
      setHistory(prev => [...prev, newState]);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const newState = canvas.toDataURL();
    setHistory(prev => [...prev, newState]);
  };

  const undo = () => {
    if (history.length <= 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const img = new Image();
    img.src = newHistory[newHistory.length - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
    };
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get base64 data without the prefix
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    onSave(base64Data);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[450px]">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('draw')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'draw' ? 'bg-google-blue text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Draw"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('erase')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'erase' ? 'bg-google-blue text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1" />
          
          {/* Color Palette */}
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setColor(c.value);
                  setTool('draw');
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c.value && tool === 'draw' ? 'scale-110 border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={history.length <= 1}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1" />
          <button
            onClick={handleApply}
            className="bg-google-green hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Use Sketch
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-grow relative bg-slate-100 p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-inner cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};
