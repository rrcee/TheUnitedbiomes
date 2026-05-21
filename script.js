/* ==========================================================================
   THE UNITED BIOMES - INTERACTIVITY
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const SERVER_TIME_ZONE = "Asia/Kolkata";
    const SERVER_TIME_ZONE_LABEL = "IST";
    const OPEN_MINUTE = 9 * 60;
    const CLOSE_MINUTE = 21 * 60;

    const timePartsFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: SERVER_TIME_ZONE,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const displayTimeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: SERVER_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    function getServerTimeParts(date = new Date()) {
        const parts = timePartsFormatter.formatToParts(date).reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        return {
            hour: Number(parts.hour),
            minute: Number(parts.minute),
            second: Number(parts.second)
        };
    }

    function describeDuration(totalMinutes) {
        if (totalMinutes <= 0) {
            return "less than 1m";
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) {
            return `${minutes}m`;
        }

        if (minutes === 0) {
            return `${hours}h`;
        }

        return `${hours}h ${minutes}m`;
    }

    function getScheduleState(date = new Date()) {
        const { hour, minute, second } = getServerTimeParts(date);
        const minuteOfDay = hour * 60 + minute;
        const isOnline = minuteOfDay >= OPEN_MINUTE && minuteOfDay < CLOSE_MINUTE;
        const minutesUntilChange = isOnline
            ? CLOSE_MINUTE - minuteOfDay
            : minuteOfDay >= CLOSE_MINUTE
                ? (24 * 60 - minuteOfDay) + OPEN_MINUTE
                : OPEN_MINUTE - minuteOfDay;

        return {
            hour,
            minute,
            second,
            minuteOfDay,
            isOnline,
            minutesUntilChange,
            durationUntilChange: describeDuration(minutesUntilChange),
            displayTime: displayTimeFormatter.format(date),
            statusLabel: isOnline ? "Online" : "Offline",
            nextAction: isOnline ? "closes" : "opens",
            nextActionTime: isOnline ? "9:00 PM" : "9:00 AM"
        };
    }

    function setLamp(lamp, isOnline) {
        if (!lamp) return;
        lamp.className = `redstone-lamp ${isOnline ? "online" : "offline"}`;
    }

    function updateBadge(badge, isOnline) {
        if (!badge) return;

        const lamp = badge.querySelector(".redstone-lamp");
        const text = badge.querySelector(".badge-text");

        badge.classList.toggle("is-online", isOnline);
        badge.classList.toggle("is-offline", !isOnline);
        setLamp(lamp, isOnline);

        if (text) {
            text.textContent = isOnline ? "Online" : "Offline";
        }
    }

    function updateServerSchedule(date = new Date()) {
        const state = getScheduleState(date);
        const globalLamp = document.getElementById("global-lamp");
        const globalStatus = document.getElementById("global-status");
        const globalBadge = document.getElementById("global-status-badge");
        const scheduleLamp = document.getElementById("schedule-lamp");
        const scheduleStatusText = document.getElementById("schedule-status-text");
        const scheduleNextChange = document.getElementById("schedule-next-change");
        const statusCountdown = document.getElementById("status-countdown");
        const serverTimeLabel = document.getElementById("server-time-label");
        const clockDial = document.getElementById("clock-dial");

        document.body.classList.toggle("server-online", state.isOnline);
        document.body.classList.toggle("server-offline", !state.isOnline);

        if (globalBadge) {
            globalBadge.classList.toggle("is-online", state.isOnline);
            globalBadge.classList.toggle("is-offline", !state.isOnline);
        }

        setLamp(globalLamp, state.isOnline);
        setLamp(scheduleLamp, state.isOnline);
        updateBadge(document.getElementById("java-status-badge"), state.isOnline);
        updateBadge(document.getElementById("bedrock-status-badge"), state.isOnline);

        if (globalStatus) {
            globalStatus.textContent = state.isOnline
                ? `Server Online - closes in ${state.durationUntilChange}`
                : `Server Offline - opens in ${state.durationUntilChange}`;
        }

        if (scheduleStatusText) {
            scheduleStatusText.textContent = state.isOnline
                ? `Online now - closes at 9:00 PM ${SERVER_TIME_ZONE_LABEL}`
                : `Offline now - opens at 9:00 AM ${SERVER_TIME_ZONE_LABEL}`;
        }

        if (scheduleNextChange) {
            scheduleNextChange.textContent = `${state.nextAction[0].toUpperCase()}${state.nextAction.slice(1)} in ${state.durationUntilChange}. Current server time: ${state.displayTime} ${SERVER_TIME_ZONE_LABEL}.`;
        }

        if (statusCountdown) {
            statusCountdown.textContent = state.isOnline
                ? `Online now. Closes in ${state.durationUntilChange}.`
                : `Offline now. Opens in ${state.durationUntilChange}.`;
        }

        if (serverTimeLabel) {
            serverTimeLabel.textContent = `Server time: ${state.displayTime} ${SERVER_TIME_ZONE_LABEL}`;
        }

        if (clockDial) {
            const rotation = ((state.minuteOfDay / (24 * 60)) * 360) - 180;
            clockDial.style.transform = `rotate(${rotation}deg)`;
        }

        return state;
    }

    window.UnitedBiomesSchedule = {
        getScheduleState,
        updateServerSchedule
    };

    const loader = document.getElementById("loader");
    if (loader) {
        const loaderText = document.getElementById("loader-text");
        const loaderStatus = document.getElementById("loader-status");
        const loaderProgress = document.querySelector(".loader-progress");
        const loaderProgressBar = document.getElementById("loader-progress-bar");
        const loaderMessages = [
            "Preparing worlds...",
            "Growing forests...",
            "Linking Java and Bedrock...",
            "Opening spawn gates...",
            "Lighting the portal...",
            "Almost ready..."
        ];
        const startedAt = performance.now();
        let loaderProgressValue = 8;
        let loaderMessageIndex = 0;
        let loaderFinishing = false;
        let loaderDone = false;

        function setLoaderProgress(value) {
            loaderProgressValue = Math.max(loaderProgressValue, Math.min(value, 100));

            if (loaderProgressBar) {
                loaderProgressBar.style.width = `${loaderProgressValue}%`;
            }

            if (loaderProgress) {
                loaderProgress.setAttribute("aria-valuenow", String(Math.round(loaderProgressValue)));
            }
        }

        const loaderTimer = window.setInterval(() => {
            if (loaderDone) return;

            loaderMessageIndex = (loaderMessageIndex + 1) % loaderMessages.length;
            setLoaderProgress(Math.min(92, loaderProgressValue + 5 + Math.random() * 6));

            if (loaderStatus) {
                loaderStatus.textContent = loaderMessages[loaderMessageIndex];
            }
        }, 460);

        function finishLoader() {
            if (loaderFinishing || loaderDone) return;

            loaderFinishing = true;
            const elapsed = performance.now() - startedAt;
            const completionDelay = Math.max(0, 2800 - elapsed);

            window.setTimeout(completeLoader, completionDelay);
        }

        function completeLoader() {
            if (loaderDone) return;

            loaderDone = true;
            window.clearInterval(loaderTimer);
            setLoaderProgress(100);

            if (loaderText) {
                loaderText.textContent = "Welcome to The United Biomes";
            }

            if (loaderStatus) {
                loaderStatus.textContent = "Ready to play.";
            }

            window.setTimeout(() => loader.classList.add("fade-out"), 620);
        }

        window.addEventListener("load", finishLoader, { once: true });
        window.setTimeout(finishLoader, 4200);
    }

    const mobileToggle = document.querySelector(".mobile-menu-toggle");
    const mobileDropdown = document.querySelector(".mobile-nav-dropdown");

    if (mobileToggle && mobileDropdown) {
        mobileToggle.addEventListener("click", () => {
            const isOpen = mobileDropdown.classList.toggle("show");
            const icon = mobileToggle.querySelector("i");

            document.body.classList.toggle("mobile-nav-open", isOpen);
            mobileToggle.setAttribute("aria-expanded", String(isOpen));

            if (icon) {
                icon.className = isOpen ? "fas fa-times" : "fas fa-bars";
            }
        });

        mobileDropdown.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                mobileDropdown.classList.remove("show");
                document.body.classList.remove("mobile-nav-open");
                mobileToggle.setAttribute("aria-expanded", "false");

                const icon = mobileToggle.querySelector("i");
                if (icon) {
                    icon.className = "fas fa-bars";
                }
            });
        });
    }

    const clickSound = document.getElementById("click-sound");
    const soundToggle = document.getElementById("sound-toggle");
    let soundEnabled = localStorage.getItem("soundEnabled") !== "false";

    function updateSoundIcon() {
        if (!soundToggle) return;
        const icon = soundToggle.querySelector("i");

        if (icon) {
            icon.className = soundEnabled ? "fas fa-volume-up" : "fas fa-volume-mute";
        }

        soundToggle.title = soundEnabled ? "Mute sound effects" : "Enable sound effects";
        soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    }

    function playClickSound() {
        if (!soundEnabled || !clickSound) return;

        clickSound.currentTime = 0;
        clickSound.volume = 0.32;
        clickSound.play().catch(() => {});
    }

    updateSoundIcon();

    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem("soundEnabled", String(soundEnabled));
            updateSoundIcon();

            if (soundEnabled) {
                playClickSound();
            }
        });
    }

    document.querySelectorAll(".click-sound-trigger, .btn, .btn-copy, .arrow-btn, .dot-ind, .faq-question").forEach((trigger) => {
        trigger.addEventListener("click", playClickSound);
    });

    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");

    function showToast(message) {
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(showToast.hideTimer);
        showToast.hideTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
    }

    function fallbackCopyText(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand("copy");
            showToast(`Copied: ${text}`);
        } catch {
            showToast("Copy failed. Select the text manually.");
        } finally {
            textarea.remove();
        }
    }

    document.querySelectorAll(".btn-copy").forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-copy-target");
            const target = targetId ? document.getElementById(targetId) : null;
            const textToCopy = target ? target.textContent.trim() : "";

            if (!textToCopy) return;

            const icon = button.querySelector("i");
            const originalClass = icon ? icon.className : "";

            const markCopied = () => {
                showToast(`Copied: ${textToCopy}`);

                if (icon) {
                    icon.className = "fas fa-check";
                    setTimeout(() => {
                        icon.className = originalClass;
                    }, 1500);
                }
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy).then(markCopied).catch(() => fallbackCopyText(textToCopy));
            } else {
                fallbackCopyText(textToCopy);
            }
        });
    });

    document.querySelectorAll(".slider-container-new").forEach((slider) => {
        const slides = Array.from(slider.querySelectorAll(".slide-new"));
        const dots = Array.from(slider.querySelectorAll(".dot-ind"));
        const prevBtn = slider.querySelector(".arrow-btn.prev");
        const nextBtn = slider.querySelector(".arrow-btn.next");
        let currentIdx = 0;
        let startX = 0;

        function goToSlide(index) {
            if (slides.length === 0) return;

            slides[currentIdx].classList.remove("active");
            if (dots[currentIdx]) dots[currentIdx].classList.remove("active");

            currentIdx = (index + slides.length) % slides.length;

            slides[currentIdx].classList.add("active");
            if (dots[currentIdx]) dots[currentIdx].classList.add("active");
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => goToSlide(currentIdx - 1));
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => goToSlide(currentIdx + 1));
        }

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                const targetIdx = Number(dot.getAttribute("data-index"));
                if (!Number.isNaN(targetIdx)) {
                    goToSlide(targetIdx);
                }
            });
        });

        slider.addEventListener("touchstart", (event) => {
            startX = event.changedTouches[0].screenX;
        }, { passive: true });

        slider.addEventListener("touchend", (event) => {
            const endX = event.changedTouches[0].screenX;
            const delta = startX - endX;

            if (Math.abs(delta) > 42) {
                goToSlide(delta > 0 ? currentIdx + 1 : currentIdx - 1);
                playClickSound();
            }
        }, { passive: true });
    });

    const faqItems = Array.from(document.querySelectorAll(".faq-item"));
    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question");
        if (!question) return;

        question.setAttribute("aria-expanded", "false");
        question.addEventListener("click", () => {
            const shouldOpen = !item.classList.contains("active");

            faqItems.forEach((otherItem) => {
                otherItem.classList.remove("active");
                const otherQuestion = otherItem.querySelector(".faq-question");
                if (otherQuestion) {
                    otherQuestion.setAttribute("aria-expanded", "false");
                }
            });

            item.classList.toggle("active", shouldOpen);
            question.setAttribute("aria-expanded", String(shouldOpen));
        });
    });

    const revealElements = document.querySelectorAll(".reveal-fade");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -40px 0px"
        });

        revealElements.forEach((element) => observer.observe(element));
    } else {
        revealElements.forEach((element) => element.classList.add("visible"));
    }

    updateServerSchedule();
    setInterval(updateServerSchedule, 30000);

    const canvas = document.getElementById("particle-canvas");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (canvas && !reduceMotion) {
        const ctx = canvas.getContext("2d");
        const particles = [];
        const colors = [
            "rgba(152, 187, 244, 0.22)",
            "rgba(33, 186, 76, 0.16)",
            "rgba(255, 225, 106, 0.18)",
            "rgba(255, 139, 125, 0.14)"
        ];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.reset(true);
            }

            reset(initial = false) {
                this.x = Math.random() * canvas.width;
                this.y = initial ? Math.random() * canvas.height : canvas.height + 30;
                this.size = [5, 7, 9, 11][Math.floor(Math.random() * 4)];
                this.speedY = 0.22 + Math.random() * 0.44;
                this.speedX = (Math.random() - 0.5) * 0.24;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.opacity = 0.18 + Math.random() * 0.26;
            }

            update() {
                this.y -= this.speedY;
                this.x += this.speedX;
                this.opacity -= 0.0008;

                if (this.y < -24 || this.opacity <= 0 || this.x < -24 || this.x > canvas.width + 24) {
                    this.reset();
                }
            }

            draw() {
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;
                ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
            }
        }

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        for (let i = 0; i < 26; i += 1) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((particle) => {
                particle.update();
                particle.draw();
            });
            requestAnimationFrame(animate);
        }

        animate();
    }
});
