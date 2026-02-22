import {Story} from '../../store/stories/stories.types';

export interface TwineElectronWindow extends Window {
	twineElectron?: {
		chooseDirectory(defaultPath?: string): Promise<string | undefined>;
		deleteStory(story: Story): void;
		loadPrefs(): Promise<any>;
		loadStories(): Promise<any>;
		loadStoryFormats(): Promise<any>;
		onceStoryRenamed(callback: () => void): void;
		openWithScratchFile(data: string, filename: string): void;
		renameStory(oldStory: Story, newStory: Story): void;
		saveStoryHtml(story: Story, data: string): void;
		saveJson(filename: string, data: any): void;
		showSaveFileDialog(
			data: string,
			defaultFilename: string,
			defaultPath: string
		): Promise<boolean>;
		loadImageManifest(storyIfid: string): Promise<Record<string, string>>;
		savePassageImage(
			storyIfid: string,
			passageName: string,
			imageData: Uint8Array,
			extension: string
		): Promise<string | null>;
		deletePassageImage(
			storyIfid: string,
			passageName: string
		): Promise<boolean>;
		deleteStoryImages(storyIfid: string): Promise<boolean>;
		renamePassageImage(
			storyIfid: string,
			oldPassageName: string,
			newPassageName: string
		): Promise<boolean>;
	};
}
