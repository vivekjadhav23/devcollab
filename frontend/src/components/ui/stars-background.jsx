import React, { useEffect, useRef } from "react";

export const StarsBackground = ({
  starDensity = 0.00015,
  allStarsTwinkle = true,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1.5,
  className = "",
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let stars = [];
    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      generateStars();
    };

    const generateStars = () => {
      const numStars = Math.floor(width * height * starDensity);
      stars = Array.from({ length: numStars }, () => {
        const twinkleSpeed =
          minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.2 + 0.4,
          opacity: Math.random() * 0.8 + 0.2,
          twinkleSpeed: twinkleSpeed / 60, // scaled per frame at 60fps
          twinkleDir: Math.random() > 0.5 ? 1 : -1,
          twinkle: allStarsTwinkle || Math.random() > 0.5,
        };
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        if (star.twinkle) {
          star.opacity += star.twinkleSpeed * star.twinkleDir;
          if (star.opacity >= 1) {
            star.opacity = 1;
            star.twinkleDir = -1;
          } else if (star.opacity <= 0.15) {
            star.opacity = 0.15;
            star.twinkleDir = 1;
          }
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.shadowBlur = star.radius * 2;
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    animate();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [starDensity, allStarsTwinkle, minTwinkleSpeed, maxTwinkleSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`stars-background-canvas ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
        zIndex: 0,
      }}
    />
  );
};
