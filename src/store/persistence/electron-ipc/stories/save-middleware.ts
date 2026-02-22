import {TwineElectronWindow} from '../../../../electron/shared';
import {
	StoriesAction,
	StoriesState,
	storyWithId,
	storyWithName
} from '../../../stories';
import {StoryFormatsState} from '../../../story-formats';
import {
	isPersistablePassageChange,
	isPersistableStoryChange
} from '../../persistable-changes';
import {saveStory} from './save-story';

// When a story is deleted, we need to be able to look up information about it
// from the last state.

let lastState: StoriesState;

/**
 * A middleware function to save changes to disk. This should be called *after*
 * the main reducer runs.
 *
 * This has an extra argument: functions to archive and publish a story. This is
 * because the Electron app saves stories in published format.
 */
export function saveMiddleware(
	state: StoriesState,
	action: StoriesAction,
	formats: StoryFormatsState
) {
	const {twineElectron} = window as TwineElectronWindow;

	if (!twineElectron) {
		throw new Error('Electron bridge is not present on window.');
	}

	switch (action.type) {
		case 'init':
		case 'repair':
			// We take no action here on a repair action. This is to prevent messing up a
			// story's last modified date. If the user then edits the story, we'll save
			// their change and the repair then.
			break;

		case 'createStory':
			if (!action.props.name) {
				throw new Error('Passage was created but with no name specified');
			}

			saveStory(storyWithName(state, action.props.name), formats);
			break;

		case 'deleteStory': {
			// We have to look up the story in our saved last state to know what file
			// to delete.

			const deletedStory = storyWithId(lastState, action.storyId);

			twineElectron.deleteStory(deletedStory);

			// Clean up all images for this story.
			twineElectron.deleteStoryImages(deletedStory.ifid);
			break;
		}

		case 'updateStory':
			if (isPersistableStoryChange(action.props)) {
				if (action.props.name) {
					// The story has been renamed, and we need to process it
					// specially. We rename the story file, then save it to catch
					// any other changes.

					const oldStory = storyWithId(lastState, action.storyId);
					const newStory = storyWithId(state, action.storyId);

					// It's crucial that we only respond to this event once. Otherwise,
					// multiple renames in one session will cause mayhem.

					twineElectron.onceStoryRenamed(() => saveStory(newStory, formats));
					twineElectron.renameStory(oldStory, newStory);
				} else {
					// An ordinary update.

					saveStory(storyWithId(state, action.storyId), formats);
				}
			}
			break;

		case 'createPassage':
		case 'createPassages':
			saveStory(storyWithId(state, action.storyId), formats);
			break;

		case 'deletePassage': {
			const deletePassageStory = storyWithId(state, action.storyId);

			saveStory(deletePassageStory, formats);

			// Clean up the image for this passage if one exists.
			// Look up the passage in lastState since it's already removed from state.
			const lastStoryForDelete = storyWithId(lastState, action.storyId);
			const deletedPassage = lastStoryForDelete.passages.find(
				p => p.id === action.passageId
			);

			if (deletedPassage?.image) {
				twineElectron.deletePassageImage(
					lastStoryForDelete.ifid,
					deletedPassage.name
				);
			}
			break;
		}

		case 'deletePassages': {
			const deletePassagesStory = storyWithId(state, action.storyId);

			saveStory(deletePassagesStory, formats);

			// Clean up images for deleted passages.
			const lastStoryForDeletes = storyWithId(lastState, action.storyId);

			for (const passageId of action.passageIds) {
				const deletedP = lastStoryForDeletes.passages.find(
					p => p.id === passageId
				);

				if (deletedP?.image) {
					twineElectron.deletePassageImage(
						lastStoryForDeletes.ifid,
						deletedP.name
					);
				}
			}
			break;
		}

		case 'updatePassage':
			// Skip updates that wouldn't be saved.
			if (isPersistablePassageChange(action.props)) {
				saveStory(storyWithId(state, action.storyId), formats);

				// If the passage was renamed, update the image manifest key.
				if (action.props.name) {
					const lastStoryForRename = storyWithId(lastState, action.storyId);
					const renamedPassage = lastStoryForRename.passages.find(
						p => p.id === action.passageId
					);

					if (renamedPassage && renamedPassage.image && renamedPassage.name !== action.props.name) {
						twineElectron.renamePassageImage(
							lastStoryForRename.ifid,
							renamedPassage.name,
							action.props.name
						);
					}
				}
			}
			break;

		case 'updatePassages':
			// Skip updates that wouldn't be saved.
			if (
				Object.keys(action.passageUpdates).some(passageId =>
					isPersistablePassageChange(action.passageUpdates[passageId])
				)
			) {
				saveStory(storyWithId(state, action.storyId), formats);
			}
			break;

		default:
			console.warn(
				`Story action ${
					(action as any).type
				} has no Electron persistence handler`
			);
	}

	lastState = [...state];
}
