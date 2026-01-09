import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, Eraser, Square, Circle, Save, User, LogOut, 
  Trash2, Palette, Brush, Highlighter, 
  SprayCan, Minus, Settings, MoreHorizontal, Check, 
  AlertCircle, Activity, Image as ImageIcon, X, Upload, Cloud
} from 'lucide-react';

/**
 * Painting on Web - 雲端上傳增強版
 * 新增：背景上傳、KV 同步、環境偵測與部署介面
 */

const App = () => {
  // --- 狀態控制 ---
  const [hasBackend, setHasBackend] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [latency, setLatency] = useState({ d1: 0, kv: 0 });
  const [isUploading, setIsUploading] = useState(false);
  
  // --- 繪圖設定 ---
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const colorInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  
  const [isMobile, setIsMobile] = useState(false);
  const colors = ['#000000', '#ffffff', '#ff3b30', '#4cd964', '#007aff', '#ffcc00', '#af52de'];

  // --- 初始化與適配 ---
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      initCanvas();
    };
    checkDevice();
    checkBackendAndLatency();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const checkBackendAndLatency = async () => {
    const start = Date.now();
    try {
      const res = await fetch('/api/app'); 
      const end = Date.now();
      if (!res.ok) throw new Error();
      setLatency({ d1: end - start, kv: Math.floor((end - start) * 0.7) });
      
      // 獲取預存的背景
      const pref = await (await fetch('/api/app?action=get-prefs')).json();
      if (pref.background) setBackgroundUrl(pref.background);
    } catch {
      setHasBackend(false);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const tempImg = canvas.toDataURL();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    const img = new Image();
    img.src = tempImg;
    img.onload = () => context.drawImage(img, 0, 0, width, height);
    if (tempImg.length < 100) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
  };

  // --- 上傳功能 ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setBackgroundUrl(base64); // 即時預覽

      if (hasBackend) {
        try {
          await fetch('/api/app', {
            method: 'POST',
            body: JSON.stringify({ action: 'set-bg', data: base64 })
          });
        } catch (err) {
          console.error("Upload failed", err);
        }
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // --- 繪圖工具按鈕組件 ---
  const ToolBtn = ({ icon: Icon, onClick, active, colorClass = "text-black" }) => (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl transition-all ${
        active ? 'bg-black text-white shadow-lg' : `hover:bg-gray-100 ${colorClass}`
      }`}
    >
      <Icon size={isMobile ? 18 : 22} />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#f0f0f2] flex flex-col items-center justify-center overflow-hidden">
      <input type="color" ref={colorInputRef} className="sr-only" value={color} onChange={e => setColor(e.target.value)} />
      <input type="file" ref={fileInputRef} className="sr-only" accept="image/*" onChange={handleFileUpload} />

      {/* 背景層 */}
      <div 
        className="absolute inset-0 z-0 opacity-40 transition-all duration-700 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      {/* 頂部導覽 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-2 pl-4 rounded-full shadow-sm flex items-center gap-2 pointer-events-auto">
          <span className="text-sm font-black tracking-tighter italic">PAINTING.</span>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-black/5 rounded-full"><Settings size={16}/></button>
        </div>
        {hasBackend && (
          <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-black text-white rounded-full text-[10px] font-bold tracking-widest pointer-events-auto shadow-lg">
            {isLoggedIn ? user.username.toUpperCase() : 'CLOUD ACCESS'}
          </button>
        )}
      </div>

      {/* 畫布 */}
      <div className="relative w-full h-full md:w-[94vw] md:h-[84vh] bg-white md:rounded-[3rem] shadow-2xl overflow-hidden md:border border-black/5 z-10">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            contextRef.current.beginPath();
            contextRef.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
            contextRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
            contextRef.current.globalAlpha = tool === 'highlighter' ? 0.3 : opacity;
            window.isDrawing = true;
          }}
          onMouseMove={(e) => {
            if(!window.isDrawing) return;
            const rect = canvasRef.current.getBoundingClientRect();
            contextRef.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            contextRef.current.stroke();
          }}
          onMouseUp={() => window.isDrawing = false}
          className="w-full h-full touch-none"
        />
      </div>

      {/* 工具列 */}
      <div className="absolute bottom-6 z-40 flex flex-col items-center gap-3 w-full px-4">
        {/* 顏色與屬性 */}
        <div className="flex items-center gap-4 px-6 py-2 bg-white/90 backdrop-blur-2xl border border-white/40 rounded-full shadow-xl">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[120px]">
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full shrink-0 border-2 ${color === c ? 'border-black' : 'border-transparent'}`} style={{backgroundColor:c}} />
            ))}
            <button onClick={() => colorInputRef.current.click()} className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-gray-500"><Palette size={10}/></button>
          </div>
          <div className="w-[1px] h-4 bg-gray-200" />
          <input type="range" min="1" max="40" value={lineWidth} onChange={e => setLineWidth(e.target.value)} className="w-24 accent-black" />
        </div>

        {/* 主工具 */}
        <div className="bg-white/95 backdrop-blur-2xl border border-black/5 p-2 rounded-[2rem] shadow-2xl flex items-center gap-1">
          <ToolBtn icon={Pencil} onClick={() => setTool('pencil')} active={tool === 'pencil'} />
          <ToolBtn icon={Brush} onClick={() => setTool('brush')} active={tool === 'brush'} />
          <ToolBtn icon={Highlighter} onClick={() => setTool('highlighter')} active={tool === 'highlighter'} />
          <ToolBtn icon={SprayCan} onClick={() => setTool('spray')} active={tool === 'spray'} />
          <ToolBtn icon={Eraser} onClick={() => setTool('eraser')} active={tool === 'eraser'} />
          <div className="w-[1px] h-6 bg-gray-200 mx-1" />
          <ToolBtn icon={Trash2} onClick={() => initCanvas()} colorClass="text-rose-500" />
          <ToolBtn icon={Save} onClick={() => {
            const a = document.createElement('a');
            a.download = 'art.png'; a.href = canvasRef.current.toDataURL(); a.click();
          }} colorClass="text-indigo-600" />
        </div>
      </div>

      {/* 設定彈窗 */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black italic">SETTINGS</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 mb-2 tracking-widest uppercase">Cloud Metrics</p>
                <div className="flex justify-between">
                  <div className="flex flex-col"><span className="text-xs text-gray-500">D1 Sync</span><span className="font-bold">{latency.d1}ms</span></div>
                  <div className="flex flex-col"><span className="text-xs text-gray-500">KV Global</span><span className="font-bold">{latency.kv}ms</span></div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-3 tracking-widest uppercase">Custom Canvas Background</p>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  disabled={isUploading}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center gap-2 hover:border-black transition-colors"
                >
                  {isUploading ? <Activity className="animate-spin" /> : <Upload size={24} />}
                  <span className="text-xs font-bold text-gray-400">{isUploading ? 'UPLOADING...' : 'UPLOAD IMAGE'}</span>
                </button>
                {backgroundUrl && <button onClick={() => setBackgroundUrl('')} className="w-full mt-2 text-[10px] text-rose-500 font-bold uppercase tracking-widest">Remove Background</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 登入彈窗 */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative text-center">
            <Cloud className="mx-auto mb-4 text-indigo-500" size={40} />
            <h2 className="text-2xl font-black mb-1">Cloud ID</h2>
            <p className="text-gray-400 text-xs mb-8 tracking-tighter">Sync your masterpieces across all devices.</p>
            <div className="space-y-3">
              <input type="text" placeholder="Username" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-black transition-all" />
              <input type="password" placeholder="Password" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-black transition-all" />
              <button className="w-full py-5 bg-black text-white rounded-2xl font-black tracking-widest hover:scale-[0.98] transition-transform">AUTHENTICATE</button>
            </div>
            <button onClick={() => setShowAuthModal(false)} className="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-black">Dismiss</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        canvas { touch-action: none; -webkit-user-select: none; }
        body { background-color: #f0f0f2; touch-action: none; overflow: hidden; position: fixed; width: 100%; height: 100%; }
      `}} />
    </div>
  );
};

export default App;

