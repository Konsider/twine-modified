import Fuse from 'fuse.js';
import {Passage, SearchScope, StorySearchFlags, Story} from './stories.types';
import {createRegExp} from '../../util/regexp';
import {parseLinks} from '../../util/parse-links';

export function passageWithId(
	stories: Story[],
	storyId: string,
	passageId: string
) {
	const story = storyWithId(stories, storyId);
	const result = story.passages.find(p => p.id === passageId);

	if (result) {
		return result;
	}

	throw new Error(
		`There is no passage with ID "${passageId}" in a story with ID "${storyId}".`
	);
}

export function passageWithName(
	stories: Story[],
	storyId: string,
	passageName: string
) {
	const story = storyWithId(stories, storyId);
	const result = story.passages.find(p => p.name === passageName);

	if (result) {
		return result;
	}

	throw new Error(
		`There is no passage with name "${passageName}" in a story with ID "${storyId}".`
	);
}

/**
 * Returns connections between passages in a structure optimized for rendering.
 * Connections are divided between draggable and fixed, depending on whether
 * either of their passages are selected (and could be dragged by the user).
 */
export function passageConnections(
	passages: Passage[],
	connectionParser?: (text: string) => string[]
) {
	const parser = connectionParser ?? ((text: string) => parseLinks(text, true));
	const passageMap = new Map(passages.map(p => [p.name, p]));
	const result = {
		draggable: {
			broken: new Set<Passage>(),
			connections: new Map<Passage, Set<Passage>>(),
			self: new Set<Passage>()
		},
		fixed: {
			broken: new Set<Passage>(),
			connections: new Map<Passage, Set<Passage>>(),
			self: new Set<Passage>()
		}
	};

	passages.forEach(passage =>
		parser(passage.text).forEach(targetName => {
			if (targetName === passage.name) {
				(passage.selected ? result.draggable : result.fixed).self.add(passage);
			} else {
				const targetPassage = passageMap.get(targetName);

				if (targetPassage) {
					const target =
						passage.selected || targetPassage.selected
							? result.draggable
							: result.fixed;

					if (target.connections.has(passage)) {
						target.connections.get(passage)!.add(targetPassage);
					} else {
						target.connections.set(passage, new Set([targetPassage]));
					}
				} else {
					(passage.selected ? result.draggable : result.fixed).broken.add(
						passage
					);
				}
			}
		})
	);

	return result;
}

/**
 * Returns a set of passages matching a fuzzy search crtieria.
 */
export function passagesMatchingFuzzySearch(
	passages: Passage[],
	search: string,
	count = 5,
	scope: SearchScope = 'both'
) {
	if (search.trim() === '') {
		return [];
	}

	const keys =
		scope === 'names'
			? [{name: 'name', weight: 1}]
			: scope === 'text'
			? [{name: 'text', weight: 1}]
			: [
					{name: 'name', weight: 0.6},
					{name: 'text', weight: 0.4}
			  ];

	const fuse = new Fuse(passages, {
		ignoreLocation: true,
		threshold: 0.3,
		keys
	});

	return fuse.search(search, {limit: count}).map(({item}) => item);
}

/**
 * Returns all passages matching a search criteria. Use
 * `highlightPassageMatches()` to highlight exactly what matched.
 */
export function passagesMatchingSearch(
	passages: Passage[],
	search: string,
	flags: StorySearchFlags
): Passage[] {
	if (search === '') {
		return [];
	}

	// Derive scope from searchScope or legacy includePassageNames flag.
	const scope: SearchScope = flags.searchScope
		?? (flags.includePassageNames ? 'both' : 'text');

	let matcher: RegExp;

	try {
		matcher = createRegExp(search, {matchCase: flags.matchCase, useRegexes: flags.useRegexes});
	} catch (error) {
		// The regexp was malformed. Take no action.
		return [];
	}

	return passages.filter(passage => {
		matcher.lastIndex = 0;
		const matchText = scope !== 'names' && matcher.test(passage.text);
		matcher.lastIndex = 0;
		const matchName = scope !== 'text' && matcher.test(passage.name);

		return matchText || matchName;
	});
}

export function storyPassageTags(story: Story) {
	return Array.from(
		story.passages.reduce((result, passage) => {
			passage.tags && passage.tags.forEach(tag => result.add(tag));
			return result;
		}, new Set<string>())
	).sort();
}

export function storyStats(story: Story) {
	const linkSet = new Set<string>();
	for (const passage of story.passages) {
		for (const link of parseLinks(passage.text)) {
			linkSet.add(link);
		}
	}
	const links = Array.from(linkSet);

	const brokenLinks = links.filter(
		link => !story.passages.some(passage => passage.name === link)
	);

	return {
		brokenLinks,
		links,
		characters: story.passages.reduce(
			(count, passage) => count + passage.text.length,
			0
		),
		passages: story.passages.length,
		words: story.passages.reduce(
			(count, passage) => count + passage.text.split(/\s+/).length,
			0
		)
	};
}

export function storyTags(stories: Story[]) {
	return Array.from(
		stories.reduce((result, story) => {
			story.tags && story.tags.forEach(tag => result.add(tag));
			return result;
		}, new Set<string>())
	).sort();
}

export function storyWithId(stories: Story[], storyId: string) {
	const result = stories.find(s => s.id === storyId);

	if (result) {
		return result;
	}

	throw new Error(`There is no story with ID "${storyId}".`);
}

export function storyWithName(stories: Story[], name: string) {
	const result = stories.find(s => s.name === name);

	if (result) {
		return result;
	}

	throw new Error(`There is no story with name "${name}".`);
}
