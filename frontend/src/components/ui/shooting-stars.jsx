import React, { useEffect, useState, useRef } from "react";

export const ShootingStars = ({
  minSpeed = 10,
  maxSpeed = 25,
  minDelay = 1500,
  maxDelay = 4500,
  starColor = "#93c5fd",
  trailColor = "#3b82f6",
  starWidth = 2,
  starHeight = 2,
  className = "",
}) => {
  const [stars, setStars] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let activeStars = [];
    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const createStar = () => {
      // Spawn star on the top or right edges
      const spawnOnTop = Math.random() > 0.4;
      let startX, startY;

      if (spawnOnTop) {
        startX = Math.random() * width;
        startY = 0;
      } else {
        startX = width;
        startY = Math.random() * (height * 0.6);
      }

      // Traveling downwards and left
      const angle = (135 + (Math.random() * 20 - 10)) * (Math.PI / 180); // ~135 degrees (down-left)
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const length = 80 + Math.random() * 120; // length of trail

      activeStars.push({
        id: Date.now() + Math.random(),
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: length,
        opacity: 1,
        fadeSpeed: 0.008 + Math.random() * 0.015,
      });
    };

    // Spawn stars periodically
    let spawnTimeoutId;
    const triggerSpawn = () => {
      createStar();
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      spawnTimeoutId = setTimeout(triggerSpawn, delay);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      activeStars = activeStars.filter((star) => {
        // Move star
        star.x += star.vx;
        star.y += star.vy;

        // Fade out as it goes
        star.opacity -= star.fadeSpeed;

        if (star.opacity <= 0 || star.x < -star.len || star.y > height + star.len) {
          return false; // remove
        }

        // Draw star trail as gradient line
        const grad = ctx.createLinearGradient(
          star.x,
          star.y,
          star.x - star.vx * (star.len / 10),
          star.y - star.vy * (star.len / 10)
        );
        grad.addColorStop(0, starColor);
        grad.addColorStop(0.2, trailColor);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = starWidth;
        ctx.lineCap = "round";
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(
          star.x - star.vx * (star.len / 10),
          star.y - star.vy * (star.len / 10)
        );
        ctx.stroke();

        return true;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    animate();
    triggerSpawn();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(spawnTimeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [minSpeed, maxSpeed, minDelay, maxDelay, starColor, trailColor, starWidth]);

  return (
    <canvas
      ref={canvasRef}
      className={`shooting-stars-canvas ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
        zIndex: 1,
      }}
    />
  );
};
