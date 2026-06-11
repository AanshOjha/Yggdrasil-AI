import { useState, useRef } from 'react';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [clickCount, setClickCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleBannerClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Audio play failed. Make sure the file exists at /easter-egg.mp3:", e));
      }
      setClickCount(0); // Reset after playing
    }
  };

  return (
    <div className="top-bar glass" onClick={handleBannerClick} title="Click me!">
      {/* 
        The background image is loaded from the public folder. 
        Place your image at "frontend/public/banner-bg.jpg" or change the URL here.
      */}
      <div 
        className="top-bar-bg" 
        style={{ backgroundImage: "url('/banner-bg.jpg')" }}
      ></div>
      <div className="top-bar-content">
        <h1>{title}</h1>
      </div>
      
      {/* 
        The custom audio is loaded from the public folder. 
        Place your audio file at "frontend/public/easter-egg.mp3".
      */}
      <audio ref={audioRef} src="/easter-egg.mp3" preload="auto" />
    </div>
  );
}
