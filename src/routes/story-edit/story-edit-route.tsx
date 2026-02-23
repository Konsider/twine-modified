import * as React from 'react';
import {useParams} from 'react-router-dom';
import {MainContent} from '../../components/container/main-content';
import {DocumentTitle} from '../../components/document-title/document-title';
import {DialogsContextProvider} from '../../dialogs';
import {
	createUntitledPassage,
	storyWithId,
	updateStory,
	useStoriesContext
} from '../../store/stories';
import {v4 as uuid} from '@lukeed/uuid';
import {
	UndoableStoriesContextProvider,
	useUndoableStoriesContext
} from '../../store/undoable-stories';
import {parseLinks, resolveLink} from '../../util/parse-links';
import {MarqueeablePassageMap} from './marqueeable-passage-map';
import {PassageDisplayMode} from '../../components/passage/passage-map';
import {PassageFuzzyFinder} from './passage-fuzzy-finder';
import {StoryMinimap} from './story-minimap';
import {StoryEditToolbar} from './toolbar';
import {useInitialPassageCreation} from './use-initial-passage-creation';
import {usePassageChangeHandlers} from './use-passage-change-handlers';
import {useUndoRedoShortcuts} from './use-undo-redo-shortcuts';
import {useViewCenter} from './use-view-center';
import {useViewPersistence} from './use-view-persistence';
import {useZoomShortcuts} from './use-zoom-shortcuts';
import {useZoomTransition} from './use-zoom-transition';
import {useZoomWheel, setInstantZoomFlag} from './use-zoom-wheel';
import './story-edit-route.css';

interface ContextMenuState {
	x: number;
	y: number;
	passageId: string;
	passageName: string;
	links: string[];
	isStart: boolean;
}

