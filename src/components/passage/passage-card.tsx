import classNames from 'classnames';
import {deviceType} from 'detect-it';
import * as React from 'react';
import {DraggableCore, DraggableCoreProps} from 'react-draggable';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import {Passage, TagColors} from '../../store/stories';
import {TagStripe} from '../tag/tag-stripe';
import {passageIsEmpty} from '../../util/passage-is-empty';
import {parseLinks} from '../../util/parse-links';
import {isElectronRenderer} from '../../util/is-electron';
import './passage-card.css';

export interface PassageCardProps {
	onEdit: (passage: Passage) => void;
	onDeselect: (passage: Passage) => void;
	onDragStart?: DraggableCoreProps['onStart'];
	onDrag?: DraggableCoreProps['onDrag'];
	onDragStop?: DraggableCoreProps['onStop'];
	onSelect: (passage: Passage, exclusive: boolean) => void;
	orphanIds?: Set<string>;
	passage: Passage;
	storyIfid?: string;
	tagColors: TagColors;
}

// Needs to fill a large-sized passage card.
const excerptLength = 400;

export const PassageCard: React.FC<PassageCardProps> = React.memo(props => {
	const {
		onDeselect,
		onDrag,
		onDragStart,
		onDragStop,
		onEdit,
		onSelect,
		orphanIds,
		passage,
		storyIfid,
		tagColors
	} = props;
	const {t} = useTranslation();
	const isEmpty = passageIsEmpty(passage);
	const isUnconfirmedEnd = !passage.end && passage.text.trim() !== '' && parseLinks(passage.text, true).length === 0;
	const isOrphan = orphanIds ? orphanIds.has(passage.id) : false;
	const className = React.useMemo(
		() =>
			classNames('passage-card', {
				empty: isEmpty,
				'is-end': passage.end,
				'is-unconfirmed-end': isUnconfirmedEnd,
				'is-orphan': isOrphan,
				selected: passage.selected
			}),
		[passage, isEmpty, isUnconfirmedEnd, isOrphan]
	);
	const container = React.useRef<HTMLDivElement>(null);

	// Hover preview state.
	const [showPreview, setShowPreview] = React.useState(false);
	const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
	const isDraggingRef = React.useRef(false);

	const previewText = React.useMemo(() => {
		if (passage.text.length === 0) return '';
		return passage.text.length > 120
			? passage.text.substring(0, 120) + '…'
			: passage.text;
	}, [passage.text]);

	const handleMouseEnter = React.useCallback((e: React.MouseEvent) => {
		if (isDraggingRef.current || !previewText) return;
		hoverTimerRef.current = setTimeout(() => {
			if (!isDraggingRef.current) setShowPreview(true);
		}, 1000);
	}, [previewText]);

	const handleMouseLeave = React.useCallback(() => {
		clearTimeout(hoverTimerRef.current);
		setShowPreview(false);
	}, []);

	// Clean up hover timer on unmount.
	React.useEffect(() => {
		return () => clearTimeout(hoverTimerRef.current);
	}, []);

	const excerpt = React.useMemo(() => {
		if (passage.text.length > 0) {
			return passage.text.substring(0, excerptLength);
		}

		return (
			<span className="placeholder">
				{t(
					deviceType === 'touchOnly'
						? 'components.passageCard.placeholderTouch'
						: 'components.passageCard.placeholderClick'
				)}
			</span>
		);
	}, [passage.text, t]);
	const style = React.useMemo(
		() => ({
			height: passage.height,
			left: passage.left,
			top: passage.top,
			width: passage.width
		}),
		[passage.height, passage.left, passage.top, passage.width]
	);

	// Build the image URL for the passage thumbnail.
	const imageUrl = React.useMemo(() => {
		if (passage.image && storyIfid && isElectronRenderer()) {
			return `twine-image://${storyIfid}/${encodeURIComponent(passage.image)}`;
		}
		return undefined;
	}, [passage.image, storyIfid]);

	const handleMouseDown = React.useCallback(
		(event: MouseEvent) => {
			// Kill any pending hover preview on mousedown.
			clearTimeout(hoverTimerRef.current);
			setShowPreview(false);

			// Shift- or control-clicking toggles our selected status, but doesn't
			// affect any other passage's selected status. If the shift or control key
			// was not held down and we were not already selected, we know the user
			// wants to select only this passage.

			if (event.shiftKey || event.ctrlKey) {
				if (passage.selected) {
					onDeselect(passage);
				} else {
					onSelect(passage, false);
				}
			} else if (!passage.selected) {
				onSelect(passage, true);
			}
		},
		[onDeselect, onSelect, passage]
	);

	const wrappedDragStart = React.useCallback(
		(e: any, data: any) => {
			isDraggingRef.current = true;
			clearTimeout(hoverTimerRef.current);
			setShowPreview(false);
			onDragStart?.(e, data);
		},
		[onDragStart]
	);

	const wrappedDragStop = React.useCallback(
		(e: any, data: any) => {
			isDraggingRef.current = false;
			onDragStop?.(e, data);
		},
		[onDragStop]
	);

	const handleEdit = React.useCallback(
		() => onEdit(passage),
		[onEdit, passage]
	);
	const handleSelect = React.useCallback(
		(value: boolean, exclusive: boolean) => {
			onSelect(passage, exclusive);
		},
		[onSelect, passage]
	);

	return (
		<DraggableCore
			nodeRef={container}
			onMouseDown={handleMouseDown}
			onStart={wrappedDragStart}
			onDrag={onDrag}
			onStop={wrappedDragStop}
		>
			<div
				className={className}
				ref={container}
				style={style}
				data-passage-id={passage.id}
				data-passage-tags={passage.tags.join(' ')}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<SelectableCard
					highlighted={passage.highlighted}
					label={passage.name}
					onDoubleClick={handleEdit}
					onSelect={handleSelect}
					selected={passage.selected}
				>
					<TagStripe tagColors={tagColors} tags={passage.tags} />
					{imageUrl && (
						<img
							className="passage-card-image"
							src={imageUrl}
							alt=""
							draggable={false}
						/>
					)}
					<h2>{passage.name}</h2>
					<CardContent>{excerpt}</CardContent>
				</SelectableCard>
				{showPreview && previewText && (
					<div
						className="passage-hover-preview"
						style={{
							left: '50%',
							bottom: '100%'
						}}
					>
						{previewText}
					</div>
				)}
			</div>
		</DraggableCore>
	);
});

PassageCard.displayName = 'PassageCard';
