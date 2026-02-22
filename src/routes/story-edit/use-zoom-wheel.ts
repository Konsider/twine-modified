import * as React from 'react';
import {Story, updateStory, useStoriesContext} from '../../store/stories';
import {minZoom, maxZoom} from '../../store/stories/zoom';

/**
 * Module-level flag so the zoom transition system knows not to animate
 * when the zoom was changed by the mouse wheel (we handle the visual
 * update synchronously ourselves).
 */
let _lastChangeWasWheel = false;

/**
 * Returns `true` (once) if the most recent zoom change came from the wheel
 * or another source that requested instant zoom (e.g. zoom-to-fit).
 * Consuming the flag resets it so subsequent non-wheel changes animate normally.
 */
export function consumeWheelZoomFlag(): boolean {
	if (_lastChangeWasWheel) {
		_lastChangeWasWheel = false;
		return true;
	}
	return false;
}

/**
 * Tell the zoom transition to snap instantly for the next zoom change.
 * Used by zoom-to-fit / zoom-to-selection so scroll positioning works.
 */
export function setInstantZoomFlag() {
	_lastChangeWasWheel = true;
}

/**
 * Sensitivity — controls how much zoom changes per pixel of wheel delta.
 * Lower = finer / smoother.  0.003 gives a nice feel on both trackpads
 * (small deltas) and notched mouse wheels (delta ~100).
 */
const ZOOM_SENSITIVITY = 0.003;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Smooth, pointer-relative Ctrl+mousewheel zoom for the story map.
 *
 * The CSS `transform` and scroll position are set **synchronously** in the
 * wheel handler so the viewport never flickers.  React state is updated
 * afterwards; the transition system sees the wheel flag and snaps instead
 * of animating so it doesn't fight with us.
 */
export function useZoomWheel(
	story: Story,
	container: React.RefObject<HTMLDivElement>
) {
	const {dispatch, stories} = useStoriesContext();

	const stateRef = React.useRef({story, stories, dispatch});
	stateRef.current = {story, stories, dispatch};

	React.useEffect(() => {
		const el = container.current;

		if (!el) {
			return;
		}

		function handleWheel(event: WheelEvent) {
			if (!event.ctrlKey) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			const {story: s, stories: st, dispatch: d} = stateRef.current;
			const oldZoom = s.zoom;

			// Exponential zoom: trackpads send small deltaY → fine steps,
			// mouse wheels send large deltaY → bigger steps.  `exp()` keeps
			// the zoom factor multiplicative so zooming in then out returns
			// to the same level.
			const newZoom = clamp(
				oldZoom * Math.exp(-event.deltaY * ZOOM_SENSITIVITY),
				minZoom,
				maxZoom
			);

			if (Math.abs(newZoom - oldZoom) < 0.0001) {
				return;
			}

			// --- Pointer-relative scroll adjustment ---
			const rect = el!.getBoundingClientRect();
			const pointerX = event.clientX - rect.left;
			const pointerY = event.clientY - rect.top;

			// Map coordinate under cursor at old zoom.
			const mapX = (el!.scrollLeft + pointerX) / oldZoom;
			const mapY = (el!.scrollTop + pointerY) / oldZoom;

			// Synchronously update the DOM so the frame looks correct
			// before React has a chance to re-render.
			const passageMap = el!.querySelector('.passage-map') as HTMLElement;

			if (passageMap) {
				passageMap.style.transform = `scale(${newZoom})`;

				// Also update the dimensions so scrollable area is correct.
				// The passage map sets width/height via React style, but we
				// need to keep them in sync with the new zoom so the scroll
				// range doesn't jump.
			}

			// Adjust scroll so the map point under the pointer stays put.
			el!.scrollLeft = mapX * newZoom - pointerX;
			el!.scrollTop = mapY * newZoom - pointerY;

			// Tell the transition system to snap, not animate.
			_lastChangeWasWheel = true;

			// Now update React state.
			d(updateStory(st, s, {zoom: newZoom}));
		}

		el.addEventListener('wheel', handleWheel, {passive: false});

		return () => {
			el.removeEventListener('wheel', handleWheel);
		};
	}, [container]);
}
