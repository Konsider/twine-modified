import {mkdirp, readJson, remove, writeFile, writeJson, pathExists} from 'fs-extra';
import {join} from 'path';
import {randomBytes} from 'crypto';
import {getStoryDirectoryPath} from './story-directory';

/**
 * Manifest mapping passage names to image filenames.
 * Stored as _manifest.json in each story's image folder.
 */
export type ImageManifest = Record<string, string>;

/**
 * Returns the path to a story's image directory.
 */
function getImagesPath(storyIfid: string): string {
	return join(getStoryDirectoryPath(), 'images', storyIfid);
}

/**
 * Returns the path to a story's image manifest file.
 */
function getManifestPath(storyIfid: string): string {
	return join(getImagesPath(storyIfid), '_manifest.json');
}

/**
 * Loads the image manifest for a story. Returns an empty object if none exists.
 */
export async function loadImageManifest(storyIfid: string): Promise<ImageManifest> {
	const manifestPath = getManifestPath(storyIfid);

	try {
		if (await pathExists(manifestPath)) {
			return await readJson(manifestPath);
		}
	} catch (error) {
		console.warn(`Could not load image manifest for story ${storyIfid}:`, error);
	}

	return {};
}

/**
 * Saves the image manifest for a story.
 */
async function saveManifest(storyIfid: string, manifest: ImageManifest): Promise<void> {
	const imagesPath = getImagesPath(storyIfid);

	await mkdirp(imagesPath);
	await writeJson(getManifestPath(storyIfid), manifest, {spaces: 2});
}

/**
 * Saves a passage image to disk and updates the manifest.
 * Returns the generated filename.
 */
export async function savePassageImage(
	storyIfid: string,
	passageName: string,
	imageBuffer: Buffer,
	extension: string
): Promise<string> {
	const imagesPath = getImagesPath(storyIfid);

	await mkdirp(imagesPath);

	// Load existing manifest and remove old image if one exists for this passage.
	const manifest = await loadImageManifest(storyIfid);
	const oldFilename = manifest[passageName];

	if (oldFilename) {
		const oldPath = join(imagesPath, oldFilename);

		try {
			await remove(oldPath);
		} catch (error) {
			console.warn(`Could not remove old passage image ${oldPath}:`, error);
		}
	}

	// Generate a unique filename to avoid collisions.
	const ext = extension.startsWith('.') ? extension : `.${extension}`;
	const filename = `${randomBytes(8).toString('hex')}${ext}`;
	const filePath = join(imagesPath, filename);

	await writeFile(filePath, imageBuffer);

	// Update manifest.
	manifest[passageName] = filename;
	await saveManifest(storyIfid, manifest);

	console.log(`Saved passage image for "${passageName}" as ${filename}`);
	return filename;
}

/**
 * Deletes a passage image from disk and updates the manifest.
 */
export async function deletePassageImage(
	storyIfid: string,
	passageName: string
): Promise<void> {
	const manifest = await loadImageManifest(storyIfid);
	const filename = manifest[passageName];

	if (!filename) {
		return;
	}

	const filePath = join(getImagesPath(storyIfid), filename);

	try {
		await remove(filePath);
	} catch (error) {
		console.warn(`Could not delete passage image ${filePath}:`, error);
	}

	delete manifest[passageName];
	await saveManifest(storyIfid, manifest);
	console.log(`Deleted passage image for "${passageName}"`);
}

/**
 * Deletes all images for a story.
 */
export async function deleteStoryImages(storyIfid: string): Promise<void> {
	const imagesPath = getImagesPath(storyIfid);

	try {
		if (await pathExists(imagesPath)) {
			await remove(imagesPath);
			console.log(`Deleted all images for story ${storyIfid}`);
		}
	} catch (error) {
		console.warn(`Could not delete story images for ${storyIfid}:`, error);
	}
}

/**
 * Renames a passage's image entry in the manifest (e.g. when a passage is
 * renamed). The file on disk stays the same.
 */
export async function renamePassageImage(
	storyIfid: string,
	oldPassageName: string,
	newPassageName: string
): Promise<void> {
	const manifest = await loadImageManifest(storyIfid);
	const filename = manifest[oldPassageName];

	if (!filename) {
		return;
	}

	delete manifest[oldPassageName];
	manifest[newPassageName] = filename;
	await saveManifest(storyIfid, manifest);
	console.log(`Renamed passage image key "${oldPassageName}" -> "${newPassageName}"`);
}

/**
 * Resolves a twine-image:// URL to an absolute file path on disk.
 * URL format: twine-image://{storyIfid}/{filename}
 */
export function resolveImagePath(storyIfid: string, filename: string): string {
	return join(getStoryDirectoryPath(), 'images', storyIfid, filename);
}
