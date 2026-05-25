'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MESSAGES = [
  'Searching Google Maps…',
  'Extracting business listings…',
  'Scrolling through results…',
  'Collecting phone numbers…',
  'Processing ratings and reviews…',
  'Gathering addresses…',
  'Almost there — saving records…',
  'Finalising your results…',
];

export function LoadingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(msgInterval);
  }, []);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur overflow-hidden">
      <CardContent className="p-10 flex flex-col items-center gap-6">
        {/* Animated icon */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950 animate-ping opacity-30" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg">
            <MapPin className="w-7 h-7" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs bg-muted rounded-full overflow-hidden h-1.5">
          <div className="h-full bg-blue-500 rounded-full animate-[progressIndeterminate_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>

        {/* Rotating messages */}
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 transition-all duration-500">
            {MESSAGES[msgIndex]}{dots}
          </p>
          <p className="text-sm text-muted-foreground">
            This may take 30–90 seconds for a fresh scrape
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {MESSAGES.slice(0, 4).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === msgIndex % 4 ? 'bg-blue-500 scale-125' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(400%); width: 40%; }
        }
      `}</style>
    </Card>
  );
}
