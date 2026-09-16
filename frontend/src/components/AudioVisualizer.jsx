import React from 'react';

export default function AudioVisualizer({ isRecording, audioLevel = 0 }) {
  // Generate 24 dynamic waveform bars with responsive height offsets
  const barCount = 24;

  return (
    <div className="flex flex-col items-center justify-center space-y-3 py-4">
      {/* Waveform Bar Container */}
      <div className="flex items-center justify-center space-x-1.5 h-16 w-full max-w-xs px-4">
        {Array.from({ length: barCount }).map((_, index) => {
          // Add sinusoidal curve offset so center bars animate higher than edges
          const distanceCenter = Math.abs(index - (barCount - 1) / 2) / (barCount / 2);
          const factor = Math.max(0.2, 1 - distanceCenter * 0.7);

          let barHeight = 4; // minimum height in pixels when idle
          if (isRecording) {
            const dynamicScale = (audioLevel / 100) * 56 * factor;
            // Add slight pseudo-random jitter for a fluid audio visual effect
            const jitter = (Math.sin(index * 1.5 + Date.now() / 200) + 1) * 4;
            barHeight = Math.max(6, Math.min(60, dynamicScale + jitter + 6));
          }

          return (
            <div
              key={index}
              style={{
                height: `${barHeight}px`,
                transition: 'height 80ms ease-out',
              }}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isRecording
                  ? audioLevel > 50
                    ? 'bg-gradient-to-t from-rose-500 to-amber-400 shadow-sm shadow-rose-500/50'
                    : 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                  : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      {/* Audio Level Status Text */}
      <div className="flex items-center space-x-2 text-[11px] font-mono">
        <span className="text-slate-500">Input Level:</span>
        <span
          className={`font-semibold ${
            isRecording
              ? audioLevel > 40
                ? 'text-rose-400'
                : 'text-indigo-400'
              : 'text-slate-600'
          }`}
        >
          {isRecording ? `${audioLevel}%` : 'Silent (Idle)'}
        </span>
      </div>
    </div>
  );
}
