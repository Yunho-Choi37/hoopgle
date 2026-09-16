import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Reusable horizontal scroll menu component that provides:
 * 1. Smooth mouse wheel horizontal scrolling on desktop
 * 2. Click & drag-to-scroll with mouse
 * 3. Floating Left / Right navigation chevron buttons when overflowing
 * 4. Sleek modern desktop scrollbar
 * 5. Touch swipe for mobile devices
 * 6. Responsive auto-centering when content fits within viewport
 */
const HorizontalScrollMenu = ({ children, className = '', style = {} }) => {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowing = scrollWidth > clientWidth + 3;
    setIsOverflowing(overflowing);
    setShowLeftArrow(overflowing && scrollLeft > 6);
    setShowRightArrow(overflowing && scrollWidth - clientWidth - scrollLeft > 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    // Wheel event handler: converts vertical scroll wheel into horizontal scroll on desktop
    const handleWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;

      // If predominantly vertical scroll
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const canScrollLeft = el.scrollLeft > 0;
        const canScrollRight = el.scrollWidth - el.clientWidth - el.scrollLeft > 1;

        if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
          checkScroll();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', checkScroll, { passive: true });

    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(el);
      Array.from(el.children).forEach(child => resizeObserver.observe(child));
    }

    const handleWindowResize = () => checkScroll();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', checkScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [checkScroll, children]);

  // Gentle auto-scroll for active child if off-screen
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeChild = el.querySelector('.active');
    if (activeChild) {
      const elRect = el.getBoundingClientRect();
      const childRect = activeChild.getBoundingClientRect();
      if (childRect.left < elRect.left + 30 || childRect.right > elRect.right - 30) {
        activeChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [children]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only primary mouse button
    const el = scrollRef.current;
    if (!el) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftStartRef.current = el.scrollLeft;

    const handleWindowMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const walk = moveEvent.pageX - startXRef.current;
      if (Math.abs(walk) > 5) {
        hasMovedRef.current = true;
        el.classList.add('is-dragging');
      }
      el.scrollLeft = scrollLeftStartRef.current - walk;
      checkScroll();
    };

    const handleWindowMouseUp = () => {
      isDraggingRef.current = false;
      el.classList.remove('is-dragging');
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 80);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleClickCapture = (e) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const scrollByAmount = (amount) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  return (
    <div className={`horizontal-scroll-wrapper ${isOverflowing ? 'has-overflow' : 'no-overflow'}`} style={style}>
      {showLeftArrow && (
        <div className="scroll-arrow-box scroll-arrow-left">
          <button
            type="button"
            className="scroll-arrow-btn"
            onClick={() => scrollByAmount(-240)}
            aria-label="이전 항목 보기"
          >
            ‹
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        className={`horizontal-scroll-track ${className}`}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
      {showRightArrow && (
        <div className="scroll-arrow-box scroll-arrow-right">
          <button
            type="button"
            className="scroll-arrow-btn"
            onClick={() => scrollByAmount(240)}
            aria-label="다음 항목 보기"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default HorizontalScrollMenu;
