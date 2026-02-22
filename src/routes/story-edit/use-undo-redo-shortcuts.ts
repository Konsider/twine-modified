import {useHotkeys} from 'react-hotkeys-hook';
import {selectAllPassages, Story, useStoriesContext} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';

/**
 * Registers Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
 * for redo, and Ctrl+A / Cmd+A for select-all on the story map.
 */
export function useUndoRedoShortcuts(story: Story) {
	const {undo, redo} = useUndoableStoriesContext();
	const {dispatch} = useStoriesContext();

	useHotkeys(
		'ctrl+z,command+z',
		(event: KeyboardEvent) => {
			event.preventDefault();
			undo?.();
		},
		[undo]
	);

	useHotkeys(
		'ctrl+shift+z,command+shift+z,ctrl+y',
		(event: KeyboardEvent) => {
			event.preventDefault();
			redo?.();
		},
		[redo]
	);

	useHotkeys(
		'ctrl+a,command+a',
		(event: KeyboardEvent) => {
			event.preventDefault();
			dispatch(selectAllPassages(story));
		},
		[dispatch, story]
	);
}
