import {TwineElectronWindow} from '../../../../electron/shared';
import {Story} from '../../../stories/stories.types';
import {importStories} from '../../../../util/import';

export async function load(): Promise<Story[]> {
	const {twineElectron} = window as TwineElectronWindow;

	if (!twineElectron) {
		throw new Error('Electron bridge is not present on window.');
	}

	const stories = await twineElectron.loadStories();

	if (stories && Array.isArray(stories)) {
		const result = stories.reduce((result, file) => {
			const story = importStories(file.htmlSource, file.mtime);

			if (story[0]) {
				return [...result, story[0]];
			}

			console.warn('Could not hydrate story: ', file.htmlSource);
			return result;
		}, [] as Story[]);

		// Load image manifests and populate passage.image fields.

		await Promise.all(
			result.map(async (story: Story) => {
				try {
					const manifest = await twineElectron.loadImageManifest(story.ifid);

					if (manifest && Object.keys(manifest).length > 0) {
						for (const passage of story.passages) {
							if (manifest[passage.name]) {
								passage.image = manifest[passage.name];
							}
						}
					}
				} catch (error) {
					console.warn(
						`Could not load image manifest for story "${story.name}":`,
						error
					);
				}
			})
		);

		return result;
	} else {
		console.warn('No stories to hydrate in Electron bridge');
	}

	return [];
}