export const InnerStoryEditRoute: React.FC = () => {
	const {storyId} = useParams<{storyId: string}>();
	const {stories, dispatch: undoableStoriesDispatch} =
		useUndoableStoriesContext();
	const story = storyWithId(stories, storyId);
	const [fuzzyFinderOpen, setFuzzyFinderOpen] = React.useState(false);
	const [contextMenu, setContextMenu] =
		React.useState<ContextMenuState | null>(null);
	const [displayMode, setDisplayMode] = React.useState<PassageDisplayMode>('auto');
	const {dispatch: storiesDispatch, stories: allStories} = useStoriesContext();
	const mainContent = React.useRef<HTMLDivElement>(null);
	const {getCenter, setCenter} = useViewCenter(story, mainContent);
	const {
		handleDeselectPassage,
		handleDragPassages,
		handleEditPassage,
		handleSelectPassage,
		handleSelectRect
	} = usePassageChangeHandlers(story);
	const visibleZoom = useZoomTransition(story.zoom, mainContent.current);

	useZoomShortcuts(story);
	useZoomWheel(story, mainContent);
	useUndoRedoShortcuts(story);
	const handleSaveScroll = React.useCallback(
		(scrollLeft: number, scrollTop: number) => {
			storiesDispatch(
				updateStory(allStories, story, {
					mapScrollLeft: scrollLeft,
					mapScrollTop: scrollTop
				})
			);
		},
		[allStories, storiesDispatch, story]
	);

	useViewPersistence(
		storyId,
		story.zoom,
		story.mapScrollLeft,
		story.mapScrollTop,
		handleSaveScroll,
		mainContent
	);
	useInitialPassageCreation(story, getCenter);

	// Centralized orphan detection — computed once, shared with minimap,
	// toolbar stats, and passage map to avoid redundant O(n²) work.
	const orphanIds = React.useMemo(() => {
		const nameToId = new Map<string, string>();
		for (const p of story.passages) nameToId.set(p.name, p.id);

		const linkedTo = new Set<string>();
		for (const p of story.passages) {
			for (const targetName of parseLinks(p.text, true)) {
				const targetId = nameToId.get(targetName);
				if (targetId) linkedTo.add(targetId);
			}
		}

		const result = new Set<string>();
		for (const p of story.passages) {
			if (p.id !== story.startPassage && !linkedTo.has(p.id)) {
				result.add(p.id);
			}
		}
		return result;
	}, [story.passages, story.startPassage]);

	const handleMinimapZoom = React.useCallback(
		(newZoom: number) => {
			setInstantZoomFlag();
			storiesDispatch(updateStory(allStories, story, {zoom: newZoom}));
		},
		[allStories, storiesDispatch, story]
	);

	// Double-click on empty canvas to create a new passage.

	React.useEffect(() => {
		const el = mainContent.current;
		if (!el) return;

		function handleDblClick(event: MouseEvent) {
			const target = event.target as HTMLElement;
			if (
				target.closest(
					'.passage-card, .fuzzy-finder, .zoom-buttons, .route-toolbar'
				)
			) {
				return;
			}

			const rect = el!.getBoundingClientRect();
			const x = (event.clientX - rect.left + el!.scrollLeft) / story.zoom;
			const y = (event.clientY - rect.top + el!.scrollTop) / story.zoom;

			undoableStoriesDispatch(
				createUntitledPassage(story, x, y),
				'undoChange.newPassage'
			);
		}

		el.addEventListener('dblclick', handleDblClick);
		return () => el.removeEventListener('dblclick', handleDblClick);
	}, [mainContent, story, undoableStoriesDispatch]);

	// Right-click on passage card to show context menu.

	React.useEffect(() => {
		const el = mainContent.current;
		if (!el) return;

		function handleContextMenu(event: MouseEvent) {
			const card = (event.target as HTMLElement).closest('.passage-card');
			if (!card) return;

			const passageId = card.getAttribute('data-passage-id');
			if (!passageId) return;

			const passage = story.passages.find(p => p.id === passageId);
			if (!passage) return;

			const links = parseLinks(passage.text, true).filter(link =>
				story.passages.some(p => p.name === link)
			);

			event.preventDefault();
			setContextMenu({
				x: event.clientX,
				y: event.clientY,
				passageId: passage.id,
				passageName: passage.name,
				links,
				isStart: passage.id === story.startPassage
			});
		}

		el.addEventListener('contextmenu', handleContextMenu);
		return () => el.removeEventListener('contextmenu', handleContextMenu);
	}, [mainContent, story]);

	// Instant unlink — click item, done.

	const handleUnlink = React.useCallback(
		(targetName: string) => {
			if (!contextMenu) return;

			const passage = story.passages.find(
				p => p.id === contextMenu.passageId
			);
			if (!passage) {
				setContextMenu(null);
				return;
			}

			const newText = passage.text.replace(
				/\[\[.*?\]\]/g,
				(match: string) => {
					const inner = match.slice(2, -2);
					return resolveLink(inner) === targetName ? '' : match;
				}
			);

			setContextMenu(null);

			undoableStoriesDispatch(
				{
					type: 'updatePassage',
					passageId: passage.id,
					storyId: story.id,
					props: {text: newText}
				},
				'Unlinked passage'
			);
		},
		[contextMenu, story, undoableStoriesDispatch]
	);

	// Duplicate passage — copies text, tags, size; offsets position.

	const handleDuplicate = React.useCallback(() => {
		if (!contextMenu) return;

		const passage = story.passages.find(
			p => p.id === contextMenu.passageId
		);
		if (!passage) {
			setContextMenu(null);
			return;
		}

		const copyName = passage.name + ' Copy';
		// Avoid name collisions.
		let finalName = copyName;
		let suffix = 2;
		while (story.passages.some(p => p.name === finalName)) {
			finalName = copyName + ' ' + suffix;
			suffix++;
		}

		const newId = uuid();

		undoableStoriesDispatch(
			{
				type: 'createPassage',
				storyId: story.id,
				props: {
					id: newId,
					name: finalName,
					text: passage.text,
					tags: [...passage.tags],
					left: passage.left + 60,
					top: passage.top + 60,
					width: passage.width,
					height: passage.height,
					end: passage.end,
					hub: passage.hub
				}
			},
			'Duplicated passage'
		);

		setContextMenu(null);
	}, [contextMenu, story, undoableStoriesDispatch]);

	// Delete passage.

	const handleDeletePassage = React.useCallback(() => {
		if (!contextMenu) return;

		undoableStoriesDispatch(
			{
				type: 'deletePassage',
				storyId: story.id,
				passageId: contextMenu.passageId
			},
			'Deleted passage'
		);

		setContextMenu(null);
	}, [contextMenu, story, undoableStoriesDispatch]);

	return (
		<div className="story-edit-route">
			<DocumentTitle title={story.name} />
			<StoryEditToolbar
				getCenter={getCenter}
				mainContent={mainContent}
				onOpenFuzzyFinder={() => setFuzzyFinderOpen(true)}
				orphanIds={orphanIds}
				story={story}
				displayMode={displayMode}
				onChangeDisplayMode={setDisplayMode}
			/>
			<MainContent grabbable padded={false} ref={mainContent}>
				<MarqueeablePassageMap
					container={mainContent}
					displayMode={displayMode}
					formatName={story.storyFormat}
					formatVersion={story.storyFormatVersion}
					onDeselect={handleDeselectPassage}
					onDrag={handleDragPassages}
					onEdit={handleEditPassage}
					onSelect={handleSelectPassage}
					onSelectRect={handleSelectRect}
					orphanIds={orphanIds}
					passages={story.passages}
					startPassageId={story.startPassage}
					storyIfid={story.ifid}
					tagColors={story.tagColors}
					visibleZoom={visibleZoom}
					zoom={story.zoom}
				/>
				<PassageFuzzyFinder
					onClose={() => setFuzzyFinderOpen(false)}
					onOpen={() => setFuzzyFinderOpen(true)}
					open={fuzzyFinderOpen}
					setCenter={setCenter}
					story={story}
				/>
			</MainContent>
			<StoryMinimap
				orphanIds={orphanIds}
				passages={story.passages}
				startPassageId={story.startPassage}
				zoom={visibleZoom}
				container={mainContent}
				onZoom={handleMinimapZoom}
			/>

			{contextMenu && (
				<>
					<div
						className="passage-unlink-backdrop"
						onClick={() => setContextMenu(null)}
						onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
					/>
					<PassageMapContextMenu
						x={contextMenu.x}
						y={contextMenu.y}
						passageName={contextMenu.passageName}
						links={contextMenu.links}
						isStart={contextMenu.isStart}
						onUnlink={handleUnlink}
						onDuplicate={handleDuplicate}
						onDelete={handleDeletePassage}
					/>
				</>
			)}
		</div>
	);
};

