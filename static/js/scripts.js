/* =========================================================
   MOVIEVERSE — Premium Interactions
   Page load fade, navbar elevation, tilt cards, scroll
   reveal, scroll-to-top — all rAF-throttled & a11y aware.
   ========================================================= */

(() => {
    "use strict";

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ---------------------------------------------------
       Utility: rAF-throttle scroll/resize handlers
    --------------------------------------------------- */
    const rafThrottle = (fn) => {
        let ticking = false;
        return (...args) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                fn(...args);
                ticking = false;
            });
        };
    };

    /* =====================================================
       1. Page Load — smooth fade-in
    ===================================================== */
    const initPageFade = () => {
        document.documentElement.style.setProperty(
            "--page-transition",
            prefersReducedMotion ? "none" : "opacity .45s ease"
        );
        document.body.style.transition = "var(--page-transition)";

        const reveal = () => {
            requestAnimationFrame(() => {
                document.body.style.opacity = "1";
            });
        };

        if (prefersReducedMotion) {
            document.body.style.opacity = "1";
            return;
        }

        // Reveal as soon as DOM is ready — don't wait for slow images/network
        document.body.style.opacity = "0";
        if (document.readyState === "complete" || document.readyState === "interactive") {
            reveal();
        } else {
            document.addEventListener("DOMContentLoaded", reveal, { once: true });
        }
        // Safety: never stay invisible
        setTimeout(reveal, 1200);
    };

    /* =====================================================
       2. Navbar — elevate on scroll
    ===================================================== */
    const initNavbarElevation = () => {
        const navbar = document.querySelector(".navbar");
        if (!navbar) return;

        const THRESHOLD = 20;

        const update = () => {
            navbar.classList.toggle("shadow-lg", window.scrollY > THRESHOLD);
            navbar.classList.toggle("navbar-scrolled", window.scrollY > THRESHOLD);
        };

        window.addEventListener("scroll", rafThrottle(update), { passive: true });
        update();
    };

    /* =====================================================
       3. Movie Cards — subtle 3D tilt on hover
       (skips entirely if reduced motion is preferred)
    ===================================================== */
    const initCardTilt = () => {
        const cards = document.querySelectorAll(".card");
        const MAX_TILT = 6; // degrees

        cards.forEach((card) => {
            card.style.transformStyle = "preserve-3d";
            card.style.willChange = "transform";

            if (prefersReducedMotion) return;

            const handleMove = (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;

                card.style.transform =
                    `translateY(-12px) scale(1.02) ` +
                    `rotateX(${(-y * MAX_TILT).toFixed(2)}deg) ` +
                    `rotateY(${(x * MAX_TILT).toFixed(2)}deg)`;
            };

            const reset = () => {
                card.style.transform = "translateY(0) scale(1) rotateX(0) rotateY(0)";
            };

            card.addEventListener("mousemove", rafThrottle(handleMove));
            card.addEventListener("mouseleave", reset);
            card.addEventListener("mouseenter", () => {
                card.style.transition = "transform .1s var(--ease, ease-out)";
            });
        });
    };

    /* =====================================================
       4. Scroll Reveal — staggered fade/slide-up on entry
    ===================================================== */
    const initScrollReveal = () => {
        const cards = document.querySelectorAll(".card");
        if (!cards.length) return;

        if (prefersReducedMotion) {
            cards.forEach((card) => card.classList.add("show"));
            return;
        }

        cards.forEach((card, i) => {
            card.classList.add("reveal-ready");
            card.style.setProperty("--reveal-delay", `${Math.min(i * 60, 400)}ms`);
        });

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("show");
                        obs.unobserve(entry.target); // animate once
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
        );

        cards.forEach((card) => observer.observe(card));
    };

    /* =====================================================
       5. Scroll-to-Top — floating button with fade/scale
    ===================================================== */
    const initScrollToTop = () => {
        const btn = document.createElement("button");
        btn.innerHTML = "&#8593;";
        btn.className = "btn btn-danger movieverse-top-btn";
        btn.setAttribute("aria-label", "Scroll to top");
        btn.type = "button";

        Object.assign(btn.style, {
            position: "fixed",
            bottom: "30px",
            right: "30px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            lineHeight: "1",
            zIndex: "999",
            opacity: "0",
            transform: "translateY(16px) scale(.9)",
            pointerEvents: "none",
            transition: prefersReducedMotion
                ? "none"
                : "opacity .3s ease, transform .3s ease",
        });

        document.body.appendChild(btn);

        const SHOW_AT = 300;

        const update = () => {
            const visible = window.scrollY > SHOW_AT;
            btn.style.opacity = visible ? "1" : "0";
            btn.style.transform = visible
                ? "translateY(0) scale(1)"
                : "translateY(16px) scale(.9)";
            btn.style.pointerEvents = visible ? "auto" : "none";
        };

        window.addEventListener("scroll", rafThrottle(update), { passive: true });
        update();

        btn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? "auto" : "smooth",
            });
        });
    };

    /* =====================================================
       6. Toast — reusable cinema-style notification
       Usage: showToast("Added to watchlist")
    ===================================================== */
    let toastTimer = null;

    const showToast = (message, duration = 2500) => {
        let toast = document.querySelector(".toast-cinema");

        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast-cinema";
            document.body.appendChild(toast);
        }

        toast.textContent = message;

        clearTimeout(toastTimer);
        requestAnimationFrame(() => toast.classList.add("show"));

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, duration);
    };

    /* =====================================================
       7. Watchlist Buttons — toggle state + persist + toast
       Expects: <button class="watchlist-btn" data-id="123">
    ===================================================== */
    const initWatchlist = () => {
        const buttons = document.querySelectorAll(".watchlist-btn");
        if (!buttons.length) return;

        const STORAGE_KEY = "movieverse_watchlist";
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

        const persist = (list) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        };

        buttons.forEach((btn) => {
            const id = btn.dataset.id;
            if (id && saved.includes(id)) {
                btn.classList.add("active");
                btn.innerHTML = "&#9829;"; // filled heart
            } else {
                btn.innerHTML = "&#9825;"; // outline heart
            }

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation(); // don't trigger card/modal click

                const isActive = btn.classList.toggle("active");
                btn.innerHTML = isActive ? "&#9829;" : "&#9825;";

                let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

                if (id) {
                    list = isActive
                        ? [...new Set([...list, id])]
                        : list.filter((item) => item !== id);
                    persist(list);
                }

                showToast(isActive ? "Added to watchlist" : "Removed from watchlist");
            });
        });
    };

    /* =====================================================
       8. Search Bar — live filter movie cards by title
       Expects: <input class="search-input"> and
       cards with a .card-title inside
    ===================================================== */
    const initSearch = () => {
        const input = document.querySelector(".search-input");
        if (!input) return;

        const cards = document.querySelectorAll("[data-movie-card]");
        const emptyState = document.querySelector(".empty-state");

        const filter = () => {
            const query = input.value.trim().toLowerCase();
            let visibleCount = 0;

            cards.forEach((card) => {
                const title = card
                    .querySelector(".card-title")
                    ?.textContent.toLowerCase() || "";

                const match = title.includes(query);
                card.style.display = match ? "" : "none";
                if (match) visibleCount++;
            });

            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? "block" : "none";
            }
        };

        input.addEventListener("input", rafThrottle(filter));
    };

    /* =====================================================
       9. Genre Chips — filter cards by data-genre
       Expects: <span class="chip" data-genre="action">
       and cards with [data-genre="action"]
    ===================================================== */
    const initGenreChips = () => {
        const chips = document.querySelectorAll(".chip");
        if (!chips.length) return;

        const cards = document.querySelectorAll("[data-movie-card]");

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                chips.forEach((c) => c.classList.remove("active"));
                chip.classList.add("active");

                const genre = chip.dataset.genre || "all";

                cards.forEach((card) => {
                    const cardGenre = card.dataset.genre || "";
                    const show = genre === "all" || cardGenre === genre;
                    card.style.display = show ? "" : "none";
                });
            });
        });
    };

    /* =====================================================
       10. Movie Modal — open on card click, close on
       backdrop / close button / Escape key
       Expects: <div class="movie-modal-backdrop">
                  <div class="movie-modal">
                    <button class="movie-modal__close">
                    <div class="movie-modal__body">...</div>
    ===================================================== */
    const initMovieModal = () => {
        const backdrop = document.querySelector(".movie-modal-backdrop");
        if (!backdrop) return;

        const modal = backdrop.querySelector(".movie-modal");
        const closeBtn = backdrop.querySelector(".movie-modal__close");
        const body = backdrop.querySelector(".movie-modal__body");
        const triggers = document.querySelectorAll("[data-movie-card]");

        let lastFocused = null;

        const openModal = (card) => {
            lastFocused = document.activeElement;

            if (body) {
                const title = card.querySelector(".card-title")?.textContent || "";
                const desc = card.querySelector(".card-text")?.textContent || "";
                const img = card.querySelector("img")?.src || "";

                body.innerHTML = `
                    ${img ? `<img src="${img}" alt="${title}" style="width:100%;border-radius:14px 14px 0 0;">` : ""}
                    <div style="padding:24px;">
                        <h2>${title}</h2>
                        <p style="color:var(--text-secondary);">${desc}</p>
                    </div>
                `;
            }

            backdrop.classList.add("open");
            document.body.style.overflow = "hidden";
            closeBtn?.focus();
        };

        const closeModal = () => {
            backdrop.classList.remove("open");
            document.body.style.overflow = "";
            lastFocused?.focus();
        };

        triggers.forEach((card) => {
            card.addEventListener("click", (e) => {
                if (e.target.closest(".watchlist-btn")) return; // don't open on heart click
                openModal(card);
            });
        });

        closeBtn?.addEventListener("click", closeModal);

        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && backdrop.classList.contains("open")) {
                closeModal();
            }
        });
    };

    /* =====================================================
       11. Trailer Modal — loading shimmer + autoplay/stop
       Expects: .trailer-modal wrapping a Bootstrap modal,
       an iframe#trailerFrame with data-src, and a
       .trailer-frame-wrap element for the loading shimmer
    ===================================================== */
    const initTrailerModal = () => {
        const modal = document.querySelector(".trailer-modal");
        if (!modal) return;

        const frame = modal.querySelector("#trailerFrame");
        const frameWrap = modal.querySelector(".trailer-frame-wrap");
        if (!frame) return;

        modal.addEventListener("shown.bs.modal", () => {
            frameWrap?.classList.add("loading");
            frame.src = `${frame.dataset.src}?autoplay=1`;
        });

        frame.addEventListener("load", () => {
            frameWrap?.classList.remove("loading");
        });

        modal.addEventListener("hidden.bs.modal", () => {
            frame.src = ""; // stops playback when modal closes
        });
    };

    /* =====================================================
       12. Custom Cursor — soft glow that follows the mouse
    ===================================================== */
    const initCustomCursor = () => {
        const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        if (!canHover || prefersReducedMotion) return;

        // Remove leftovers if script re-runs / bfcache restore
        document.querySelectorAll(".cursor-dot, .cursor-ring").forEach((el) => el.remove());

        const dot = document.createElement("div");
        const ring = document.createElement("div");
        dot.className = "cursor-dot";
        ring.className = "cursor-ring";
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        document.body.classList.add("has-custom-cursor");

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;
        let rafId = 0;
        let active = true;

        const HOVER_SELECTOR =
            "a, button, .btn, .chip, .watchlist-btn, .nav-link, " +
            ".dropdown-item, .cx-submit, .cast-more-btn, input, " +
            "textarea, select, .bi-person-circle, .profile-icon-btn, " +
            ".cast-member-link, [role='button']";

        const showCursor = () => {
            if (!active) return;
            document.body.classList.add("cursor-ready");
        };

        const hideCursor = () => {
            document.body.classList.remove(
                "cursor-ready",
                "cursor-hover",
                "cursor-hover-profile",
                "cursor-click"
            );
        };

        const move = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.left = `${mouseX}px`;
            dot.style.top = `${mouseY}px`;
            // Keep ring close so it never looks stuck while waiting/navigating
            ringX += (mouseX - ringX) * 0.45;
            ringY += (mouseY - ringY) * 0.45;
            ring.style.left = `${ringX}px`;
            ring.style.top = `${ringY}px`;
            showCursor();
        };

        const animateRing = () => {
            if (!active) return;
            ringX += (mouseX - ringX) * 0.22;
            ringY += (mouseY - ringY) * 0.22;
            ring.style.left = `${ringX}px`;
            ring.style.top = `${ringY}px`;
            rafId = requestAnimationFrame(animateRing);
        };

        const destroyCursor = () => {
            active = false;
            cancelAnimationFrame(rafId);
            hideCursor();
            document.body.classList.remove("has-custom-cursor");
            dot.remove();
            ring.remove();
        };

        document.addEventListener("mousemove", move, { passive: true });
        document.addEventListener("mouseenter", showCursor);
        document.addEventListener("mouseleave", hideCursor);
        document.addEventListener("mousedown", () => {
            document.body.classList.add("cursor-click");
        });
        document.addEventListener("mouseup", () => {
            document.body.classList.remove("cursor-click");
        });

        document.addEventListener("mouseover", (e) => {
            const target = e.target.closest(HOVER_SELECTOR);
            const onProfile = Boolean(e.target.closest(".profile-icon-btn, .bi-person-circle"));
            document.body.classList.toggle("cursor-hover", Boolean(target));
            document.body.classList.toggle("cursor-hover-profile", onProfile);
        });

        // Prevent stuck ring when clicking cast / any navigation link
        document.addEventListener(
            "click",
            (e) => {
                const link = e.target.closest("a[href]");
                if (!link) return;
                const href = link.getAttribute("href") || "";
                if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
                // Snap + hide so ring doesn't freeze mid-screen during page wait
                ringX = mouseX;
                ringY = mouseY;
                ring.style.left = `${ringX}px`;
                ring.style.top = `${ringY}px`;
                hideCursor();
            },
            true
        );

        window.addEventListener("pagehide", destroyCursor);
        window.addEventListener("beforeunload", destroyCursor);

        rafId = requestAnimationFrame(animateRing);
    };

    /* =====================================================
       13. Button Ripple — click splash on interactive controls
    ===================================================== */
    const initButtonRipple = () => {
        if (prefersReducedMotion) return;

        const SELECTOR =
            ".btn, .cx-submit, .cast-more-btn, .btn-play-trailer, " +
            ".watchlist-btn, .pagination-cinema button, .chip, " +
            ".movieverse-top-btn";

        document.addEventListener("click", (e) => {
            const btn = e.target.closest(SELECTOR);
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ripple = document.createElement("span");
            ripple.className = "btn-ripple";
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

            btn.appendChild(ripple);
            ripple.addEventListener("animationend", () => ripple.remove());
        });
    };

    /* =====================================================
       14. Hover effects — JS only (no UI/layout/CSS redesign)
    ===================================================== */
    const initHoverEffects = () => {
        if (prefersReducedMotion) return;

        const bindHover = (el, onEnter, onLeave) => {
            el.addEventListener("mouseenter", onEnter);
            el.addEventListener("mouseleave", onLeave);
            el.addEventListener("focus", onEnter);
            el.addEventListener("blur", onLeave);
        };

        // Buttons
        document.querySelectorAll(".btn, .cx-submit, .cast-more-btn").forEach((el) => {
            const prevTransition = el.style.transition;
            el.style.transition = "transform .25s ease, filter .25s ease, box-shadow .25s ease";

            bindHover(
                el,
                () => {
                    el.style.transform = "translateY(-2px) scale(1.03)";
                    el.style.filter = "brightness(1.08)";
                },
                () => {
                    el.style.transform = "";
                    el.style.filter = "";
                    el.style.transition = prevTransition || "transform .25s ease, filter .25s ease, box-shadow .25s ease";
                }
            );
        });

        // Nav links
        document.querySelectorAll(".navbar .nav-link").forEach((el) => {
            el.style.transition = "color .25s ease, transform .25s ease";
            bindHover(
                el,
                () => {
                    el.style.color = "#e5303f";
                    el.style.transform = "translateY(-1px)";
                },
                () => {
                    el.style.color = "";
                    el.style.transform = "";
                }
            );
        });

        // Login / profile circle → red so user knows cursor is there
        const profileBtn = document.querySelector(".profile-icon-btn");
        if (profileBtn) {
            const icon = profileBtn.querySelector(".bi-person-circle") || profileBtn;
            profileBtn.style.transition = "background .25s ease, box-shadow .25s ease";
            icon.style.transition = "color .25s ease, transform .25s ease, text-shadow .25s ease, filter .25s ease";

            bindHover(
                profileBtn,
                () => {
                    profileBtn.style.background = "rgba(229, 48, 63, 0.18)";
                    profileBtn.style.boxShadow = "0 0 0 3px rgba(229, 48, 63, 0.28)";
                    icon.style.color = "#e5303f";
                    icon.style.transform = "scale(1.18)";
                    icon.style.textShadow = "0 0 14px rgba(229, 48, 63, 0.9)";
                    icon.style.filter = "drop-shadow(0 0 6px rgba(229, 48, 63, 0.7))";
                    document.body.classList.add("cursor-hover-profile");
                },
                () => {
                    profileBtn.style.background = "";
                    profileBtn.style.boxShadow = "";
                    icon.style.color = "";
                    icon.style.transform = "";
                    icon.style.textShadow = "";
                    icon.style.filter = "";
                    document.body.classList.remove("cursor-hover-profile");
                }
            );
        }

        // Dropdown items
        document.querySelectorAll(".dropdown-item").forEach((el) => {
            el.style.transition = "color .2s ease, background .2s ease";
            bindHover(
                el,
                () => {
                    el.style.color = "#e5303f";
                    el.style.background = "rgba(229, 48, 63, 0.12)";
                },
                () => {
                    el.style.color = "";
                    el.style.background = "";
                }
            );
        });
    };

    /* =====================================================
       Init
    ===================================================== */
    const init = () => {
        initPageFade();
        initNavbarElevation();
        initCardTilt();
        initScrollReveal();
        initScrollToTop();
        initWatchlist();
        initSearch();
        initGenreChips();
        initMovieModal();
        initTrailerModal();
        initCustomCursor();
        initButtonRipple();
        initHoverEffects();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();