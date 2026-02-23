import * as React from 'react';
import {IconFocus2, IconResize} from '@tabler/icons';
import {IconButton} from '../../../components/control/icon-button';
import {updateStory, useStoriesContext, Story} from '../../../store/stories';
import {boundingRect} from '../../../util/geometry';
import {PassageDisplayMode} from '../../../components/passage/passage-map';
import {setInstantZoomFlag} from '../use-zoom-wheel';
import {IconViewFull, IconViewTitles, IconViewAuto} from './view-mode-icons';
import './zoom-buttons.css';

const emptySet = new Set<string>();

export interface PassageAnalysis {
	orphanIds: Set<string>;
	deadEndIds: Set<string>;
	confirmedEnds: number;
	unconfirmedEnds: number;
	hubCount: number;
}

export interface ZoomButtonsProps {
	story: Story;
	mainContent: React.RefObject<HTMLElement>;
	displayMode: PassageDisplayMode;
	onChangeDisplayMode: (mode: PassageDisplayMode) => void;
	orphanIds?: Set<string>;
	passageAnalysis?: PassageAnalysis;
}

export const ZoomButtons: React.FC<ZoomButtonsProps> = React.memo(
	({story, mainContent, displayMode, onChangeDisplayMode, orphanIds = emptySet, passageAnalysis}) => {
	const {dispatch, stories} = useStoriesContext();

	const zoomToPassages = React.useCallback(
		(passages: typeof story.passages) => {
			const el = mainContent.current;

			if (!el || passages.length === 0) {
				return;
			}

			const bounds = boundingRect(passages);
			const viewW = el.clientWidth;
			const viewH = el.clientHeight;

			const pad = 60;
			const contentW = bounds.width + pad * 2;
			const contentH = bounds.height + pad * 2;

			const fitZoom = Math.max(0.05, Math.min(1, Math.min(
				viewW / contentW,
				viewH / contentH
			)));

			setInstantZoomFlag();
			dispatch(updateStory(stories, story, {zoom: fitZoom}));

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const cx = bounds.left + bounds.width / 2;
					const cy = bounds.top + bounds.height / 2;

					el.scrollLeft = cx * fitZoom - viewW / 2;
					el.scrollTop = cy * fitZoom - viewH / 2;
				});
			});
		},
		[dispatch, mainContent, stories, story]
	);

	const handleZoomToFit = React.useCallback(() => {
		zoomToPassages(story.passages);
	}, [story.passages, zoomToPassages]);

	const selectedPassages = React.useMemo(
		() => story.passages.filter(p => p.selected),
		[story.passages]
	);

	const handleZoomToSelection = React.useCallback(() => {
		zoomToPassages(selectedPassages);
	}, [selectedPassages, zoomToPassages]);

	// Passage stats — use pre-computed analysis when available.
	const confirmedEnds = passageAnalysis?.confirmedEnds ?? 0;
	const unconfirmedEnds = passageAnalysis?.unconfirmedEnds ?? 0;
	const hubCount = passageAnalysis?.hubCount ?? 0;

	const orphanCount = orphanIds.size;

	return (
		<div className="zoom-buttons">
			<span className="legend">View</span>
			<IconButton
				icon={<IconViewFull />}
				iconOnly
				label="Title & summary"
				onClick={() => onChangeDisplayMode('full')}
				selectable
				selected={displayMode === 'full'}
			/>
			<IconButton
				icon={<IconViewTitles />}
				iconOnly
				label="Title only"
				onClick={() => onChangeDisplayMode('titles')}
				selectable
				selected={displayMode === 'titles'}
			/>
			<IconButton
				icon={<IconViewAuto />}
				iconOnly
				label="Auto (zoom-based)"
				onClick={() => onChangeDisplayMode('auto')}
				selectable
				selected={displayMode === 'auto'}
			/>
			<IconButton
				icon={<IconFocus2 />}
				iconOnly
				label="Zoom to fit all"
				onClick={handleZoomToFit}
				disabled={story.passages.length === 0}
			/>
			<IconButton
				icon={<IconResize />}
				iconOnly
				label="Zoom to selection"
				onClick={handleZoomToSelection}
				disabled={selectedPassages.length === 0}
			/>
			<span className="passage-stats">
				{story.passages.length}p
				{selectedPassages.length > 0 && (
					<> ({selectedPassages.length} sel)</>
				)}
				{confirmedEnds > 0 && (
					<span className="stat-confirmed"> · {confirmedEnds} ✓end</span>
				)}
				{hubCount > 0 && (
					<span className="stat-hub"> · {hubCount} hub</span>
				)}
				{unconfirmedEnds > 0 && (
					<span className="stat-unconfirmed"> · {unconfirmedEnds} ?end</span>
				)}
				{orphanCount > 0 && (
					<span className="stat-orphan"> · {orphanCount} orphan</span>
				)}
			</span>
		</div>
	);
});

ZoomButtons.displayName = 'ZoomButtons';
