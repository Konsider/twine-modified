import {Passage, Story} from '../stories';
import {StoryFormat} from '../story-formats';

const trivialPassageProps: (keyof Passage)[] = ['highlighted', 'image', 'selected'];
const trivialStoryProps: (keyof Story)[] = ['lastUpdate', 'selected'];

/**
 * Story props that are persisted but should NOT update lastUpdate because
 * they are view/UI preferences rather than content changes.
 */
const viewOnlyStoryProps: (keyof Story)[] = ['zoom', 'snapToGrid', 'mapScrollLeft', 'mapScrollTop'];

// Loosely typing this because of the different load states possible in the type.
const trivialStoryFormatProps: string[] = [
	'loadError',
	'loadState',
	'properties',
	'selected'
];

/**
 * Is a passage change persistable? e.g. is it nontrivial?
 */
export function isPersistablePassageChange(props: Partial<Passage>) {
	return Object.keys(props).some(
		key => !trivialPassageProps.includes(key as keyof Passage)
	);
}

/**
 * Is a story change persistable? e.g. is it nontrivial?
 */
export function isPersistableStoryChange(props: Partial<Story>) {
	return Object.keys(props).some(
		key => !trivialStoryProps.includes(key as keyof Story)
	);
}

/**
 * Should a story change update lastUpdate? View-only changes like zoom
 * are persistable but should not bump the "last edited" timestamp.
 */
export function isLastUpdateWorthyStoryChange(props: Partial<Story>) {
	return Object.keys(props).some(
		key =>
			!trivialStoryProps.includes(key as keyof Story) &&
			!viewOnlyStoryProps.includes(key as keyof Story)
	);
}

/**
 * Is a story format persistable? e.g. is it nontrivial?
 */
export function isPersistableStoryFormatChange(props: Partial<StoryFormat>) {
	return Object.keys(props).some(
		key => !trivialStoryFormatProps.includes(key as keyof StoryFormat)
	);
}