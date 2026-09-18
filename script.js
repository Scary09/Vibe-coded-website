document.addEventListener("DOMContentLoaded", () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = window.matchMedia('(max-width: 768px)').matches;

      // ==========================================
      // 1. Core DOM Elements
      // ==========================================
      const cursorDot = document.querySelector('.cursor-dot');
      const cursorRing = document.querySelector('.cursor-ring');
      const cursorAudioRing = document.querySelector('.cursor-audio-ring');
      const ambientGlow = document.querySelector('.ambient-glow');
      const entryScreen = document.getElementById('ascension-entry');
      const audioTrack = document.getElementById('bg-audio');
      const audioBtn = document.getElementById('audio-toggle');
      const themeToggle = document.getElementById('theme-toggle');
      const htmlElement = document.documentElement;

      // ==========================================
      // 2. Audio & Visualizer Setup
      // ==========================================
      let audioCtx, analyser, dataArray;
      let isVisualizing = false;
      
      const canvas = document.getElementById('visualizer');
      const ctx = canvas.getContext('2d');

      const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      const initAudioContext = () => {
        if (audioCtx) return; 
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();
        
        const source = audioCtx.createMediaElementSource(audioTrack);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        analyser.fftSize = 256; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        isVisualizing = true;
        if (!reduceMotion) renderVisualizer(); 
      };

      const renderVisualizer = () => {
        if (!isVisualizing) return;
        requestAnimationFrame(renderVisualizer);
        
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const mx = parseFloat(getComputedStyle(htmlElement).getPropertyValue('--mouse-x'));
        const my = parseFloat(getComputedStyle(htmlElement).getPropertyValue('--mouse-y'));

        let bassSum = 0;
        for(let k = 0; k < 10; k++) bassSum += dataArray[k];
        const bassAvg = bassSum / 10; 
        
        const pulseScale = 1 + (bassAvg / 255) * 0.5; 
        const pulseAlpha = 0.1 + (bassAvg / 255) * 0.8;
        
        gsap.set('.cursor-audio-ring', { 
          scale: pulseScale, 
          borderColor: `rgba(130, 45, 220, ${pulseAlpha})`,
          backgroundColor: `rgba(130, 45, 220, ${pulseAlpha * 0.15})`
        });

        const barWidth = 30, blockHeight = 8, blockGap = 4, barGap = 10; 
        const totalBars = Math.floor(canvas.width / (barWidth + barGap));
        const startX = (canvas.width - (totalBars * (barWidth + barGap))) / 2; 
        const step = Math.floor(dataArray.length * 0.7 / totalBars); 

        for (let i = 0; i < totalBars; i++) {
          let sum = 0;
          for(let j = 0; j < step; j++) sum += dataArray[(i * step) + j];
          let value = sum / step; 
          
          const maxBlocks = Math.floor((canvas.height * 0.5) / (blockHeight + blockGap));
          const activeBlocks = Math.floor((value / 255) * maxBlocks);
          const x = startX + i * (barWidth + barGap);
          
          for (let b = 0; b < activeBlocks; b++) {
            const baseY = canvas.height - 10 - (b * (blockHeight + blockGap)); 
            const blockCenterX = x + (barWidth / 2);
            const blockCenterY = baseY + (blockHeight / 2);
            const dist = Math.sqrt(Math.pow(mx - blockCenterX, 2) + Math.pow(my - blockCenterY, 2));
            
            let expand = 0, extraGlow = 0;
            const hoverRadius = 150; 
            if (dist < hoverRadius) {
              const factor = 1 - (dist / hoverRadius); 
              expand = factor * 8; extraGlow = factor * 0.6; 
            }

            ctx.fillStyle = `rgba(130, 45, 220, ${1 - (b / maxBlocks) * 0.2 + extraGlow})`; 
            ctx.shadowBlur = 25 + (extraGlow * 40); 
            ctx.shadowColor = 'rgba(150, 30, 255, 0.9)';
            ctx.fillRect(x - (expand / 2), baseY - (expand / 4), barWidth + expand, blockHeight + (expand / 2));
          }
        }
      };

      // ==========================================
      // 3. High-Performance Mouse Rendering
      // ==========================================
      let mouseX = -1000, mouseY = -1000;
      let ticking = false;

      const manifestoBg = document.querySelector('.manifesto-bg');

      if (cursorDot && cursorRing) {
        gsap.set('.cursor-dot, .cursor-ring, .cursor-audio-ring, .bg-text', { xPercent: -50, yPercent: -50 });

        window.addEventListener('mousemove', (e) => {
          mouseX = e.clientX; mouseY = e.clientY;
          if (!ticking) {
            requestAnimationFrame(() => {
              htmlElement.style.setProperty('--mouse-x', `${mouseX}px`);
              htmlElement.style.setProperty('--mouse-y', `${mouseY}px`);

              gsap.to(cursorDot, { x: mouseX, y: mouseY, duration: 0 });
              gsap.to(cursorAudioRing, { x: mouseX, y: mouseY, duration: 0.1 });
              gsap.to(cursorRing, { x: mouseX, y: mouseY, duration: 0.15 });

              const xNorm = mouseX / window.innerWidth - 0.5;
              const yNorm = mouseY / window.innerHeight - 0.5;
              
              gsap.to(ambientGlow, { xPercent: xNorm * 10, yPercent: yNorm * 10, duration: 2, ease: "power1.out" });
              gsap.to('.bg-text', { x: xNorm * 30, y: yNorm * 30, duration: 2, ease: "power1.out" });
              
              if (manifestoBg && !reduceMotion) {
                gsap.to(manifestoBg, { x: -(xNorm * 40), y: -(yNorm * 40), duration: 2, ease: "power1.out" });
              }
              
              ticking = false;
            });
            ticking = true;
          }
        });

        document.querySelectorAll('.item').forEach(el => {
          el.addEventListener('mouseenter', () => cursorRing.classList.add('is-active'));
          el.addEventListener('mouseleave', () => cursorRing.classList.remove('is-active'));
          el.addEventListener('focus', () => cursorRing.classList.add('is-active'));
          el.addEventListener('blur', () => cursorRing.classList.remove('is-active'));
        });

        document.querySelectorAll('a, .theme-btn, .audio-btn').forEach(el => {
          el.addEventListener('mouseenter', () => cursorRing.classList.add('is-link'));
          el.addEventListener('mouseleave', () => cursorRing.classList.remove('is-link'));
          el.addEventListener('focus', () => cursorRing.classList.add('is-link'));
          el.addEventListener('blur', () => cursorRing.classList.remove('is-link'));
        });
      }

      // ==========================================
      // 4. Smooth Scrolling Setup
      // ==========================================
      let lenis = null;
      if(!reduceMotion) {
        try {
          lenis = new Lenis({ duration: 1.3, smoothWheel: true });
          const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
          requestAnimationFrame(raf);
        } catch(e){}
      }
      gsap.registerPlugin(ScrollTrigger);
      if(lenis) lenis.on('scroll', ScrollTrigger.update);

      // ==========================================
      // 5. Interactions & Animations
      // ==========================================

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
        themeToggle.innerHTML = savedTheme === 'dark' ? '☀' : '☾';
      }

      themeToggle.addEventListener('click', () => {
        const targetTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        const switchTheme = () => {
          htmlElement.setAttribute('data-theme', targetTheme);
          localStorage.setItem('theme', targetTheme);
          themeToggle.innerHTML = targetTheme === 'dark' ? '☀' : '☾';
        };
        document.startViewTransition ? document.startViewTransition(switchTheme) : switchTheme();
      });

      if (entryScreen) {
        const cursorSpan = document.querySelector('.cursor-ring span');
        cursorRing.classList.add('is-entry');
        cursorSpan.innerHTML = 'Click to enter';
        
        if (!reduceMotion) {
          gsap.set('.hero', { scale: 1.05, opacity: 0, filter: 'blur(12px)' });
          gsap.set('.hero h1 .line span', { yPercent: 110 });
          gsap.set('.hero-eyebrow, .hero-foot', { opacity: 0, y: 14 });
        }

        entryScreen.addEventListener('click', () => {
          cursorRing.classList.remove('is-entry');
          cursorSpan.innerHTML = 'View';
          cursorAudioRing.style.opacity = '1';
          
          initAudioContext();
          if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); 
          if (audioTrack && audioTrack.paused) {
            audioTrack.play().then(() => {
              if (audioBtn) { audioBtn.innerHTML = 'ılı'; audioBtn.classList.add('is-playing'); }
            }).catch(() => {});
          }

          if (!reduceMotion) {
            gsap.timeline({ onComplete: () => entryScreen.style.display = 'none' })
              .to(entryScreen, { opacity: 0, duration: 1.4, ease: "power2.inOut" }, 0)
              .to('.hero', { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.8, ease: "power3.out" }, 0)
              .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.4)
              .to('.hero h1 .line span', { yPercent: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1 }, 0.5)
              .to('.hero-foot', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.7);
          } else {
            entryScreen.style.display = 'none'; 
          }
        });
      }

      if (audioTrack && audioBtn) {
        audioBtn.addEventListener('click', () => {
          if (audioTrack.paused) {
            audioTrack.play();
            audioBtn.innerHTML = 'ılı'; audioBtn.classList.add('is-playing');
          } else {
            audioTrack.pause();
            audioBtn.innerHTML = '▶'; audioBtn.classList.remove('is-playing');
          }
        });
      }

      if (!reduceMotion) {
        
        const manifestoTrack = document.querySelector('.manifesto-track');
        if (manifestoTrack) {
          gsap.to(manifestoTrack, {
            xPercent: -50,
            ease: "none",
            duration: 35,
            repeat: -1
          });
        }

        let mm = gsap.matchMedia();
        mm.add("(min-width: 769px)", () => {
          const processWrapper = document.getElementById("process-wrapper");
          const processWindow = document.querySelector(".process-window");
          const processGrid = document.querySelector(".process-grid");

          gsap.to(processGrid, {
            x: () => -(processGrid.scrollWidth - processWindow.offsetWidth),
            ease: "none",
            scrollTrigger: {
              trigger: processWrapper,
              start: "center center", end: () => `+=${processGrid.scrollWidth}`, 
              pin: true, scrub: 1.5, anticipatePin: 1, invalidateOnRefresh: true 
            }
          });
        });

        const el = document.getElementById('manifesto-text');
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
        const wordEls = el.querySelectorAll('.word');

        ScrollTrigger.create({
          trigger: '#manifesto-section', start: 'top 75%', end: 'bottom 55%', scrub: 0.3,
          onUpdate: (self) => {
            const lit = Math.floor(self.progress * wordEls.length);
            wordEls.forEach((w, i) => w.classList.toggle('lit', i <= lit));
          }
        });

        const tiltAmount = isMobile ? 6 : 15;
        gsap.utils.toArray('.item').forEach(item => {
          gsap.fromTo(item,
            { rotationX: -tiltAmount, rotationY: isMobile ? 0 : 10, z: -150 },
            {
              rotationX: tiltAmount, rotationY: isMobile ? 0 : -10, z: 80, ease: 'none',
              scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true }
            }
          );
        });
        
        gsap.utils.toArray('.item img').forEach(img => {
          gsap.fromTo(img, { y: '-14%' }, {
            y: '14%', ease: 'none',
            scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });

        gsap.fromTo('.hero h1, .hero-foot', { scale: 1, y: 0, opacity: 1 }, {
          scale: 0.85, y: -150, opacity: 0, transformOrigin: "left center", immediateRender: false, 
          scrollTrigger: { trigger: '.hero', start: "top top", end: "bottom top", scrub: 1.5 }
        });

        gsap.timeline({ scrollTrigger: { trigger: '.work-head h2', start: "top 95%", end: "bottom 5%", scrub: 1.5 }})
        .fromTo('.work-head h2', { scale: 0.7, y: 150, opacity: 0, transformOrigin: "left center" }, { scale: 1, y: 0, opacity: 1, duration: 1, ease: "power1.out" })
        .to('.work-head h2', { scale: 0.85, y: -100, opacity: 0, duration: 1, ease: "power1.in" });

        gsap.fromTo('.contact h2', { scale: 0.7, y: 150, opacity: 0, transformOrigin: "left center" }, { 
          scale: 1, y: 0, opacity: 1, 
          scrollTrigger: { trigger: '.contact h2', start: "top 95%", end: "top 60%", scrub: 1.5 }
        });

        // The text shouldn't parallax, it needs to stay grounded above the moving images
        gsap.fromTo('#manifesto-text', { scale: 0.85, y: 150, transformOrigin: "center center" }, { 
          scale: 1, y: -100, ease: "none", scrollTrigger: { trigger: '.manifesto', start: "top bottom", end: "bottom top", scrub: 1.5 }
        });

        const allTextElements = document.querySelectorAll('h1, h2, h3, p:not(#manifesto-text), a, button, .process-num, .section-label');
        let textData = [];

        const cacheTextPositions = () => {
          textData = [];
          allTextElements.forEach(el => {
            if (window.getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
            const rect = el.getBoundingClientRect();
            textData.push({
              el: el,
              centerX: rect.left + window.scrollX + rect.width / 2,
              centerY: rect.top + window.scrollY + rect.height / 2,
              maxPush: (['a', 'button'].includes(el.tagName.toLowerCase())) ? 1.5 : 5
            });
          });
        };

        cacheTextPositions();
        window.addEventListener('resize', () => setTimeout(cacheTextPositions, 200));

        let proxTicking = false;
        window.addEventListener('mousemove', (e) => {
          if (!proxTicking) {
            requestAnimationFrame(() => {
              const radius = 200; 
              textData.forEach(item => {
                const distX = e.pageX - item.centerX;
                const distY = e.pageY - item.centerY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                if (distance < radius) {
                  const strength = 1 - (distance / radius); 
                  gsap.to(item.el, { 
                    x: (distX / distance) * -item.maxPush * strength, 
                    y: (distY / distance) * -item.maxPush * strength, 
                    duration: 1.2, ease: "power1.out", overwrite: "auto"
                  });
                } else {
                  gsap.to(item.el, { x: 0, y: 0, duration: 2.0, ease: "power1.out", overwrite: "auto" });
                }
              });
              proxTicking = false;
            });
            proxTicking = true;
          }
        });
      } else {
        document.querySelectorAll('.word').forEach(w => w.classList.add('lit'));
        document.querySelector('.process-grid').style.transform = 'none';
      }
    });