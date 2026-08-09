import React, { useEffect, useRef } from 'react';

export default function BackgroundVideo({
  videoSrc = '/background.mp4',
  opacity = 0.95,
  isScrubbing = false,
  scrollContainerRef = null
}) {
  const videoRef = useRef(null);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isScrubbing) {
      // Continuous AutoPlay Loop Mode
      video.loop = true;
      video.play().catch(() => {
        // Autoplay policy fallback
      });
      return;
    }

    // Scroll-bound frame scrubbing mode
    video.pause();

    const calculateScrollProgress = () => {
      const container = scrollContainerRef?.current;
      if (container) {
        const scrollTop = container.scrollTop;
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0) {
          return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
        }
      }
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      }
      return 0;
    };

    // Continuous 60 FPS Render Loop with Smooth LERP (Linear Interpolation)
    const renderLoop = () => {
      if (video.duration && !isNaN(video.duration)) {
        const progress = calculateScrollProgress();
        targetTimeRef.current = progress * (video.duration - 0.05);

        const diff = targetTimeRef.current - currentTimeRef.current;
        if (Math.abs(diff) > 0.001) {
          currentTimeRef.current += diff * 0.2;

          if (video.readyState >= 2) {
            try {
              if (typeof video.fastSeek === 'function') {
                video.fastSeek(currentTimeRef.current);
              } else {
                video.currentTime = currentTimeRef.current;
              }
            } catch (e) {
              // Ignore transient seeking errors
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scrollContainerRef, videoSrc, isScrubbing]);

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none transition-opacity duration-700">
      {/* Background Video (Live Playback & Scroll Scrubbing Support) */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover transition-all duration-300 brightness-110 contrast-105"
        style={{ opacity: opacity }}
      />

      {/* Subtle Soft Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070c]/30 via-transparent to-[#05070c]/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#05070c]/15 to-[#05070c]/40 pointer-events-none" />
    </div>
  );
}
