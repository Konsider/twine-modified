import * as React from 'react';
import {Passage} from '../../store/stories';
import {parseLinks} from '../../util/parse-links';
import './story-minimap.css';

export interface StoryMinimapProps {
	orphanIds?: Set<string>;
	passages: Passage[];
	startPassageId: string;
	zoom: number;
	container: React.RefObject<HTMLElement>;
	onZoom?: (newZoom: number) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const PADDING = 20;
const emptySet = new Set<string>();

export const StoryMinimap: React.FC<StoryMinimapProps> = React.memo(
	({orphanIds = emptySet, passages, startPassageId, zoom, container, onZoom}) => {
		const canvasRef = React.useRef<HTMLCanvasElement>(null);
		const draggingRef = React.useRef(false);

		// Compute the logical bounding rect of all passages.
		const bounds = React.useMemo(() => {
			if (passages.length === 0) {
				return {left: 0, top: 0, width: 1000, height: 1000};
			}

			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;

			for (const p of passages) {
				if (p.left < minX) minX = p.left;
				if (p.top < minY) minY = p.top;
				if (p.left + p.width > maxX) maxX = p.left + p.width;
				if (p.top + p.height > maxY) maxY = p.top + p.height;
			}

			return {
				left: minX - PADDING,
				top: minY - PADDING,
				width: maxX - minX + PADDING * 2,
				height: maxY - minY + PADDING * 2
			};
		}, [passages]);

		// Scale factor to fit bounds into minimap.
		const scale = React.useMemo(() => {
			const sx = MINIMAP_WIDTH / bounds.width;
			const sy = MINIMAP_HEIGHT / bounds.height;

			return Math.min(sx, sy);
		}, [bounds]);

		// Render the minimap.
		const draw = React.useCallback(() => {
			const canvas = canvasRef.current;
			const el = container.current;

			if (!canvas || !el) return;

			const ctx = canvas.getContext('2d');

			if (!ctx) return;

			const dpr = window.devicePixelRatio || 1;

			canvas.width = MINIMAP_WIDTH * dpr;
			canvas.height = MINIMAP_HEIGHT * dpr;
			ctx.scale(dpr, dpr);

			// Clear.
			ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

			// Subtle background.
			ctx.fillStyle = 'rgba(230, 238, 250, 0.4)';
			ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

			// Draw passages.
			for (const p of passages) {
				const x = (p.left - bounds.left) * scale;
				const y = (p.top - bounds.top) * scale;
				const w = Math.max(p.width * scale, 2);
				const h = Math.max(p.height * scale, 2);

				if (p.id === startPassageId) {
					ctx.fillStyle = '#4a90d9';
				} else if (p.end) {
					ctx.fillStyle = '#5cb85c';
				} else if (p.text.trim() !== '' && parseLinks(p.text, true).length === 0) {
					ctx.fillStyle = '#9b59b6';
				} else if (orphanIds.has(p.id)) {
					ctx.fillStyle = '#e89740';
				} else if (p.selected) {
					ctx.fillStyle = '#2196f3';
				} else {
					ctx.fillStyle = '#888';
				}

				ctx.fillRect(x, y, w, h);
			}

			// Draw viewport rectangle.
			const vx = (el.scrollLeft / zoom - bounds.left) * scale;
			const vy = (el.scrollTop / zoom - bounds.top) * scale;
			const vw = (el.clientWidth / zoom) * scale;
			const vh = (el.clientHeight / zoom) * scale;

			ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
			ctx.lineWidth = 1.5;
			ctx.strokeRect(vx, vy, vw, vh);
		}, [bounds, container, orphanIds, passages, scale, startPassageId, zoom]);

		// Redraw on changes.
		React.useEffect(() => {
			draw();
		}, [draw]);

		// Also redraw on scroll (passive listener).
		React.useEffect(() => {
			const el = container.current;

			if (!el) return;

			let raf: number;

			function handleScroll() {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(draw);
			}

			el.addEventListener('scroll', handleScroll, {passive: true});
			return () => {
				el.removeEventListener('scroll', handleScroll);
				cancelAnimationFrame(raf);
			};
		}, [container, draw]);

		// Click / drag on minimap scrolls the main view.
		const scrollTo = React.useCallback(
			(clientX: number, clientY: number) => {
				const canvas = canvasRef.current;
				const el = container.current;

				if (!canvas || !el) return;

				const rect = canvas.getBoundingClientRect();
				const mx = clientX - rect.left;
				const my = clientY - rect.top;

				// Convert minimap coords to logical passage coords.
				const logicalX = mx / scale + bounds.left;
				const logicalY = my / scale + bounds.top;

				// Centre the viewport on that point.
				el.scrollLeft = logicalX * zoom - el.clientWidth / 2;
				el.scrollTop = logicalY * zoom - el.clientHeight / 2;
			},
			[bounds, container, scale, zoom]
		);

		const handlePointerDown = React.useCallback(
			(e: React.PointerEvent) => {
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				draggingRef.current = true;
				scrollTo(e.clientX, e.clientY);
			},
			[scrollTo]
		);

		const handlePointerMove = React.useCallback(
			(e: React.PointerEvent) => {
				if (draggingRef.current) {
					scrollTo(e.clientX, e.clientY);
				}
			},
			[scrollTo]
		);

		const handlePointerUp = React.useCallback(
			(e: React.PointerEvent) => {
				e.currentTarget.releasePointerCapture(e.pointerId);
				draggingRef.current = false;
			},
			[]
		);

		// Ctrl+scroll on minimap zooms the main map toward the pointer.
		React.useEffect(() => {
			const canvas = canvasRef.current;
			const el = container.current;

			if (!canvas || !el || !onZoom) return;

			function handleWheel(e: WheelEvent) {
				if (!e.ctrlKey && !e.metaKey) return;

				e.preventDefault();
				e.stopPropagation();

				const sensitivity = 0.003;
				const newZoom = Math.max(0.05, Math.min(2,
					zoom * Math.exp(-e.deltaY * sensitivity)
				));

				// Find what logical point the cursor is over on the minimap.
				const rect = canvas!.getBoundingClientRect();
				const mx = e.clientX - rect.left;
				const my = e.clientY - rect.top;

				const logicalX = mx / scale + bounds.left;
				const logicalY = my / scale + bounds.top;

				onZoom!(newZoom);

				// After the DOM updates with the new zoom, scroll so the
				// logical point under the cursor is centred in the viewport.
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						el!.scrollLeft = logicalX * newZoom - el!.clientWidth / 2;
						el!.scrollTop = logicalY * newZoom - el!.clientHeight / 2;
					});
				});
			}

			canvas.addEventListener('wheel', handleWheel, {passive: false});
			return () => canvas.removeEventListener('wheel', handleWheel);
		}, [bounds, container, onZoom, scale, zoom]);

		if (passages.length === 0) {
			return null;
		}

		return (
			<div className="story-minimap">
				<canvas
					ref={canvasRef}
					width={MINIMAP_WIDTH}
					height={MINIMAP_HEIGHT}
					style={{width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT}}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
				/>
			</div>
		);
	}
);

StoryMinimap.displayName = 'StoryMinimap';
