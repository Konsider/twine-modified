import classNames from 'classnames';
import * as React from 'react';
import {Point} from '../../util/geometry';
import {DocumentTitle} from '../document-title/document-title';
import './main-content.css';

export interface MainContentProps
	extends React.ComponentPropsWithoutRef<'div'> {
	grabbable?: boolean;
	padded?: boolean;
	title?: string;
}

export const MainContent = React.forwardRef<HTMLDivElement, MainContentProps>(
	(props, ref) => {
		const {children, grabbable, title} = props;
		const containerRef = React.useRef<HTMLDivElement>(null);
		const className = classNames('main-content', {
			padded: props.padded ?? true
		});

		React.useImperativeHandle(
			ref,
			() => containerRef.current as HTMLDivElement
		);

		React.useEffect(() => {
			if (containerRef.current) {
				containerRef.current.focus();
			}
		}, []);

		React.useEffect(() => {
			const container = containerRef.current;
			let dragScrollStart: Point;
			let dragMouseStart: Point;
			let isPanning = false;
			const PAN_THRESHOLD = 4; // px of movement before committing to a pan

			function moveListener(event: PointerEvent) {
				if (!container) return;

				if (!isPanning) {
					const dx = event.clientX - dragMouseStart.left;
					const dy = event.clientY - dragMouseStart.top;

					if (Math.abs(dx) < PAN_THRESHOLD && Math.abs(dy) < PAN_THRESHOLD) {
						return;
					}

					// Movement exceeds threshold — commit to panning.
					isPanning = true;
					container.style.cursor = 'grabbing';
				}

				container.scrollLeft =
					dragScrollStart.left + (dragMouseStart.left - event.clientX);
				container.scrollTop =
					dragScrollStart.top + (dragMouseStart.top - event.clientY);
			}

			function stopGrab(event: PointerEvent) {
				if (!container) {
					return;
				}

				container.releasePointerCapture(event.pointerId);
				container.removeEventListener('pointerleave', stopGrab);
				container.removeEventListener('pointermove', moveListener);
				container.removeEventListener('pointerup', upListener);
				container.style.cursor = '';
				isPanning = false;
			}

			function upListener(event: PointerEvent) {
				if (event.button === 0) {
					stopGrab(event);
				}
			}

			function downListener(event: PointerEvent) {
				if (event.button !== 0 || !container) {
					return;
				}

				// Don't pan when clicking on a passage card or interactive
				// UI elements — those should still select/drag passages.
				const target = event.target as HTMLElement;

				if (
					target.closest(
						'.passage-card, .fuzzy-finder, .zoom-buttons'
					)
				) {
					return;
				}

				// Don't call preventDefault here — let click/dblclick events
				// fire normally.  We only start panning once the pointer
				// moves beyond the threshold.
				isPanning = false;
				container.setPointerCapture(event.pointerId);
				container.addEventListener('pointerleave', stopGrab);
				container.addEventListener('pointermove', moveListener);
				container.addEventListener('pointerup', upListener);
				dragScrollStart = {
					left: container.scrollLeft,
					top: container.scrollTop
				};
				dragMouseStart = {left: event.clientX, top: event.clientY};
			}

			if (grabbable && container) {
				container.addEventListener('pointerdown', downListener);
				return () => {
					container.removeEventListener('pointerdown', downListener);
				};
			}
		}, [grabbable]);

		return (
			<div className={className} ref={containerRef}>
				{title && (
					<>
						<DocumentTitle title={title} />
						<h1>{title}</h1>
					</>
				)}
				{children}
			</div>
		);
	}
);
