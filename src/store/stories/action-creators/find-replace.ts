import {Thunk} from 'react-hook-thunk-reducer';
import {createRegExp, escapeRegExpReplace} from '../../../util/regexp';
import {updatePassage} from './update-passage';
import {
	Passage,
	StoriesAction,
	StoriesState,
	Story,
	StorySearchFlags
} from '../stories.types';

/**
 * Core logic for replacing text using flags.
 */
function replaceText(source: string, searchFor: string, replaceWith: string, flags: StorySearchFlags) {
	const {matchCase, useRegexes} = flags;
	const matcher = createRegExp(searchFor, {matchCase, useRegexes});
	const replacer = useRegexes
	? replaceWith
	: escapeRegExpReplace(replaceWith);

	return source.replace(matcher, replacer);
}

export type PassageReplaceError =
	| {error: 'invalidRegex'}
	| {error: 'emptyName' | 'nameConflict'; passage: Passage};

/**
 * Checks whether a find & replace can be done in a story, e.g. will not result
 * in duplicate passage names or empty passage names. This stops at the first
 * problem found.
 */
export function passageReplaceError(
	passages: Passage[],
	find: string,
	replace: string,
	flags: StorySearchFlags
): PassageReplaceError | undefined {
	// If we're replacing a regex, test that it's valid.

	if (flags.useRegexes) {
		try {
			new RegExp(find);
		} catch {
			return {error: 'invalidRegex'};
		}
	}

	const scope = flags.searchScope
		?? (flags.includePassageNames ? 'both' : 'text');

	// If we're not changing passage names, it's always safe if we've reached this
	// point. Skip passage name checks because they're relatively expensive.

	if (scope === 'text') {
		return;
	}

	const newNames = new Set<string>();

	for (const passage of passages) {
		const newName = replaceText(passage.name, find, replace, flags);

		if (newName.trim() === '') {
			return {passage, error: 'emptyName'};
		}

		if (newNames.has(newName)) {
			return {passage, error: 'nameConflict'};
		}

		newNames.add(newName);
	}
}

export function replaceInPassage(
	story: Story,
	passage: Passage,
	searchFor: string,
	replaceWith: string,
	flags: StorySearchFlags
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		if (searchFor === '') {
			throw new Error("Can't replace an empty string");
		}

		if (passage.story !== story.id) {
			throw new Error('Passage does not belong to story');
		}

		const scope = flags.searchScope
			?? (flags.includePassageNames ? 'both' : 'text');
		const props: Partial<Passage> = {};

		if (scope !== 'names') {
			const newText = replaceText(passage.text, searchFor, replaceWith, flags);

			if (newText !== passage.text) {
				props.text = newText;
			}
		}

		if (scope !== 'text') {
			const newName = replaceText(passage.name, searchFor, replaceWith, flags);

			if (newName !== passage.name) {
				props.name = newName;
			}
		}

		if (Object.keys(props).length > 0) {
			updatePassage(story, passage, props)(dispatch, getState);
		}
	};
}

export function replaceInStory(
	story: Story,
	searchFor: string,
	replaceWith: string,
	flags: StorySearchFlags
): Thunk<StoriesState, StoriesAction> {
	return (dispatch, getState) => {
		if (searchFor === '') {
			throw new Error("Can't replace an empty string");
		}

		const scope = flags.searchScope
			?? (flags.includePassageNames ? 'both' : 'text');

		if (scope !== 'text') {
			// Do replaces in passage names first, so that if a replace will change
			// both a link and a passage name, the updatePassage action will see that
			// the passage exists when the link is changed, and not create a new
			// passage that will conflict with the existing one.
			
			for (const passage of story.passages) {
				const name = replaceText(passage.name, searchFor, replaceWith, flags);

				if (name !== passage.name) {
					updatePassage(story, passage, {name})(dispatch, getState);
				}
			}
		}

		if (scope !== 'names') {
			for (const passage of story.passages) {
				const text = replaceText(passage.text, searchFor, replaceWith, flags);

				if (text !== passage.text) {
					updatePassage(story, passage, {text})(dispatch, getState);
				}
			}
		}
	};
}
