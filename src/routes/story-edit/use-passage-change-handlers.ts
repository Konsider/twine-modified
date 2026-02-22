import * as React from 'react';
import {addPassageEditors, useDialogsContext} from '../../dialogs';
import {
	deselectPassage,
	movePassages,
	Passage,
	selectPassage,
	selectPassagesInRect,
	Story
} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {parseLinks} from '../../util/parse-links';
import {Point, Rect} from '../../util/geometry';

export function usePassageChangeHandlers(story: Story) {
	const selectedPassages = React.useMemo(
		() => story.passages.filter(passage => passage.selected),
		[story.passages]
	);
	const {dispatch: undoableStoriesDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();

	const handleDeselectPassage = React.useCallback(
		(passage: Passage) =>
			undoableStoriesDispatch(deselectPassage(story, passage)),
		[story, undoableStoriesDispatch]
	);

	const handleDragPassages = React.useCallback(
		(change: Point) => {
			if (Math.abs(change.left) < 1 && Math.abs(change.top) < 1) {
				return;
			}

			const selected = story.passages.filter(p => p.selected);

			if (selected.length === 1) {
				const dragged = selected[0];
				const dx = change.left / story.zoom;
				const dy = change.top / story.zoom;
				const centerX = dragged.left + dx + dragged.width / 2;
				const centerY = dragged.top + dy + dragged.height / 2;

				const target = story.passages.find(
					p =>
						!p.selected &&
						centerX >= p.left &&
						centerX <= p.left + p.width &&
						centerY >= p.top &&
						centerY <= p.top + p.height
				);

				if (target) {
					const existing = parseLinks(target.text, true);

					if (existing.includes(dragged.name)) {
						// Already linked — just snap back.
						return;
					}

					// Instant link — no confirmation.
					const newText =
						target.text.length > 0
							? target.text + '\n[[' + dragged.name + ']]'
							: '[[' + dragged.name + ']]';

					undoableStoriesDispatch(
						{
							type: 'updatePassage',
							passageId: target.id,
							storyId: story.id,
							props: {text: newText}
						},
						'Linked passage'
					);

					return;
				}
			}

			undoableStoriesDispatch(
				movePassages(
					story,
					story.passages.reduce<string[]>(
						(result, current) =>
							current.selected ? [...result, current.id] : result,
						[]
					),
					change.left / story.zoom,
					change.top / story.zoom
				),
				selectedPassages.length > 1
					? 'undoChange.movePassages'
					: 'undoChange.movePassages'
			);
		},
		[selectedPassages.length, story, undoableStoriesDispatch]
	);

	const handleEditPassage = React.useCallback(
		(passage: Passage) =>
			dialogsDispatch(addPassageEditors(story.id, [passage.id])),
		[dialogsDispatch, story.id]
	);

	const handleSelectPassage = React.useCallback(
		(passage: Passage, exclusive: boolean) =>
			undoableStoriesDispatch(selectPassage(story, passage, exclusive)),
		[story, undoableStoriesDispatch]
	);

	const handleSelectRect = React.useCallback(
		(rect: Rect, additive: boolean) => {
			const logicalRect: Rect = {
				height: rect.height / story.zoom,
				left: rect.left / story.zoom,
				top: rect.top / story.zoom,
				width: rect.width / story.zoom
			};

			undoableStoriesDispatch(
				selectPassagesInRect(
					story,
					logicalRect,
					additive ? selectedPassages.map(passage => passage.id) : []
				)
			);
		},
		[selectedPassages, story, undoableStoriesDispatch]
	);

	return {
		handleDeselectPassage,
		handleDragPassages,
		handleEditPassage,
		handleSelectPassage,
		handleSelectRect
	};
}
