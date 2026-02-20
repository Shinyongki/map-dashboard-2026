import { useRef, useState, useEffect, useCallback } from "react";

interface Position {
    x: number;
    y: number;
}

const PANEL_W = 420;
const PANEL_H = 620;

function getInitialPos(): Position {
    return {
        x: window.innerWidth - PANEL_W - 24,
        y: window.innerHeight - PANEL_H - 24,
    };
}

export function useDraggable() {
    const [pos, setPos] = useState<Position>(getInitialPos);
    const dragging = useRef(false);
    const startMouse = useRef({ x: 0, y: 0 });
    const startPos = useRef<Position>({ x: 0, y: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // 버튼 클릭은 드래그 무시
        if ((e.target as HTMLElement).closest("button")) return;
        dragging.current = true;
        startMouse.current = { x: e.clientX, y: e.clientY };
        startPos.current = { ...pos };
        e.preventDefault();
    }, [pos]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - startMouse.current.x;
            const dy = e.clientY - startMouse.current.y;
            setPos({
                x: Math.max(0, Math.min(window.innerWidth - PANEL_W, startPos.current.x + dx)),
                y: Math.max(0, Math.min(window.innerHeight - PANEL_H, startPos.current.y + dy)),
            });
        };
        const onUp = () => { dragging.current = false; };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    return { pos, onMouseDown };
}