/**
 * Right-click context menu for passage cards on the map.
 * Shows Duplicate, optional Unlink section, and Delete (separated).
 */
const PassageMapContextMenu: React.FC<{
	x: number;
	y: number;
	passageName: string;
	links: string[];
	isStart: boolean;
	onUnlink: (target: string) => void;
	onDuplicate: () => void;
	onDelete: () => void;
}> = ({x, y, passageName, links, isStart, onUnlink, onDuplicate, onDelete}) => {
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [pos, setPos] = React.useState({left: x, top: y});

	React.useLayoutEffect(() => {
		const menu = menuRef.current;
		if (!menu) return;

		const rect = menu.getBoundingClientRect();
		const pad = 8;
		let left = x;
		let top = y;

		if (left + rect.width + pad > window.innerWidth) {
			left = Math.max(pad, x - rect.width);
		}
		if (top + rect.height + pad > window.innerHeight) {
			top = Math.max(pad, y - rect.height);
		}

		left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
		top = Math.max(pad, Math.min(top, window.innerHeight - rect.height - pad));

		setPos({left, top});
	}, [x, y]);

	return (
		<div
			className="passage-context-menu-map"
			ref={menuRef}
			style={{left: pos.left, top: pos.top}}
		>
			<div className="passage-context-menu-header">
				{passageName}
			</div>
			<button
				className="passage-context-menu-item"
				onClick={onDuplicate}
			>
				Duplicate
			</button>
			{links.length > 0 && (
				<>
					<div className="passage-context-menu-separator" />
					<div className="passage-context-menu-subheader">
						Unlink from&hellip;
					</div>
					{links.map(link => (
						<button
							className="passage-context-menu-item"
							key={link}
							onClick={() => onUnlink(link)}
						>
							&times; {link}
						</button>
					))}
				</>
			)}
			<div className="passage-context-menu-separator" />
			<button
				className="passage-context-menu-item passage-context-menu-delete"
				onClick={onDelete}
				disabled={isStart}
				title={isStart ? 'Cannot delete the start passage' : undefined}
			>
				Delete
			</button>
		</div>
	);
};

export const StoryEditRoute: React.FC = () => (
	<UndoableStoriesContextProvider>
		<DialogsContextProvider>
			<InnerStoryEditRoute />
		</DialogsContextProvider>
	</UndoableStoriesContextProvider>
);
