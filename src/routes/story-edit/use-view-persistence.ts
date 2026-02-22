import * as React from 'react';

/**
 * Persists and restores the scroll position of the story map by saving
 * it on the Story object (mapScrollLeft / mapScrollTop). This uses the
 * same persistence pipeline as zoom — IPC → file on disk in Electron,
 * JSON in localStorage for the web build — so it survives app restarts.
 *
 * To avoid flooding the store with updates on every scroll pixel, we
 * track the position in a ref and only dispatch a save:
 *  - every 5 seconds (interval)
 *  - when zoom changes
 *  - on component unmount (navigating away)
 *  - on beforeunload (closing the window)
 */
export function useViewPersistence(
	storyId: string,
	zoom: number,
	savedScrollLeft: number,
	savedScrollTop: number,
	onSaveScroll: (scrollLeft: number, scrollTop: number) => void,
	elementRef: React.RefObject<HTMLElement>
) {
	const restoredRef = React.useRef(false);
	const lastSavedRef = React.useRef({left: 0, top: 0});

	// Keep a ref to the save callback so the interval/cleanup always
	// calls the latest version without being a dependency.
	const onSaveScrollRef = React.useRef(onSaveScroll);
	onSaveScrollRef.current = onSaveScroll;

	// ── Restore ──────────────────────────────────────────────────────
	// Run once per story. Retries several times because the passage map
	// needs to render at full size before the scroll container is large
	// enough to actually accept the values.

	React.useEffect(() => {
		const el = elementRef.current;

		if (!el || restoredRef.current) {
			return;
		}

		restoredRef.current = true;

		const targetLeft = savedScrollLeft;
		const targetTop = savedScrollTop;

		if (targetLeft === 0 && targetTop === 0) {
			return;
		}

		let attempts = 0;
		const maxAttempts = 10;

		function tryRestore() {
			attempts++;

			el!.scrollLeft = targetLeft;
			el!.scrollTop = targetTop;

			const ok =
				(targetLeft < 1 || el!.scrollLeft > 0) &&
				(targetTop < 1 || el!.scrollTop > 0);

			if (!ok && attempts < maxAttempts) {
				requestAnimationFrame(() => {
					setTimeout(tryRestore, 50);
				});
			} else {
				// Seed the ref so the first interval doesn't re-save
				// the same position we just restored.
				lastSavedRef.current = {
					left: el!.scrollLeft,
					top: el!.scrollTop
				};
			}
		}

		requestAnimationFrame(() => {
			requestAnimationFrame(tryRestore);
		});
		// savedScrollLeft / savedScrollTop are read only on first mount
		// via the ref guard, so they don't need to be dependencies.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [elementRef, storyId]);

	// ── Save ─────────────────────────────────────────────────────────

	React.useEffect(() => {
		const el = elementRef.current;

		if (!el) {
			return;
		}

		function saveNow() {
			const left = el!.scrollLeft;
			const top = el!.scrollTop;

			if (
				left !== lastSavedRef.current.left ||
				top !== lastSavedRef.current.top
			) {
				lastSavedRef.current = {left, top};
				onSaveScrollRef.current(left, top);
			}
		}

		// Periodic save — ensures position survives even a hard kill
		// with at most 5 seconds of drift.
		const interval = setInterval(saveNow, 5000);

		// Belt-and-suspenders: also try on beforeunload.
		function handleBeforeUnload() {
			saveNow();
		}

		window.addEventListener('beforeunload', handleBeforeUnload);

		// Save immediately when zoom changes (effect re-runs on zoom).
		saveNow();

		return () => {
			clearInterval(interval);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			// Save on unmount — covers navigating back to story list.
			saveNow();
		};
	}, [elementRef, storyId, zoom]);
}
